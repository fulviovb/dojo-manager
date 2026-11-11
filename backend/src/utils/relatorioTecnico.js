// Textos da prestação de contas final do Incentivo (prefeitura):
// "RELATÓRIO TÉCNICO" (campo com limite de caracteres) e os "RESULTADO
// ALCANÇADO" de objetivos / competições previstas. Montados a partir das
// conquistas do ano da bolsa, dos horários de treino do projeto do atleta e
// das categorias dos gastos lançados.
const { Op } = require('sequelize');
const { localDaSala, arteDoEsporte } = require('./textoProjeto');

// O campo da prefeitura cortou o texto em 496 caracteres (testado 11/2026).
const LIMITE_RELATORIO = 496;
const NIVEL_PESO = { mundial: 5, panamericano: 4, nacional: 3, estadual: 2, municipal: 1 };
const DIA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const RECURSO_CURTO = {
  inscricoes_competicoes: 'inscrições',
  transporte_hospedagem_fora_curitiba: 'viagens',
  transporte_alimentacao_dentro_curitiba: 'transporte e alimentação em Curitiba',
  servicos_multidisciplinares: 'serviços multidisciplinares',
  equipamentos_material_esportivo: 'material esportivo',
  academia_condicionamento: 'academia',
  suplementacao_alimentar: 'suplementação',
  inscricoes_cursos_treinamentos: 'cursos e treinamentos',
  equipamentos_reabilitacao: 'reabilitação física',
  capacitacao_educacao_fisica: 'capacitação',
  bolsa_auxilio_estagiario: 'estagiário',
};

const juntarE = (itens) => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`);
const minutos = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const horaCurta = (t) => { const [h, m] = String(t).split(':'); return m === '00' ? String(Number(h)) : `${Number(h)}h${m}`; };
const faixaHorario = (ini, fim) => `${horaCurta(ini)}-${horaCurta(fim)}h`;
const nomeLocalCurto = (n) => String(n || '').replace(/^Associa[cç][aã]o\s+/i, 'Assoc. ').trim();

// "Campeonato Brasileiro de Karatê" → "Brasileiro"; "Copa Open Internacional
// de Karatê" → "Copa Open Internacional". Tira o nome do esporte do final.
function nomeCurto(nome, esporte) {
  let n = String(nome).replace(/^Campeonato\s+/i, '');
  const palavra = String(esporte || '').split(/\s+/)[0];
  if (palavra) n = n.replace(new RegExp(`\\s+(de|do|da)\\s+${palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'i'), '');
  return n.trim();
}
const cidadeUf = (c) => [c.cidade, c.estado].filter(Boolean).join('/') + (c.pais && c.pais !== 'Brasil' ? ` - ${c.pais}` : '');
const prova = (x, comCategoria) => {
  const mod = comCategoria ? x.modalidade : String(x.modalidade).replace(/\s*Individual\b/i, '').toLowerCase();
  const cat = comCategoria && x.categoria ? ` (${x.categoria})` : '';
  return x.colocacao ? `${x.colocacao}º ${mod}${cat}` : `participação em ${mod}${cat}`;
};

// Horários de treino: os do projeto do atleta no Incentivo (mais recente);
// sem projeto, os das turmas em que está matriculado.
async function horariosDe(bolsa, participante) {
  const m = require('../models');
  if (participante) {
    const locais = await m.LocalTreinoIncentivo.findAll({
      where: { participante_id: participante.id, escola_id: bolsa.escola_id },
      include: [{ model: m.LocalTreino, as: 'Local' }],
    });
    if (locais.length) {
      return {
        origem: `projeto ${participante.numero_protocolo || 'do Incentivo'}`,
        itens: locais.map(l => ({ dia: l.dia_semana, inicio: l.hora_inicio, fim: l.hora_fim, local: l.Local?.nome || String(l.endereco || '').split(/[,-]/)[0] })),
      };
    }
  }
  if (!bolsa.aluno_id) return { origem: null, itens: [] };
  const arte = participante ? await arteDoEsporte(participante) : null;
  const mats = await m.MatriculaAluno.findAll({
    where: { aluno_id: bolsa.aluno_id, ativa: true },
    include: [{
      model: m.Turma, where: { escola_id: bolsa.escola_id, ativa: true, ...(arte ? { arte_marcial_id: arte.id } : {}) },
      include: [{ model: m.HorarioTurma, include: [{ model: m.Sala }] }],
    }],
  });
  const itens = [];
  for (const mt of mats) for (const h of mt.Turma.HorarioTurmas || []) {
    itens.push({ dia: h.dia_semana, inicio: h.hora_inicio, fim: h.hora_fim, local: localDaSala(h.Sala?.nome).nome });
  }
  return { origem: itens.length ? 'turmas matriculadas' : null, itens };
}

