const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {
  Exame, ExameParticipante, ExamePagamento, ExamePedidoFaixa, ExameHistorico, IndicacaoExame, AvaliacaoAluno, FaseExame,
  Usuario, Faixa, Turma, MatriculaAluno, GraduacaoAluno, ArteMarcial,
} = require('../models');
const {
  ErroRegra, responderErro, opcoesDeFaixa, resumoFaixa, obterOuCriarIndicacao, candidatoEmExameAberto, STATUS_ABERTO,
} = require('../services/indicacaoExameService');
const {
  carregarExame, exigirExameInteiro, carregarCandidato, historico,
} = require('../services/exameAcessoService');
const { carenciaEmLote } = require('../services/carenciaService');
const { registrarGraduacao } = require('../services/graduacaoService');
const { buscarFasesDoExame, copiarRoteiro } = require('../services/roteiroExameService');
const { resumoFinanceiro, totaisDoExame, taxaHerdada, cent } = require('../utils/pagamentoExame');
const { calcularNotaFinal } = require('../utils/notaExame');
const { dataLocalISO } = require('../utils/data');

const ehData = (d) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) return false;
  const x = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(x.getTime()) && x.toISOString().slice(0, 10) === d;
};
const texto = (v, max = 255) => {
  const t = String(v ?? '').trim();
  if (t.length > max) throw new ErroRegra(400, `Texto muito longo (máximo ${max} caracteres)`);
  return t || null;
};
// '' / null → null; número ≥ 0 com 2 casas; senão 400
const dinheiro = (v, campo) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 99999999) throw new ErroRegra(400, `${campo} inválido`);
  return cent(n) / 100;
};
const umDe = (v, lista, campo) => {
  if (!lista.includes(v)) throw new ErroRegra(400, `${campo} inválido`);
  return v;
};
const nomeTurma = (t) => t.nome.split('\n')[0].replace(/^Turma de Aula:\s*/i, '');
const moeda = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const exigirNaoCancelado = (exame) => {
  if (exame.status === 'cancelado') throw new ErroRegra(409, 'O exame está cancelado');
};
const exigirInscricoesAbertas = (exame) => {
  if (exame.tipo !== 'normal') throw new ErroRegra(409, 'Roteiro Padrão não recebe candidatos');
  if (!STATUS_ABERTO.includes(exame.status)) throw new ErroRegra(409, 'O exame não está aberto');
  if (exame.inscricoes_fechadas) throw new ErroRegra(409, 'Inscrições fechadas: reabra para alterar a lista de candidatos');
};

const includeFinanceiro = [
  { model: ExamePagamento, as: 'Pagamentos', include: [{ model: Usuario, as: 'RegistradoPor', attributes: ['id', 'nome'] }] },
  { model: ExamePedidoFaixa, as: 'PedidoFaixa', include: [{ model: Faixa, attributes: ['id', 'nome', 'cor', 'ordem'] }] },
];

// Campos de gestão do corpo (RF-01). Usado na criação e na edição.
const lerGestao = (b) => {
  const d = {};
  if (tem(b, 'usa_avaliacao')) d.usa_avaliacao = !!b.usa_avaliacao;
  if (tem(b, 'inscricoes_fechadas')) d.inscricoes_fechadas = !!b.inscricoes_fechadas;
  if (tem(b, 'local')) d.local = texto(b.local);
  if (tem(b, 'horario')) {
    d.horario = b.horario || null;
    if (d.horario && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(d.horario)) throw new ErroRegra(400, 'Horário inválido');
  }
  if (tem(b, 'taxa_padrao')) d.taxa_padrao = dinheiro(b.taxa_padrao, 'Taxa');
  if (tem(b, 'preco_faixa_padrao')) d.preco_faixa_padrao = dinheiro(b.preco_faixa_padrao, 'Preço da faixa');
  if (tem(b, 'taxas_por_faixa')) {
    const t = b.taxas_por_faixa || {};
    if (typeof t !== 'object' || Array.isArray(t)) throw new ErroRegra(400, 'Taxas por faixa inválidas');
    d.taxas_por_faixa = {};
    for (const [id, v] of Object.entries(t)) {
      const valor = dinheiro(v, 'Taxa');
      if (valor != null) d.taxas_por_faixa[id] = valor;
    }
  }
  if (tem(b, 'tipos_faixa')) {
    if (!Array.isArray(b.tipos_faixa) || b.tipos_faixa.length > 30) throw new ErroRegra(400, 'Tipos de faixa inválidos');
    d.tipos_faixa = b.tipos_faixa.map((t) => {
      const nome = texto(t?.nome, 60);
      const preco = dinheiro(t?.preco, 'Preço do tipo de faixa');
      if (!nome || preco == null) throw new ErroRegra(400, 'Cada tipo de faixa precisa de nome e preço');
      return { nome, preco };
    });
    if (new Set(d.tipos_faixa.map((t) => t.nome.toLowerCase())).size !== d.tipos_faixa.length) throw new ErroRegra(400, 'Há tipos de faixa com o mesmo nome');
  }
  for (const c of ['prazo_pagamento', 'prazo_pedido_faixa']) {
    if (!tem(b, c)) continue;
    d[c] = b[c] || null;
    if (d[c] && !ehData(d[c])) throw new ErroRegra(400, 'Prazo inválido');
  }
  return d;
};

// Lista de tipos do último exame da arte que tenha algum (ponto de partida)
const tiposDoExameAnterior = async (escola_id, arte_marcial_id) => {
  const es = await Exame.findAll({
    where: { escola_id, arte_marcial_id, tipo: 'normal', status: { [Op.ne]: 'cancelado' } },
    attributes: ['tipos_faixa'], order: [['created_at', 'DESC']],
  });
  return es.find((e) => e.tipos_faixa?.length)?.tipos_faixa || [];
};

