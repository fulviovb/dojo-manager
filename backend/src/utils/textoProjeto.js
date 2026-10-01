// Textos do formulário de projeto do Sistema Incentivo online (prefeitura):
// MODALIDADE, CURRÍCULO, OBJETIVOS, COMPETIÇÕES PREVISTAS, LOCAIS DE
// TREINAMENTO. Usado pela tela do participante (prévia) e pelo LEIA-ME do
// "Baixar projeto".
const { Op } = require('sequelize');

const NIVEL_LABEL = { municipal: 'municipal', estadual: 'estadual', nacional: 'nacional', panamericano: 'pan-americano', mundial: 'mundial' };
const NIVEL_PLURAL = { municipal: 'municipais', estadual: 'estaduais', nacional: 'nacionais', panamericano: 'pan-americanos', mundial: 'mundiais' };
const NIVEL_PESO = { mundial: 5, panamericano: 4, nacional: 3, estadual: 2, municipal: 1 };
// Campo do formulário da prefeitura aceita no máximo 500 caracteres.
const LIMITE_CURRICULO = 500;
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const META_LABEL = { campeao: '1º lugar', podio: 'pódio (até 3º lugar)', top5: 'classificação entre os 5 primeiros' };

const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const hora = (t) => (t ? String(t).slice(0, 5) : '');

function nomeCompeticao(c) {
  return [c.nome, c.etapa && !String(c.nome).includes(c.etapa) ? `(${c.etapa})` : null, String(c.nome).includes(String(c.ano)) ? null : c.ano].filter(Boolean).join(' ');
}

function periodoCompeticao(c) {
  if (c.data_inicio && c.data_fim && c.data_fim !== c.data_inicio) return `${dataBr(c.data_inicio)} a ${dataBr(c.data_fim)}`;
  if (c.data_inicio) return dataBr(c.data_inicio);
  return c.periodo_texto || String(c.ano);
}

function localCompeticao(c) {
  const cidade = [c.cidade, c.estado].filter(Boolean).join('/');
  return [cidade, c.pais && c.pais !== 'Brasil' ? c.pais : null].filter(Boolean).join(' - ') || 'a definir';
}

function textoObjetivo(o) {
  if (o.meta === 'livre') return (o.texto_livre || '').trim();
  const prova = [o.modalidade, o.categoria && `(${o.categoria})`].filter(Boolean).join(' ');
  const comp = o.Competicao ? `no ${nomeCompeticao(o.Competicao)}` : '';
  if (o.meta === 'participar') return `Participar ${comp.replace(/^no /, 'do ')}${prova ? `, na prova ${prova}` : ''}`.trim();
  return `Conquistar ${META_LABEL[o.meta]}${prova ? ` em ${prova}` : ''}${comp ? ` ${comp}` : ''}`.trim();
}

// "Nome\nEndereço" (padrão das salas) → { nome, endereco }. Sem 2ª linha
// ou sem nenhum número no endereço (ex.: "Criando novo Local de Treino"),
// endereco vem vazio — não é endereço de verdade.
function localDaSala(nomeSala) {
  const linhas = String(nomeSala || '').split('\n').map(l => l.trim()).filter(Boolean);
  const endereco = linhas.slice(1).join(', ');
  return { nome: linhas[0] || '', endereco: /\d/.test(endereco) ? endereco : '' };
}

// Texto do local pro formulário: "Nome - Endereço" (ou o endereço legado).
const textoLocal = (l) => (l.Local ? `${l.Local.nome} - ${l.Local.endereco}` : (l.endereco || ''));
// CEP extraído de um endereço em texto ("…, 82320-040 Curitiba") ou null.
const cepDoTexto = (t) => { const m = /\b(\d{5})-?(\d{3})\b/.exec(String(t || '')); return m ? `${m[1]}-${m[2]}` : null; };