// "seg/qua 19-21h Assoc. Copel Curitiba; sex 20-22h CIC" + horas semanais.
function textoHorarios(itens) {
  // Junta horários seguidos no mesmo dia e local (19-20h + 20-21h → 19-21h).
  const ordenados = [...itens].sort((a, b) => a.dia - b.dia || nomeLocalCurto(a.local).localeCompare(nomeLocalCurto(b.local)) || minutos(a.inicio) - minutos(b.inicio));
  const unidos = [];
  for (const h of ordenados) {
    const ult = unidos[unidos.length - 1];
    if (ult && ult.dia === h.dia && nomeLocalCurto(ult.local) === nomeLocalCurto(h.local) && minutos(h.inicio) <= minutos(ult.fim)) {
      if (minutos(h.fim) > minutos(ult.fim)) ult.fim = h.fim;
    } else unidos.push({ ...h });
  }
  itens = unidos;
  const grupos = new Map();
  for (const h of [...itens].sort((a, b) => a.dia - b.dia || minutos(a.inicio) - minutos(b.inicio))) {
    const k = `${nomeLocalCurto(h.local)}|${h.inicio}|${h.fim}`;
    if (!grupos.has(k)) grupos.set(k, { ...h, dias: [] });
    if (!grupos.get(k).dias.includes(h.dia)) grupos.get(k).dias.push(h.dia);
  }
  const partes = [...grupos.values()].map(g => `${g.dias.map(d => DIA_CURTO[d]).join('/')} ${faixaHorario(g.inicio, g.fim)}${g.local ? ` ${nomeLocalCurto(g.local)}` : ''}`);
  const total = itens.reduce((s, h) => s + Math.max(0, minutos(h.fim) - minutos(h.inicio)), 0) / 60;
  return { texto: partes.join('; '), horas: Math.round(total * 10) / 10 };
}

// Competições do ano com os resultados do atleta, da mais importante pra
// menos (nível, depois melhor colocação).
function agruparCompeticoes(conquistas) {
  const porComp = new Map();
  for (const c of conquistas) {
    const k = c.Competicao.id;
    if (!porComp.has(k)) porComp.set(k, { competicao: c.Competicao, resultados: [] });
    porComp.get(k).resultados.push(c);
  }
  const lista = [...porComp.values()];
  for (const g of lista) g.resultados.sort((a, b) => (a.colocacao || 99) - (b.colocacao || 99) || String(a.modalidade).localeCompare(String(b.modalidade)));
  const melhor = (g) => Math.min(...g.resultados.map(r => r.colocacao || 99));
  return lista.sort((a, b) => (NIVEL_PESO[b.competicao.nivel] || 0) - (NIVEL_PESO[a.competicao.nivel] || 0) || melhor(a) - melhor(b)
    || String(a.competicao.data_inicio || '').localeCompare(String(b.competicao.data_inicio || '')));
}