// PUT /api/exames/:id/gestao
const atualizarGestao = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction, lock: true });
      await exigirExameInteiro(exame, permitidos, { transaction });
      exigirNaoCancelado(exame);
      const dados = lerGestao(req.body);
      if (tem(req.body, 'nome')) {
        dados.nome = texto(req.body.nome);
        if (!dados.nome) throw new ErroRegra(400, 'Nome é obrigatório');
      }
      if (tem(req.body, 'data')) {
        if (!ehData(req.body.data)) throw new ErroRegra(400, 'Data inválida');
        dados.data = req.body.data;
      }
      if (dados.usa_avaliacao === false && exame.usa_avaliacao) {
        if (exame.tipo === 'roteiro_padrao') throw new ErroRegra(409, 'O Roteiro Padrão precisa usar avaliação');
        const n = await AvaliacaoAluno.count({ where: { exame_id: exame.id }, transaction });
        if (n) throw new ErroRegra(409, 'Este exame já tem avaliações sorteadas');
      }
      if (dados.taxas_por_faixa) {
        const ids = Object.keys(dados.taxas_por_faixa);
        const n = await Faixa.count({ where: { id: ids, arte_marcial_id: exame.arte_marcial_id }, transaction });
        if (n !== ids.length) throw new ErroRegra(400, 'Faixa inválida');
      }
      // passou a usar avaliação e ainda não tem roteiro: copia o Roteiro Padrão
      if (dados.usa_avaliacao && !exame.usa_avaliacao && !(await buscarFasesDoExame(exame.id, { transaction })).length) {
        const padrao = await Exame.findOne({
          where: { escola_id: exame.escola_id, arte_marcial_id: exame.arte_marcial_id, tipo: 'roteiro_padrao' }, transaction,
        });
        if (padrao) await copiarRoteiro(padrao.id, exame.id, { transaction });
      }
      const txt = (v) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(Object.entries(v).sort()) : String(v));
      const mudou = Object.keys(dados).filter((k) => txt(exame[k]) !== txt(dados[k]));
      await exame.update(dados, { transaction });
      if (mudou.length) {
        await historico(req, exame, null, 'exame', `Alterado: ${mudou.map((k) => `${k} = ${dados[k] == null ? 'vazio' : typeof dados[k] === 'object' ? JSON.stringify(dados[k]) : dados[k]}`).join('; ')}`, { transaction });
      }
    });
    res.json(await Exame.findByPk(req.params.id));
  } catch (e) { responderErro(res, e); }
};

const notasPorParticipante = async (exame) => {
  if (!exame.usa_avaliacao) return { total: 0, mapa: new Map() };
  const [total, avs] = await Promise.all([
    FaseExame.count({ where: { exame_id: exame.id } }),
    AvaliacaoAluno.findAll({ where: { exame_id: exame.id, status: 'finalizada' }, attributes: ['exame_participante_id', 'nota'] }),
  ]);
  const mapa = new Map();
  for (const a of avs) {
    if (!mapa.has(a.exame_participante_id)) mapa.set(a.exame_participante_id, []);
    mapa.get(a.exame_participante_id).push(Number(a.nota));
  }
  return { total, mapa };
};

const idadeEm = (nasc, hoje) => {
  if (!nasc) return null;
  const [a, m, d] = String(nasc).slice(0, 10).split('-').map(Number);
  const [ah, mh, dh] = hoje.split('-').map(Number);
  return ah - a - ((mh < m || (mh === m && dh < d)) ? 1 : 0);
};

const pagamentoJson = (p) => ({
  id: p.id, referente: p.referente, data: p.data, valor: Number(p.valor), forma: p.forma,
  comprovante_url: p.comprovante_url, observacao: p.observacao, registrado_por: p.RegistradoPor?.nome || null,
  criado_em: p.createdAt || p.created_at, estornado_em: p.estornado_em, motivo_estorno: p.motivo_estorno,
});

// GET /api/exames/:id/candidatos — lista completa + totais
const listarCandidatos = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    const participantes = await ExameParticipante.findAll({
      where: { exame_id: exame.id, ...(permitidos ? { aluno_id: [...permitidos] } : {}) },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'data_nascimento', 'telefone', 'mae', 'pai', 'foto_url'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor', 'ordem'] },
        { model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor', 'ordem'] },
        { model: Turma, as: 'Turma', attributes: ['id', 'nome'] },
        ...includeFinanceiro,
      ],
    });
    const hoje = dataLocalISO();
    const [carencias, notas] = await Promise.all([
      carenciaEmLote(exame.escola_id, exame.arte_marcial_id, participantes.filter((p) => p.aluno_id).map((p) => p.aluno_id)),
      notasPorParticipante(exame),
    ]);

    const candidatos = participantes.map((p) => {
      const externo = !p.aluno_id;
      const a = externo
        ? { id: null, nome: p.externo_nome, data_nascimento: p.externo_nascimento, telefone: p.externo_telefone, mae: p.externo_responsavel }
        : p.Aluno;
      const idade = idadeEm(a.data_nascimento, hoje);
      const ns = notas.mapa.get(p.id) || [];
      const completo = notas.total > 0 && ns.length === notas.total;
      const pais = [a.mae, a.pai].filter(Boolean);
      const c = carencias.get(p.aluno_id);
      return {
        id: p.id,
        aluno: { id: a.id, nome: a.nome, foto_url: a.foto_url, idade, telefone: a.telefone },
        externo: externo ? { nascimento: p.externo_nascimento, responsavel: p.externo_responsavel, origem: p.externo_origem } : null,
        responsavel: (externo || idade == null || idade < 18) && pais.length ? pais.join(' / ') : a.nome,
        turma: externo ? { id: 'externo', nome: 'Externos' } : p.Turma ? { id: p.Turma.id, nome: nomeTurma(p.Turma) } : null,
        faixa_atual: resumoFaixa(p.FaixaAtual),
        faixa_pretendida: resumoFaixa(p.FaixaPretendida),
        // graduado já começou a contar na faixa nova: a carência do exame deixou de valer
        carencia: externo ? { aulas: null, min_aulas: null, situacao: 'externo' } : p.graduacao_aluno_id ? null : { aulas: c.aulas, min_aulas: c.min_aulas, situacao: c.situacao },
        taxa_herdada: Number(taxaHerdada(p, exame) || 0),
        taxa_propria: p.valor_taxa == null ? null : Number(p.valor_taxa),
        desconto: Number(p.desconto), motivo_desconto: p.motivo_desconto, isento: p.isento,
        status_inscricao: p.status_inscricao, presenca: p.presenca, resultado: p.resultado,
        graduado: !!p.graduacao_aluno_id, observacoes: p.observacoes,
        sem_indicacao: !p.indicacao_exame_id,
        financeiro: resumoFinanceiro(p, exame, hoje),
        quer_comprar: p.PedidoFaixa?.quer_comprar || 'sem_resposta',
        pedido: p.PedidoFaixa ? {
          faixa: resumoFaixa(p.PedidoFaixa.Faixa), tamanho: p.PedidoFaixa.tamanho, tipo: p.PedidoFaixa.tipo,
          valor: p.PedidoFaixa.valor == null ? null : Number(p.PedidoFaixa.valor),
          entregue: p.PedidoFaixa.entregue, entregue_em: p.PedidoFaixa.entregue_em,
        } : null,
        pagamentos: p.Pagamentos.map(pagamentoJson).sort((a, b) => a.data.localeCompare(b.data)),
        fases_finalizadas: ns.length, fases_total: notas.total,
        nota_final: completo ? calcularNotaFinal(ns) : null,
        pode_aprovar: !exame.usa_avaliacao || completo,
      };
    });
    const ordem = (x) => (x.faixa_pretendida ? x.faixa_pretendida.ordem : Infinity);
    candidatos.sort((a, b) => ordem(a) - ordem(b) || a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR'));

    const arte = await ArteMarcial.findByPk(exame.arte_marcial_id, { attributes: ['id', 'nome'] });
    res.json({
      exame: { ...exame.toJSON(), ArteMarcial: arte },
      hoje, totais: totaisDoExame(candidatos), candidatos,
    });
  } catch (e) { responderErro(res, e); }
};