// Arte marcial da escola com o mesmo nome do esporte do participante (ex.:
// esporte "Karatê Shotokan" ↔ arte "Karatê Shotokan") — restringe faixa,
// turmas e conquistas ao esporte do projeto. null = esporte sem arte
// correspondente (ex.: natação) → sem filtro.
async function arteDoEsporte(participante) {
  if (!participante.Esporte?.nome) return null;
  const { ArteMarcial } = require('../models');
  return ArteMarcial.findOne({ where: { escola_id: participante.escola_id, nome: participante.Esporte.nome } });
}

// Conquistas do participante: pelo aluno vinculado e/ou pelo nome (atleta
// avulso que tem histórico importado).
async function conquistasDo(participante) {
  const { Conquista, Competicao } = require('../models');
  const ou = [{ nome_atleta: participante.nome }];
  if (participante.aluno_id) ou.push({ aluno_id: participante.aluno_id });
  const arte = await arteDoEsporte(participante);
  return Conquista.findAll({
    where: { escola_id: participante.escola_id, colocacao: { [Op.ne]: null }, [Op.or]: ou, ...(arte ? { arte_marcial_id: arte.id } : {}) },
    include: [{ model: Competicao }],
  });
}

// Currículo sugerido (curto, "claro e sucinto" como pede o formulário).
// null quando não há nada a dizer além do esporte.
async function montarCurriculo(participante) {
  const { Escola, Usuario, GraduacaoAluno, Faixa, MatriculaAluno } = require('../models');
  const esporte = participante.Esporte?.nome || 'esporte não informado';
  const escola = await Escola.findByPk(participante.escola_id, { attributes: ['nome'] });
  const conquistas = (await conquistasDo(participante)).filter(c => c.Competicao);

  // Aluno vinculado pelo cadastro, ou casado pelo nome.
  let alunoId = participante.aluno_id;
  if (!alunoId) {
    const aluno = await Usuario.findOne({ where: { escola_id: participante.escola_id, nome: participante.nome, role: 'aluno' }, attributes: ['id'] });
    alunoId = aluno?.id || null;
  }
  let faixa = null; let desde = null;
  const arte = await arteDoEsporte(participante);
  if (alunoId) {
    // Faixa só da arte do esporte do projeto (aluno pode ter graduação em
    // outra arte — ex.: jiu-jitsu); sem arte correspondente, sem faixa.
    const grad = arte ? await GraduacaoAluno.findOne({ where: { aluno_id: alunoId, arte_marcial_id: arte.id, atual: true }, include: [{ model: Faixa, attributes: ['nome'] }] }) : null;
    faixa = grad?.Faixa?.nome || null;
    const { Turma } = require('../models');
    const primeira = await MatriculaAluno.min('data_matricula', {
      where: { aluno_id: alunoId },
      ...(arte ? { include: [{ model: Turma, where: { arte_marcial_id: arte.id }, attributes: [] }] } : {}),
    });
    desde = primeira ? Number(String(primeira).slice(0, 4)) : null;
  }
  const anoMaisAntigo = conquistas.reduce((m, c) => Math.min(m, c.Competicao.ano), Infinity);
  if (Number.isFinite(anoMaisAntigo) && (!desde || anoMaisAntigo < desde)) desde = anoMaisAntigo;

  const partes = [];
  if (participante.tipo_pessoa === 'tecnico') {
    partes.push(`Técnico(a) de ${esporte}${participante.confef_cref ? `, registro CONFEF/CREF ${participante.confef_cref}` : ''}${escola ? `, atua no ${escola.nome}` : ''}.`);
  } else {
    partes.push(`Atleta de ${esporte}${faixa ? `, faixa ${faixa.toLowerCase()}` : ''}${alunoId && escola ? `, treina no ${escola.nome}` : ''}${desde ? ` desde ${desde}` : ''}.`);
  }

  const podios = conquistas.filter(c => c.colocacao <= 3);
  if (podios.length) {
    const porNivel = Object.entries(podios.reduce((m, c) => ({ ...m, [c.Competicao.nivel]: (m[c.Competicao.nivel] || 0) + 1 }), {}))
      .sort((a, b) => NIVEL_PESO[b[0]] - NIVEL_PESO[a[0]])
      .map(([n, q]) => `${q} ${q > 1 ? (NIVEL_PLURAL[n] || n) : (NIVEL_LABEL[n] || n)}`);
    partes.push(`Soma ${podios.length} pódio${podios.length > 1 ? 's' : ''} em competições oficiais${Number.isFinite(anoMaisAntigo) ? ` desde ${anoMaisAntigo}` : ''} (${porNivel.join(', ')}).`);
    // Resultados entram, do mais importante pro menos, enquanto o texto
    // inteiro couber no limite do formulário (LIMITE_CURRICULO).
    const ordenados = [...podios]
      .sort((a, b) => (NIVEL_PESO[b.Competicao.nivel] - NIVEL_PESO[a.Competicao.nivel]) || (a.colocacao - b.colocacao) || (b.Competicao.ano - a.Competicao.ano))
      .map(c => `${c.Competicao.ano}: ${c.colocacao}º ${c.modalidade}${c.categoria ? ` ${c.categoria}` : ''} – ${c.Competicao.nome}`);
    const escolhidos = [];
    for (const r of ordenados) {
      const tentativa = [...partes, `Principais resultados: ${[...escolhidos, r].join('; ')}.`].join(' ');
      if (tentativa.length > LIMITE_CURRICULO) break;
      escolhidos.push(r);
    }
    if (escolhidos.length) partes.push(`Principais resultados: ${escolhidos.join('; ')}.`);
  }
  const texto = partes.join(' ');
  if (!(partes.length > 1 || participante.tipo_pessoa === 'tecnico' || alunoId)) return null;
  return texto.length > LIMITE_CURRICULO ? `${texto.slice(0, LIMITE_CURRICULO - 1).trimEnd()}…` : texto;
}