// Texto curto do relatório técnico, cabendo em LIMITE_RELATORIO: entram
// competições (e resultados dentro delas) por importância enquanto couber;
// se não couber, tenta sem a cidade entre parênteses.
function montarRelatorio({ esporte, horarios, recursos, ano, grupos }) {
  const inicio = [];
  if (horarios.texto) inicio.push(`Treinos de ${esporte} ${String(horarios.horas).replace('.', ',')}h/semana (${horarios.texto}).`);
  else inicio.push(`Treinos regulares de ${esporte}.`);
  if (recursos.length) inicio.push(`Recursos em ${juntarE(recursos)}.`);
  const base = inicio.join(' ');

  const tentar = (comCidade) => {
    const blocos = [];
    let omitidos = 0;
    for (const g of grupos) {
      const rotulo = `${nomeCurto(g.competicao.nome, esporte)}${comCidade && g.competicao.cidade ? ` (${g.competicao.cidade})` : ''}`;
      const escolhidos = [];
      for (const r of g.resultados) {
        const txt = `${rotulo} ${juntarE([...escolhidos, prova(r, false)])}`;
        if (`${base} ${ano}: ${[...blocos, txt].join('; ')}.`.length > LIMITE_RELATORIO) break;
        escolhidos.push(prova(r, false));
      }
      omitidos += g.resultados.length - escolhidos.length;
      if (escolhidos.length) blocos.push(`${rotulo} ${juntarE(escolhidos)}`);
    }
    return { texto: blocos.length ? `${base} ${ano}: ${blocos.join('; ')}.` : base, omitidos };
  };
  const comCidade = tentar(true);
  return comCidade.omitidos ? tentar(false) : comCidade;
}

async function montarRelatorioTecnico(bolsa) {
  const m = require('../models');
  const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  // Projeto do atleta no Incentivo (o mais recente): esporte e horários.
  const candidatos = await m.ParticipanteIncentivo.findAll({
    where: { escola_id: bolsa.escola_id, tipo_pessoa: 'atleta', [Op.or]: [...(bolsa.aluno_id ? [{ aluno_id: bolsa.aluno_id }] : []), { nome: bolsa.nome }] },
    include: [{ model: m.EsporteIncentivo, as: 'Esporte' }],
    order: [['created_at', 'DESC']],
  });
  const participante = candidatos.find(p => bolsa.aluno_id && p.aluno_id === bolsa.aluno_id)
    || candidatos.find(p => norm(p.nome) === norm(bolsa.nome)) || null;
  let esporte = participante?.Esporte?.nome || null;

  const ou = [{ nome_atleta: bolsa.nome }];
  if (bolsa.aluno_id) ou.push({ aluno_id: bolsa.aluno_id });
  const conquistas = await m.Conquista.findAll({
    where: { escola_id: bolsa.escola_id, [Op.or]: ou },
    include: [{ model: m.Competicao, where: { ano: bolsa.ano, escola_id: bolsa.escola_id } }],
  });
  const grupos = agruparCompeticoes(conquistas);
  // Sem projeto no Incentivo: esporte = arte marcial das conquistas.
  if (!esporte) {
    const arteId = conquistas.find(c => c.arte_marcial_id)?.arte_marcial_id;
    const arte = arteId ? await m.ArteMarcial.findOne({ where: { id: arteId, escola_id: bolsa.escola_id } }) : null;
    esporte = arte?.nome || 'esporte';
  }

  const horarios = await horariosDe(bolsa, participante);
  const hTexto = textoHorarios(horarios.itens);

  const categorias = new Set((bolsa.Despesas || []).map(d => d.categoria));
  const recursos = Object.keys(RECURSO_CURTO).filter(c => categorias.has(c)).map(c => RECURSO_CURTO[c]);

  const relatorio = montarRelatorio({ esporte, horarios: hTexto, recursos, ano: bolsa.ano, grupos });

  return {
    limite: LIMITE_RELATORIO,
    esporte,
    projeto: participante ? participante.numero_protocolo : null,
    horarios_origem: horarios.origem,
    relatorio: relatorio.texto,
    resultados_omitidos: relatorio.omitidos,
    total_podios: conquistas.filter(c => c.colocacao && c.colocacao <= 3).length,
    competicoes: grupos.map(g => {
      const c = g.competicao;
      const podios = g.resultados.filter(r => r.colocacao && r.colocacao <= 3).length;
      return {
        id: c.id, nome: c.nome, nivel: c.nivel, cidade: cidadeUf(c), periodo: c.data_inicio || c.periodo_texto || null,
        podios,
        resultados: g.resultados.map(r => ({ colocacao: r.colocacao, modalidade: r.modalidade, categoria: r.categoria })),
        texto: `${c.nome}${cidadeUf(c) ? ` (${cidadeUf(c)})` : ''}: ${juntarE(g.resultados.map(r => prova(r, true)))}.`,
      };
    }),
  };
}

module.exports = { montarRelatorioTecnico, LIMITE_RELATORIO, _test: { nomeCurto, textoHorarios, montarRelatorio } };