// GET /api/exames/:id/elegiveis?origem=indicados|turma|avulso&turma_id=&busca=
// Alunos pra janela "Adicionar candidatos".
const listarElegiveis = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    const { escola_id, arte_marcial_id } = exame;
    const { origem, turma_id } = req.query;
    const busca = String(req.query.busca || '').trim();

    const indicacoes = await IndicacaoExame.findAll({
      where: { escola_id, arte_marcial_id, status: 'indicado' },
      include: [{ model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor', 'ordem', 'opcional'] }],
    });
    const indPorAluno = new Map(indicacoes.map((i) => [i.aluno_id, i]));

    const matriculas = await MatriculaAluno.findAll({
      where: { ativa: true },
      attributes: ['aluno_id', 'turma_id'],
      include: [{
        model: Turma, attributes: ['id', 'nome', 'professor_id'],
        where: {
          escola_id, arte_marcial_id, ativa: true, tipo: 'regular',
          ...(req.usuario.role === 'professor' ? { professor_id: req.usuario.id } : {}),
        },
      }],
    });
    const turmasPorAluno = new Map();
    for (const m of matriculas) {
      if (!turmasPorAluno.has(m.aluno_id)) turmasPorAluno.set(m.aluno_id, []);
      turmasPorAluno.get(m.aluno_id).push({ id: m.Turma.id, nome: nomeTurma(m.Turma) });
    }
    const turmas = [...new Map(matriculas.map((m) => [m.Turma.id, { id: m.Turma.id, nome: nomeTurma(m.Turma) }])).values()]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    let ids;
    if (origem === 'indicados') ids = [...indPorAluno.keys()];
    else if (origem === 'turma') ids = matriculas.filter((m) => m.turma_id === turma_id).map((m) => m.aluno_id);
    else {
      // avulso: aluno da arte = matriculado numa turma dela ou já graduado nela (RN-03)
      const graus = await GraduacaoAluno.findAll({ where: { escola_id, arte_marcial_id, atual: true }, attributes: ['aluno_id'] });
      ids = [...new Set([...turmasPorAluno.keys(), ...graus.map((g) => g.aluno_id)])];
    }
    if (permitidos) ids = ids.filter((id) => permitidos.has(id));
    if (origem === 'avulso' && busca.length < 2) return res.json({ turmas, alunos: [] });

    const alunos = await Usuario.findAll({
      where: {
        id: ids, escola_id, role: 'aluno', ativo: true,
        ...(origem === 'avulso' ? { nome: { [Op.like]: `%${busca.replace(/[\\%_]/g, '\\$&')}%` } } : {}),
      },
      attributes: ['id', 'nome'], order: [['nome', 'ASC']],
      ...(origem === 'avulso' ? { limit: 30 } : {}),
    });

    const [faixas, carencias, doExame, emOutro] = await Promise.all([
      Faixa.findAll({ where: { arte_marcial_id }, order: [['ordem', 'ASC']] }),
      carenciaEmLote(escola_id, arte_marcial_id, alunos.map((a) => a.id)),
      ExameParticipante.findAll({ where: { exame_id: exame.id }, attributes: ['aluno_id', 'status_inscricao'] }),
      ExameParticipante.findAll({
        where: {
          indicacao_exame_id: indicacoes.map((i) => i.id), exame_id: { [Op.ne]: exame.id },
          status_inscricao: { [Op.ne]: 'desistiu' },
        },
        include: [{ model: Exame, attributes: ['nome'], where: { status: STATUS_ABERTO, tipo: 'normal' } }],
      }),
    ]);
    const statusNoExame = new Map(doExame.map((p) => [p.aluno_id, p.status_inscricao]));
    const outroExame = new Map(emOutro.map((p) => [p.aluno_id, p.Exame.nome]));

    res.json({
      turmas,
      alunos: alunos.map((a) => {
        const c = carencias.get(a.id);
        const ind = indPorAluno.get(a.id);
        const opcoes = ind ? [] : opcoesDeFaixa(faixas, c.faixa_atual ? c.faixa_atual.ordem : null);
        const st = statusNoExame.get(a.id);
        let bloqueio = null;
        if (st && st !== 'desistiu') bloqueio = 'Já é candidato';
        else if (outroExame.has(a.id)) bloqueio = `No exame "${outroExame.get(a.id)}"`;
        else if (!ind && !opcoes.length) bloqueio = 'Já está na última faixa';
        return {
          id: a.id, nome: a.nome, turmas: turmasPorAluno.get(a.id) || [],
          faixa_atual: c.faixa_atual,
          carencia: { aulas: c.aulas, min_aulas: c.min_aulas, situacao: c.situacao },
          indicado: !!ind, desistiu: st === 'desistiu',
          faixa_pretendida: resumoFaixa(ind ? ind.FaixaPretendida : opcoes[0]),
          opcoes: opcoes.length > 1 ? opcoes.map(resumoFaixa) : [],
          bloqueio,
        };
      }),
    });
  } catch (e) { responderErro(res, e); }
};