// Tudo pronto pra copiar e colar, campo a campo.
async function montarFormulario(participante) {
  const { ObjetivoIncentivo, CompeticaoPrevistaIncentivo, LocalTreinoIncentivo, Competicao } = require('../models');
  const objetivos = await ObjetivoIncentivo.findAll({
    where: { participante_id: participante.id }, include: [{ model: Competicao }], order: [['ordem', 'ASC'], ['created_at', 'ASC']],
  });
  const previstas = await CompeticaoPrevistaIncentivo.findAll({ where: { participante_id: participante.id }, include: [{ model: Competicao }] });
  const { LocalTreino } = require('../models');
  const locais = await LocalTreinoIncentivo.findAll({
    where: { participante_id: participante.id }, include: [{ model: LocalTreino, as: 'Local' }],
    order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']],
  });

  // Competições: as marcadas + as citadas nos objetivos, sem repetir, por data.
  const comps = new Map();
  for (const c of [...previstas.map(p => p.Competicao), ...objetivos.map(o => o.Competicao)]) if (c) comps.set(c.id, c);
  const competicoes = [...comps.values()]
    .sort((a, b) => String(a.data_inicio || `${a.ano}-99`).localeCompare(String(b.data_inicio || `${b.ano}-99`)))
    .map(c => ({ id: c.id, evento: nomeCompeticao(c), periodo: periodoCompeticao(c), local: localCompeticao(c) }));

  const curriculoSalvo = (participante.curriculo_esportivo || '').trim();
  const curriculoSugerido = curriculoSalvo ? null : await montarCurriculo(participante);

  return {
    modalidade: participante.Esporte?.nome || '',
    curriculo: curriculoSalvo || curriculoSugerido || '',
    curriculo_e_sugestao: !curriculoSalvo && !!curriculoSugerido,
    objetivos: objetivos.map(textoObjetivo).filter(Boolean),
    competicoes,
    locais: locais.map(l => ({ nome: l.Local?.nome || '', cep: l.Local?.cep || cepDoTexto(l.endereco) || '', endereco: textoLocal(l), dia: DIAS[l.dia_semana], inicio: hora(l.hora_inicio), fim: hora(l.hora_fim) })),
  };
}

module.exports = { conquistasDo, LIMITE_CURRICULO, arteDoEsporte, montarCurriculo, montarFormulario, textoObjetivo, localDaSala, textoLocal, cepDoTexto, nomeCompeticao, periodoCompeticao, localCompeticao, DIAS };