const incluirUm = async (req, { aluno_id, faixa_pretendida_id, turma_id }) => sequelize.transaction(async (transaction) => {
  // trava o exame: serializa inclusões e o fechamento das inscrições
  const { exame, permitidos } = await carregarExame(req, { transaction, lock: true });
  exigirInscricoesAbertas(exame);
  const { escola_id, arte_marcial_id } = exame;
  const aluno = await Usuario.findOne({ where: { id: aluno_id, escola_id, role: 'aluno', ativo: true }, attributes: ['id', 'nome'], transaction });
  if (!aluno) throw new ErroRegra(404, 'Aluno não encontrado');
  if (permitidos && !permitidos.has(aluno_id)) throw new ErroRegra(403, 'Sem permissão para este aluno');

  const jaNoExame = await ExameParticipante.findOne({ where: { exame_id: exame.id, aluno_id }, transaction, lock: transaction.LOCK.UPDATE });
  if (jaNoExame && jaNoExame.status_inscricao !== 'desistiu') throw new ErroRegra(409, 'Já é candidato');

  const matriculas = await MatriculaAluno.findAll({
    where: { aluno_id, ativa: true },
    include: [{ model: Turma, attributes: ['id', 'professor_id'], where: { escola_id, arte_marcial_id, ativa: true, tipo: 'regular' } }],
    transaction,
  });
  const atual = await GraduacaoAluno.findOne({ where: { escola_id, aluno_id, arte_marcial_id, atual: true }, transaction });
  if (!matriculas.length && !atual) throw new ErroRegra(400, 'O aluno não pratica a arte marcial deste exame');
  const minhas = req.usuario.role === 'professor' ? matriculas.filter((m) => m.Turma.professor_id === req.usuario.id) : matriculas;
  const turma = matriculas.find((m) => m.turma_id === turma_id) || minhas[0] || matriculas[0];

  const { indicacao, criada } = await obterOuCriarIndicacao({
    escola_id, aluno_id, arte_marcial_id, faixa_pretendida_id, indicado_por_id: req.usuario.id,
  }, { transaction });
  const outro = await candidatoEmExameAberto(indicacao.id, { exceto_exame_id: exame.id, transaction });
  if (outro) throw new ErroRegra(409, `Já é candidato do exame "${outro.Exame.nome}"`);

  const dados = {
    indicacao_exame_id: indicacao.id,
    turma_id: turma?.turma_id || null,
    faixa_atual_id: atual?.faixa_id || indicacao.faixa_atual_id,
    faixa_pretendida_id: indicacao.faixa_pretendida_id,
    status_inscricao: 'indicado',
  };
  const p = jaNoExame
    ? await jaNoExame.update({ ...dados, presenca: null, resultado: null }, { transaction })
    : await ExameParticipante.create({ exame_id: exame.id, aluno_id, ...dados }, { transaction });
  await historico(req, exame, p, 'inscricao', `${jaNoExame ? 'Voltou à' : 'Entrou na'} lista${criada ? ' (indicação criada)' : ''}`, { transaction });
  return p;
});

// POST /api/exames/:id/candidatos
// { importar_indicados: true } ou { turma_id?, alunos: [{ aluno_id, faixa_pretendida_id? }] }
// Cada aluno é uma transação: um erro não impede os demais.
const incluirCandidatos = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    exigirInscricoesAbertas(exame);
    let itens = Array.isArray(req.body.alunos) ? req.body.alunos : [];
    if (req.body.importar_indicados) {
      const [inds, ja] = await Promise.all([
        IndicacaoExame.findAll({ where: { escola_id: exame.escola_id, arte_marcial_id: exame.arte_marcial_id, status: 'indicado' } }),
        ExameParticipante.findAll({ where: { exame_id: exame.id }, attributes: ['aluno_id'] }),
      ]);
      // desistente só volta se for marcado de propósito
      const noExame = new Set(ja.map((p) => p.aluno_id));
      itens = inds.filter((i) => (!permitidos || permitidos.has(i.aluno_id)) && !noExame.has(i.aluno_id)).map((i) => ({ aluno_id: i.aluno_id }));
    } else if (!itens.length) throw new ErroRegra(400, 'Selecione ao menos um aluno');
    if (itens.length > 500) throw new ErroRegra(400, 'Máximo de 500 alunos por vez');

    let incluidos = 0;
    const erros = [];
    for (const it of itens) {
      try {
        await incluirUm(req, { aluno_id: it?.aluno_id || '', faixa_pretendida_id: it?.faixa_pretendida_id, turma_id: req.body.turma_id });
        incluidos += 1;
      } catch (e) {
        if (!(e instanceof ErroRegra)) throw e;
        const u = await Usuario.findOne({ where: { id: it?.aluno_id || '', escola_id: exame.escola_id }, attributes: ['nome'] });
        erros.push({ aluno_id: it?.aluno_id, nome: u?.nome || '', erro: e.message, ...e.extra });
      }
    }
    res.status(incluidos ? 201 : 200).json({ incluidos, erros });
  } catch (e) { responderErro(res, e); }
};

// Candidato externo (sem cadastro de aluno): só admin
const lerExterno = async (exame, b, transaction) => {
  const nome = texto(b.nome);
  if (!nome) throw new ErroRegra(400, 'Informe o nome');
  if (b.nascimento && (!ehData(b.nascimento) || b.nascimento > dataLocalISO())) throw new ErroRegra(400, 'Data de nascimento inválida');
  const faixas = await Faixa.findAll({ where: { arte_marcial_id: exame.arte_marcial_id }, transaction });
  const pretendida = faixas.find((f) => f.id === b.faixa_pretendida_id);
  const atual = b.faixa_atual_id ? faixas.find((f) => f.id === b.faixa_atual_id) : null;
  if (!pretendida || (b.faixa_atual_id && !atual)) throw new ErroRegra(400, 'Escolha a faixa pretendida');
  if (atual && atual.ordem >= pretendida.ordem) throw new ErroRegra(400, 'A faixa pretendida precisa ser acima da atual');
  return {
    externo_nome: nome, externo_nascimento: b.nascimento || null, externo_responsavel: texto(b.responsavel),
    externo_telefone: texto(b.telefone, 40), externo_origem: texto(b.origem),
    faixa_atual_id: atual?.id || null, faixa_pretendida_id: pretendida.id,
  };
};

const exigirAdmin = (req) => {
  if (req.usuario.role !== 'admin') throw new ErroRegra(403, 'Só o administrador gerencia candidatos externos');
};

const exigirNomeLivre = async (exame, nome, exceto, transaction) => {
  const p = await ExameParticipante.findOne({
    where: { exame_id: exame.id, aluno_id: null, externo_nome: nome, ...(exceto ? { id: { [Op.ne]: exceto } } : {}) }, transaction,
  });
  if (p) throw new ErroRegra(409, 'Já existe um externo com este nome neste exame');
};

// POST /api/exames/:id/externos
const incluirExterno = async (req, res) => {
  try {
    exigirAdmin(req);
    const id = await sequelize.transaction(async (transaction) => {
      const { exame } = await carregarExame(req, { transaction, lock: true });
      exigirInscricoesAbertas(exame);
      const dados = await lerExterno(exame, req.body, transaction);
      await exigirNomeLivre(exame, dados.externo_nome, null, transaction);
      const p = await ExameParticipante.create({ exame_id: exame.id, aluno_id: null, ...dados }, { transaction });
      await historico(req, exame, p, 'inscricao', 'Entrou na lista (externo)', { transaction });
      return p.id;
    });
    res.status(201).json({ id });
  } catch (e) { responderErro(res, e); }
};

// PUT /api/exames/:id/externos/:pid
const atualizarExterno = async (req, res) => {
  try {
    exigirAdmin(req);
    await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction, lock: true });
      exigirNaoCancelado(exame);
      const p = await carregarCandidato(exame, permitidos, req.params.pid, { transaction });
      if (p.aluno_id) throw new ErroRegra(409, 'Este candidato não é externo');
      const dados = await lerExterno(exame, req.body, transaction);
      await exigirNomeLivre(exame, dados.externo_nome, p.id, transaction);
      if (dados.faixa_pretendida_id !== p.faixa_pretendida_id) {
        const avs = await AvaliacaoAluno.count({ where: { exame_participante_id: p.id }, transaction });
        if (avs || p.resultado) throw new ErroRegra(409, 'Com avaliação ou resultado, a faixa pretendida não pode mudar');
      }
      await p.update(dados, { transaction });
      await historico(req, exame, p, 'inscricao', 'Dados do externo alterados', { transaction });
    });
    res.json({ ok: true });
  } catch (e) { responderErro(res, e); }
};

const ROTULO = {
  indicado: 'Indicado', confirmado: 'Confirmado', desistiu: 'Desistiu', presente: 'Presente', ausente: 'Ausente',
};

// Aplica alterações num candidato já travado
const alterarCandidato = async (req, exame, p, b, transaction) => {
  const d = {};
  const notas = [];
  if (tem(b, 'valor_taxa')) d.valor_taxa = dinheiro(b.valor_taxa, 'Taxa');
  if (tem(b, 'desconto')) d.desconto = dinheiro(b.desconto, 'Desconto') || 0;
  if (tem(b, 'isento')) d.isento = !!b.isento;
  if (tem(b, 'motivo_desconto')) d.motivo_desconto = texto(b.motivo_desconto);
  if (tem(b, 'observacoes')) d.observacoes = texto(b.observacoes, 5000);
  const f = { ...p.toJSON(), ...d };
  if (['valor_taxa', 'desconto', 'isento', 'motivo_desconto'].some((k) => tem(d, k))) {
    const taxa = f.valor_taxa ?? taxaHerdada(p, exame);
    if (cent(f.desconto) > cent(taxa)) throw new ErroRegra(400, 'O desconto não pode ser maior que a taxa');
    if ((f.isento || cent(f.desconto) > 0) && !f.motivo_desconto) throw new ErroRegra(400, 'Informe o motivo do desconto ou da isenção');
    const mudouTaxa = cent(f.valor_taxa) !== cent(p.valor_taxa) || (f.valor_taxa == null) !== (p.valor_taxa == null)
      || cent(f.desconto) !== cent(p.desconto) || f.isento !== p.isento;
    if (mudouTaxa) notas.push(['taxa', f.isento ? `Isento (${f.motivo_desconto})` : `Taxa ${moeda(taxa)}, desconto ${moeda(f.desconto)}${f.motivo_desconto ? ` (${f.motivo_desconto})` : ''}`]);
  }
  if (tem(b, 'status_inscricao') && b.status_inscricao !== p.status_inscricao) {
    umDe(b.status_inscricao, ['indicado', 'confirmado', 'desistiu'], 'Inscrição');
    if (p.graduacao_aluno_id) throw new ErroRegra(409, 'Candidato já graduado');
    if (!STATUS_ABERTO.includes(exame.status)) throw new ErroRegra(409, 'O exame não está aberto');
    if (p.status_inscricao === 'desistiu' && !p.aluno_id) exigirInscricoesAbertas(exame);
    else if (p.status_inscricao === 'desistiu') throw new ErroRegra(409, 'Para voltar ao exame, inclua o aluno de novo em "Adicionar candidatos"');
    d.status_inscricao = b.status_inscricao;
    if (b.status_inscricao === 'desistiu') { d.presenca = null; d.resultado = null; }
    notas.push(['inscricao', ROTULO[b.status_inscricao]]);
  }
  if (tem(b, 'presenca') && (b.presenca || null) !== p.presenca) {
    d.presenca = b.presenca ? umDe(b.presenca, ['presente', 'ausente'], 'Presença') : null;
    if ((d.status_inscricao || p.status_inscricao) === 'desistiu') throw new ErroRegra(409, 'Candidato desistiu do exame');
    if (p.graduacao_aluno_id && d.presenca !== 'presente') throw new ErroRegra(409, 'Candidato já graduado');
    if (d.presenca === 'ausente' && p.resultado) throw new ErroRegra(409, 'Candidato já tem resultado');
    notas.push(['presenca', d.presenca ? ROTULO[d.presenca] : 'Presença desmarcada']);
  }
  await p.update(d, { transaction });
  for (const [t, n] of notas) await historico(req, exame, p, t, n, { transaction });
};

// PATCH /api/exames/:id/candidatos/:pid
const atualizarCandidato = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction });
      exigirNaoCancelado(exame);
      const p = await carregarCandidato(exame, permitidos, req.params.pid, { transaction });
      await alterarCandidato(req, exame, p, req.body, transaction);
    });
    res.json({ ok: true });
  } catch (e) { responderErro(res, e); }
};

const lerIds = (b) => {
  const ids = [...new Set(Array.isArray(b.ids) ? b.ids : [])];
  if (!ids.length) throw new ErroRegra(400, 'Selecione ao menos um candidato');
  return ids.sort(); // ordem fixa de travamento
};

// PATCH /api/exames/:id/candidatos { ids, status_inscricao?, presenca? } — em massa, tudo ou nada
const atualizarEmMassa = async (req, res) => {
  try {
    const ids = lerIds(req.body);
    const b = {};
    if (tem(req.body, 'status_inscricao')) b.status_inscricao = req.body.status_inscricao;
    if (tem(req.body, 'presenca')) b.presenca = req.body.presenca;
    await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction });
      exigirNaoCancelado(exame);
      for (const id of ids) {
        const p = await carregarCandidato(exame, permitidos, id, { transaction });
        await alterarCandidato(req, exame, p, b, transaction);
      }
    });
    res.json({ ok: true });
  } catch (e) { responderErro(res, e); }
};

// DELETE /api/exames/:id/candidatos/:pid — só inclusão por engano; com
// qualquer pagamento, avaliação ou resultado o caminho é a desistência.
const removerCandidato = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction });
      const p = await carregarCandidato(exame, permitidos, req.params.pid, { transaction });
      const [pags, avs] = await Promise.all([
        ExamePagamento.count({ where: { exame_participante_id: p.id }, transaction }),
        AvaliacaoAluno.count({ where: { exame_participante_id: p.id }, transaction }),
      ]);
      if (pags || avs || p.resultado || p.graduacao_aluno_id) {
        throw new ErroRegra(409, 'Candidato com pagamento, avaliação ou resultado não pode ser removido: registre a desistência');
      }
      const aluno = p.aluno_id ? await Usuario.findByPk(p.aluno_id, { attributes: ['nome'], transaction }) : { nome: p.externo_nome };
      await historico(req, exame, null, 'inscricao', `Removido da lista: ${aluno?.nome}`, { transaction });
      await ExamePedidoFaixa.destroy({ where: { exame_participante_id: p.id }, transaction });
      await p.destroy({ transaction });
    });
    res.json({ ok: true });
  } catch (e) { responderErro(res, e); }
};

const lerUrl = (v) => {
  const u = texto(v, 500);
  if (u && !/^https?:\/\//i.test(u)) throw new ErroRegra(400, 'Link do comprovante inválido');
  return u;
};
const FORMAS = ['pix', 'dinheiro', 'cartao', 'transferencia'];

// POST /api/exames/:id/pagamentos
const registrarPagamento = async (req, res) => {
  try {
    const b = req.body;
    const id = await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction });
      const p = await carregarCandidato(exame, permitidos, b.exame_participante_id || '', { transaction });
      const valor = dinheiro(b.valor, 'Valor');
      if (!valor) throw new ErroRegra(400, 'Informe um valor maior que zero');
      const data = b.data || dataLocalISO();
      if (!ehData(data) || data > dataLocalISO()) throw new ErroRegra(400, 'Data do pagamento inválida');
      const pag = await ExamePagamento.create({
        escola_id: exame.escola_id, exame_participante_id: p.id, valor, data,
        referente: umDe(b.referente, ['taxa', 'faixa'], 'Referência'),
        forma: umDe(b.forma, FORMAS, 'Forma'),
        comprovante_url: lerUrl(b.comprovante_url), observacao: texto(b.observacao),
        registrado_por: req.usuario.id,
      }, { transaction });
      await historico(req, exame, p, 'pagamento', `Recebido ${moeda(valor)} (${pag.referente}, ${pag.forma})`, { transaction });
      return pag.id;
    });
    res.status(201).json({ id });
  } catch (e) { responderErro(res, e); }
};

// POST /api/exames/:id/pagamentos/lote { ids, forma, data? } — quita o saldo da taxa
const pagarEmMassa = async (req, res) => {
  try {
    const ids = lerIds(req.body);
    const forma = umDe(req.body.forma, FORMAS, 'Forma');
    const data = req.body.data || dataLocalISO();
    if (!ehData(data) || data > dataLocalISO()) throw new ErroRegra(400, 'Data do pagamento inválida');
    const registrados = await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction });
      exigirNaoCancelado(exame);
      let n = 0;
      for (const id of ids) {
        const p = await carregarCandidato(exame, permitidos, id, { transaction });
        if (p.status_inscricao === 'desistiu') continue;
        p.Pagamentos = await ExamePagamento.findAll({ where: { exame_participante_id: p.id }, transaction });
        const { saldo } = resumoFinanceiro(p, exame, dataLocalISO()).taxa;
        if (saldo <= 0) continue;
        await ExamePagamento.create({
          escola_id: exame.escola_id, exame_participante_id: p.id, referente: 'taxa', data, valor: saldo, forma, registrado_por: req.usuario.id,
        }, { transaction });
        await historico(req, exame, p, 'pagamento', `Recebido ${moeda(saldo)} (taxa, ${forma})`, { transaction });
        n += 1;
      }
      return n;
    });
    res.status(201).json({ registrados });
  } catch (e) { responderErro(res, e); }
};

// DELETE /api/exames/:id/pagamentos/:pagamento_id { motivo } — estorno (RN-11)
const estornarPagamento = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction });
      const pag = await ExamePagamento.findOne({ where: { id: req.params.pagamento_id, escola_id: exame.escola_id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!pag) throw new ErroRegra(404, 'Pagamento não encontrado');
      const p = await carregarCandidato(exame, permitidos, pag.exame_participante_id, { transaction });
      if (pag.estornado_em) throw new ErroRegra(409, 'Pagamento já estornado');
      const motivo = texto(req.body.motivo);
      if (!motivo) throw new ErroRegra(400, 'Informe o motivo do estorno');
      await pag.update({ estornado_em: new Date(), estornado_por: req.usuario.id, motivo_estorno: motivo }, { transaction });
      await historico(req, exame, p, 'pagamento', `Estornado ${moeda(pag.valor)} (${pag.referente}): ${motivo}`, { transaction });
    });
    res.json({ ok: true });
  } catch (e) { responderErro(res, e); }
};

// PUT /api/exames/:id/pedidos-faixa/:pid
const salvarPedido = async (req, res) => {
  try {
    const b = req.body;
    await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction });
      exigirNaoCancelado(exame);
      const p = await carregarCandidato(exame, permitidos, req.params.pid, { transaction });
      let ped = await ExamePedidoFaixa.findOne({ where: { exame_participante_id: p.id }, transaction });
      const base = ped ? ped.toJSON() : { quer_comprar: 'sem_resposta', faixa_id: p.faixa_pretendida_id, tamanho: null, tipo: null, valor: null, entregue: false, entregue_em: null };
      const n = { ...base };
      if (tem(b, 'quer_comprar')) n.quer_comprar = umDe(b.quer_comprar, ['sim', 'nao', 'sem_resposta'], 'Quer comprar');
      if (tem(b, 'tamanho')) n.tamanho = texto(b.tamanho, 30);
      const tipos = exame.tipos_faixa || [];
      let precoTipo = null;
      if (tem(b, 'tipo')) {
        n.tipo = texto(b.tipo, 60);
        const t = tipos.find((x) => x.nome === n.tipo);
        // tipo já gravado continua valendo mesmo que saia da lista do exame
        if (n.tipo && !t && n.tipo !== base.tipo) throw new ErroRegra(400, 'Tipo de faixa inválido');
        precoTipo = t ? t.preco : null;
        if (n.tipo !== base.tipo && precoTipo != null && !tem(b, 'valor')) n.valor = precoTipo;
      }
      if (tem(b, 'valor')) n.valor = dinheiro(b.valor, 'Valor da faixa');
      if (tem(b, 'faixa_id')) {
        n.faixa_id = b.faixa_id || p.faixa_pretendida_id;
        if (!(await Faixa.count({ where: { id: n.faixa_id, arte_marcial_id: exame.arte_marcial_id }, transaction }))) throw new ErroRegra(400, 'Faixa inválida');
      }
      if (n.quer_comprar === 'sim') {
        if (tem(b, 'quer_comprar') && tipos.length && !n.tipo) throw new ErroRegra(400, 'Escolha o tipo da faixa');
        if (n.valor == null) n.valor = precoTipo ?? exame.preco_faixa_padrao;
        if (!n.tamanho) throw new ErroRegra(400, 'Informe o tamanho da faixa');
        if (n.valor == null) throw new ErroRegra(400, 'Informe o valor da faixa');
      }
      if (tem(b, 'entregue')) {
        n.entregue = !!b.entregue;
        n.entregue_em = n.entregue ? (base.entregue_em || dataLocalISO()) : null;
      }
      if (n.entregue && n.quer_comprar !== 'sim') throw new ErroRegra(409, 'Faixa já entregue: desmarque a entrega antes');
      const dados = {
        quer_comprar: n.quer_comprar, faixa_id: n.faixa_id, tamanho: n.tamanho, tipo: n.tipo, valor: n.valor, entregue: n.entregue, entregue_em: n.entregue_em,
      };
      if (ped) await ped.update(dados, { transaction });
      else ped = await ExamePedidoFaixa.create({ escola_id: exame.escola_id, exame_participante_id: p.id, ...dados }, { transaction });
      const entregaMudou = !!base.entregue !== n.entregue;
      await historico(req, exame, p, 'pedido_faixa', entregaMudou
        ? (n.entregue ? 'Faixa entregue' : 'Entrega da faixa desmarcada')
        : n.quer_comprar === 'sim' ? `Quer comprar faixa${n.tipo ? ` ${n.tipo}` : ''}, tamanho ${n.tamanho}, ${moeda(n.valor)}` : n.quer_comprar === 'nao' ? 'Não quer comprar faixa' : 'Pedido de faixa sem resposta', { transaction });
    });
    res.json({ ok: true });
  } catch (e) { responderErro(res, e); }
};

// POST /api/exames/:id/resultado { exame_participante_id, resultado: aprovado|nao_aprovado|null }
// Único caminho pra graduar um candidato (RN-13). Aprovar é definitivo.
const gravarResultado = async (req, res) => {
  try {
    const resultado = req.body.resultado || null;
    if (resultado) umDe(resultado, ['aprovado', 'nao_aprovado'], 'Resultado');
    await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction });
      exigirNaoCancelado(exame);
      if (exame.tipo !== 'normal') throw new ErroRegra(409, 'Roteiro Padrão não tem resultado');
      const p = await carregarCandidato(exame, permitidos, req.body.exame_participante_id || '', { transaction });
      if (p.graduacao_aluno_id) throw new ErroRegra(409, 'Candidato já graduado por este exame');
      if (p.status_inscricao === 'desistiu') throw new ErroRegra(409, 'Candidato desistiu do exame');
      if (p.presenca === 'ausente' && resultado) throw new ErroRegra(409, 'Candidato marcado como ausente');

      if (resultado !== 'aprovado') {
        await p.update({ resultado }, { transaction });
        await historico(req, exame, p, 'resultado', resultado ? 'Não aprovado' : 'Resultado desmarcado', { transaction });
        return;
      }

      let nota = null;
      if (exame.usa_avaliacao) {
        const total = await FaseExame.count({ where: { exame_id: exame.id }, transaction });
        const avs = await AvaliacaoAluno.findAll({ where: { exame_participante_id: p.id, status: 'finalizada' }, attributes: ['nota'], transaction });
        if (!total || avs.length !== total) throw new ErroRegra(409, `Avaliação incompleta: ${avs.length} de ${total} fases finalizadas`);
        nota = calcularNotaFinal(avs.map((a) => Number(a.nota)));
      }

      // externo: o resultado fica só no exame (não há aluno pra graduar)
      if (!p.aluno_id) {
        await p.update({ resultado: 'aprovado', presenca: 'presente' }, { transaction });
        await historico(req, exame, p, 'resultado', `Aprovado (externo)${nota != null ? `, nota ${nota}` : ''}`, { transaction });
        return;
      }

      const ind = p.indicacao_exame_id && await IndicacaoExame.findOne({
        where: { id: p.indicacao_exame_id, escola_id: exame.escola_id }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!ind) throw new ErroRegra(409, 'Candidato sem indicação: remova e inclua de novo na lista');
      if (ind.status !== 'indicado') throw new ErroRegra(409, 'A indicação deste aluno já foi aprovada fora do exame');
      const outro = await candidatoEmExameAberto(ind.id, { exceto_exame_id: exame.id, transaction });
      if (outro) throw new ErroRegra(409, `O aluno já é candidato do exame "${outro.Exame.nome}"`);
      const [atual, pretendida] = await Promise.all([
        GraduacaoAluno.findOne({ where: { escola_id: exame.escola_id, aluno_id: p.aluno_id, arte_marcial_id: exame.arte_marcial_id, atual: true }, include: [Faixa], transaction }),
        Faixa.findByPk(p.faixa_pretendida_id, { transaction }),
      ]);
      if (atual?.Faixa && atual.Faixa.ordem >= pretendida.ordem) throw new ErroRegra(409, `O aluno já está na faixa ${atual.Faixa.nome}`);

      const grad = await registrarGraduacao({
        escola_id: exame.escola_id, aluno_id: p.aluno_id, arte_marcial_id: exame.arte_marcial_id,
        faixa_id: p.faixa_pretendida_id, data_inicio: exame.data, atual: true,
        observacao: texto(`Aprovado no exame: ${exame.nome}`.slice(0, 255)),
        exame_participante_id: p.id, nota_exame: nota,
      }, { transaction });
      await ind.update({ status: 'aprovado', data_aprovacao: exame.data, graduacao_id: grad.id }, { transaction });
      await p.update({ resultado: 'aprovado', presenca: 'presente', graduacao_aluno_id: grad.id }, { transaction });
      await historico(req, exame, p, 'resultado', `Aprovado: ${pretendida.nome}${nota != null ? `, nota ${nota}` : ''}`, { transaction });
    });
    res.json({ ok: true });
  } catch (e) { responderErro(res, e); }
};

// GET /api/exames/:id/historico?candidato_id=
const listarHistorico = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    const where = { exame_id: exame.id, escola_id: exame.escola_id };
    if (req.query.candidato_id) {
      await carregarCandidato(exame, permitidos, req.query.candidato_id);
      where.exame_participante_id = req.query.candidato_id;
    } else if (permitidos) throw new ErroRegra(403, 'Só o administrador vê o histórico do exame inteiro');
    const hs = await ExameHistorico.findAll({
      where, include: [{ model: Usuario, as: 'Usuario', attributes: ['nome'] }], order: [['created_at', 'DESC']], limit: 300,
    });
    res.json(hs.map((h) => ({ id: h.id, tipo: h.tipo, descricao: h.descricao, usuario: h.Usuario?.nome || null, em: h.createdAt || h.created_at })));
  } catch (e) { responderErro(res, e); }
};

// Colunas da lista de exames: nº de candidatos e % recebido
const resumosDosExames = async (exames, permitidosPorArte) => {
  const ps = await ExameParticipante.findAll({ where: { exame_id: exames.map((e) => e.id) }, include: includeFinanceiro });
  const hoje = dataLocalISO();
  return new Map(exames.map((e) => {
    const permitidos = permitidosPorArte.get(e.arte_marcial_id);
    const linhas = ps.filter((p) => p.exame_id === e.id && (!permitidos || permitidos.has(p.aluno_id))).map((p) => ({
      status_inscricao: p.status_inscricao, quer_comprar: p.PedidoFaixa?.quer_comprar, financeiro: resumoFinanceiro(p, e, hoje),
    }));
    const t = totaisDoExame(linhas);
    const previsto = t.taxa.previsto + t.faixa.previsto;
    return [e.id, {
      candidatos: t.inscritos,
      percentual_recebido: previsto > 0 ? Math.round(((previsto - t.taxa.pendente - t.faixa.pendente) / previsto) * 100) : null,
    }];
  }));
};

module.exports = {
  atualizarGestao, listarCandidatos, listarElegiveis, incluirCandidatos, atualizarCandidato, atualizarEmMassa, removerCandidato,
  registrarPagamento, pagarEmMassa, estornarPagamento, salvarPedido, gravarResultado, listarHistorico,
  incluirExterno, atualizarExterno, lerGestao, resumosDosExames, tiposDoExameAnterior,
};
