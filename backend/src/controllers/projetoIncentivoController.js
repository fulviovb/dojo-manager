const { Op } = require('sequelize');
const {
  ParticipanteIncentivo, EsporteIncentivo, Competicao, Conquista, ObjetivoIncentivo, CompeticaoPrevistaIncentivo,
  LocalTreinoIncentivo, LocalTreino, MatriculaAluno, Turma, HorarioTurma, Sala,
} = require('../models');
const { conquistasDo, LIMITE_CURRICULO, arteDoEsporte, montarCurriculo, montarFormulario, textoObjetivo, localDaSala, textoLocal, cepDoTexto } = require('../utils/textoProjeto');

// Formulário do projeto (tela "Projeto" do Sistema Incentivo online) +
// calendário de competições futuras (tabela `competicoes`, a mesma das
// Conquistas).

const NIVEIS = ['municipal', 'estadual', 'nacional', 'panamericano', 'mundial'];
const METAS = ['campeao', 'podio', 'top5', 'participar', 'livre'];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
// Projeto protocolado num ano é executado no ano seguinte (Resolução: protocolo
// out/2026, execução 2027) — objetivos e competições previstas só de lá pra frente.
const anoExecucao = () => new Date().getFullYear() + 1;
// Formulário da prefeitura aceita no máximo 5 objetivos.
const LIMITE_OBJETIVOS = 5;

const buscarParticipante = (id, escola_id) => ParticipanteIncentivo.findOne({
  where: { id, escola_id }, include: [{ model: EsporteIncentivo, as: 'Esporte', attributes: ['nome'] }],
});
const competicaoDaEscola = (id, escola_id) => (id ? Competicao.findOne({ where: { id, escola_id } }) : null);
const erro500 = (res, e) => { console.error(e); res.status(500).json({ erro: 'Erro interno' }); };

// ── Projeto do participante ────────────────────────────────────────────────

const buscar = async (req, res) => {
  try {
    const p = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!p) return res.status(404).json({ erro: 'Participante não encontrado' });
    const objetivos = await ObjetivoIncentivo.findAll({ where: { participante_id: p.id }, include: [{ model: Competicao }], order: [['ordem', 'ASC'], ['created_at', 'ASC']] });
    const previstas = await CompeticaoPrevistaIncentivo.findAll({ where: { participante_id: p.id }, include: [{ model: Competicao }] });
    const locais = await LocalTreinoIncentivo.findAll({ where: { participante_id: p.id }, include: [{ model: LocalTreino, as: 'Local' }], order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']] });
    res.json({
      curriculo_esportivo: p.curriculo_esportivo || '',
      objetivos: objetivos.map(o => ({ ...o.toJSON(), texto: textoObjetivo(o) })),
      competicoes_previstas: previstas,
      locais: locais.map(l => ({ ...l.toJSON(), texto_local: textoLocal(l) })),
      formulario: await montarFormulario(p),
    });
  } catch (e) { erro500(res, e); }
};

const sugerirCurriculo = async (req, res) => {
  try {
    const p = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!p) return res.status(404).json({ erro: 'Participante não encontrado' });
    res.json({ texto: (await montarCurriculo(p)) || '' });
  } catch (e) { erro500(res, e); }
};

const salvarCurriculo = async (req, res) => {
  try {
    const p = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!p) return res.status(404).json({ erro: 'Participante não encontrado' });
    const texto = String(req.body.texto || '').trim();
    if (texto.length > LIMITE_CURRICULO) return res.status(400).json({ erro: `Currículo com ${texto.length} caracteres — o formulário da prefeitura aceita no máximo ${LIMITE_CURRICULO}` });
    await p.update({ curriculo_esportivo: texto || null });
    res.json({ curriculo_esportivo: p.curriculo_esportivo || '' });
  } catch (e) { erro500(res, e); }
};

async function validarObjetivo(body, escola_id) {
  const meta = body.meta;
  if (!METAS.includes(meta)) throw new Error('Escolha a meta do objetivo');
  if (meta === 'livre') {
    const texto = String(body.texto_livre || '').trim();
    if (!texto) throw new Error('Escreva o objetivo');
    return { meta, texto_livre: texto, competicao_id: null, modalidade: null, categoria: null };
  }
  const competicao = await competicaoDaEscola(body.competicao_id, escola_id);
  if (!competicao) throw new Error('Escolha a competição (cadastre no Calendário se não estiver na lista)');
  if (competicao.ano < anoExecucao()) throw new Error(`Objetivo precisa ser em competição de ${anoExecucao()} em diante (ano de execução do projeto)`);
  const modalidade = String(body.modalidade || '').trim();
  if (meta !== 'participar' && !modalidade) throw new Error('Informe a modalidade/prova');
  return { meta, competicao_id: competicao.id, modalidade: modalidade || null, categoria: String(body.categoria || '').trim() || null, texto_livre: null };
}

const criarObjetivo = async (req, res) => {
  try {
    const p = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!p) return res.status(404).json({ erro: 'Participante não encontrado' });
    if (await ObjetivoIncentivo.count({ where: { participante_id: p.id } }) >= LIMITE_OBJETIVOS) {
      return res.status(400).json({ erro: `Limite de ${LIMITE_OBJETIVOS} objetivos atingido (máximo do formulário da prefeitura)` });
    }
    let dados;
    try { dados = await validarObjetivo(req.body, req.usuario.escola_id); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    const ordem = (await ObjetivoIncentivo.max('ordem', { where: { participante_id: p.id } }) ?? -1) + 1;
    const o = await ObjetivoIncentivo.create({ ...dados, ordem, escola_id: p.escola_id, participante_id: p.id });
    res.status(201).json(o);
  } catch (e) { erro500(res, e); }
};

const atualizarObjetivo = async (req, res) => {
  try {
    const o = await ObjetivoIncentivo.findOne({ where: { id: req.params.objetivoId, participante_id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!o) return res.status(404).json({ erro: 'Objetivo não encontrado' });
    let dados;
    try { dados = await validarObjetivo(req.body, req.usuario.escola_id); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    await o.update(dados);
    res.json(o);
  } catch (e) { erro500(res, e); }
};

const removerObjetivo = async (req, res) => {
  try {
    const n = await ObjetivoIncentivo.destroy({ where: { id: req.params.objetivoId, participante_id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!n) return res.status(404).json({ erro: 'Objetivo não encontrado' });
    res.json({ mensagem: 'Objetivo removido' });
  } catch (e) { erro500(res, e); }
};

const adicionarPrevista = async (req, res) => {
  try {
    const p = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!p) return res.status(404).json({ erro: 'Participante não encontrado' });
    const c = await competicaoDaEscola(req.body.competicao_id, req.usuario.escola_id);
    if (!c) return res.status(400).json({ erro: 'Competição não encontrada' });
    if (c.ano < anoExecucao()) return res.status(400).json({ erro: `Competição prevista precisa ser de ${anoExecucao()} em diante (ano de execução do projeto)` });
    const [linha] = await CompeticaoPrevistaIncentivo.findOrCreate({
      where: { participante_id: p.id, competicao_id: c.id },
      defaults: { escola_id: p.escola_id, participante_id: p.id, competicao_id: c.id },
    });
    res.status(201).json(linha);
  } catch (e) { erro500(res, e); }
};

const removerPrevista = async (req, res) => {
  try {
    const n = await CompeticaoPrevistaIncentivo.destroy({ where: { id: req.params.previstaId, participante_id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!n) return res.status(404).json({ erro: 'Registro não encontrado' });
    res.json({ mensagem: 'Removida' });
  } catch (e) { erro500(res, e); }
};

async function validarLocal(body, escola_id) {
  const local = body.local_id ? await LocalTreino.findOne({ where: { id: body.local_id, escola_id } }) : null;
  const dia = Number(body.dia_semana);
  const ini = String(body.hora_inicio || '').slice(0, 5);
  const fim = String(body.hora_fim || '').slice(0, 5);
  if (!local) throw new Error('Escolha o local (cadastre na aba "Locais" se não estiver na lista)');
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) throw new Error('Escolha o dia da semana');
  if (!HORA.test(ini) || !HORA.test(fim)) throw new Error('Horários no formato HH:MM');
  if (fim <= ini) throw new Error('Hora final precisa ser depois da inicial');
  return { local_id: local.id, endereco: null, dia_semana: dia, hora_inicio: ini, hora_fim: fim };
}

const criarLocal = async (req, res) => {
  try {
    const p = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!p) return res.status(404).json({ erro: 'Participante não encontrado' });
    let dados;
    try { dados = await validarLocal(req.body, req.usuario.escola_id); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    res.status(201).json(await LocalTreinoIncentivo.create({ ...dados, escola_id: p.escola_id, participante_id: p.id }));
  } catch (e) { erro500(res, e); }
};

const removerLocal = async (req, res) => {
  try {
    const n = await LocalTreinoIncentivo.destroy({ where: { id: req.params.localId, participante_id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!n) return res.status(404).json({ erro: 'Local não encontrado' });
    res.json({ mensagem: 'Local removido' });
  } catch (e) { erro500(res, e); }
};

// Copia os horários das turmas ativas (regulares) em que o aluno está
// matriculado. Não duplica (mesmo endereço + dia + hora inicial).
const importarLocaisDasTurmas = async (req, res) => {
  try {
    const p = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!p) return res.status(404).json({ erro: 'Participante não encontrado' });
    if (!p.aluno_id) return res.status(400).json({ erro: 'Participante não está vinculado a um aluno da escola — cadastre os locais manualmente' });
    // Só turmas da arte do esporte do projeto (sem arte correspondente: todas).
    const arte = await arteDoEsporte(p);
    const matriculas = await MatriculaAluno.findAll({
      where: { aluno_id: p.aluno_id, ativa: true },
      include: [{
        model: Turma, where: { escola_id: req.usuario.escola_id, ativa: true, tipo: 'regular', ...(arte ? { arte_marcial_id: arte.id } : {}) },
        include: [{ model: HorarioTurma, include: [{ model: Sala }] }],
      }],
    });
    const existentes = await LocalTreinoIncentivo.findAll({ where: { participante_id: p.id } });
    const chave = (l, d, h) => `${l}|${d}|${String(h).slice(0, 5)}`;
    const ja = new Set(existentes.map(l => chave(l.local_id, l.dia_semana, l.hora_inicio)));
    let criados = 0; const semEndereco = new Set();
    for (const m of matriculas) {
      for (const h of m.Turma.HorarioTurmas || []) {
        // Local do cadastro ligado à sala; se ainda não existe, cria a partir
        // do nome da sala ("Nome\nEndereço") — sem endereço real, pula.
        let local = h.sala_id ? await LocalTreino.findOne({ where: { escola_id: p.escola_id, sala_id: h.sala_id } }) : null;
        if (!local) {
          const { nome, endereco } = localDaSala(h.Sala?.nome);
          if (!endereco) { semEndereco.add(nome || m.Turma.nome); continue; }
          local = await LocalTreino.create({ escola_id: p.escola_id, nome, endereco, cep: cepDoTexto(endereco), sala_id: h.sala_id });
        }
        if (ja.has(chave(local.id, h.dia_semana, h.hora_inicio))) continue;
        await LocalTreinoIncentivo.create({
          escola_id: p.escola_id, participante_id: p.id, local_id: local.id, dia_semana: h.dia_semana,
          hora_inicio: String(h.hora_inicio).slice(0, 5), hora_fim: String(h.hora_fim).slice(0, 5),
        });
        ja.add(chave(local.id, h.dia_semana, h.hora_inicio));
        criados++;
      }
    }
    const aviso = semEndereco.size ? ` — sem endereço cadastrado (cadastre na aba "Locais"): ${[...semEndereco].join(', ')}` : '';
    res.json({ criados, mensagem: (criados ? `${criados} horário(s) importado(s)` : 'Nenhum horário novo nas turmas do aluno') + aviso });
  } catch (e) { erro500(res, e); }
};

// Conquistas do participante nos anos válidos pra comprovante de resultado,
// já no formato dos campos do comprovante (sugestão de preenchimento).
const NIVEL_PARA_EVENTO = { municipal: 'outros', estadual: 'estadual', nacional: 'nacional', panamericano: 'internacional', mundial: 'internacional' };
const sugestoesResultado = async (req, res) => {
  try {
    const p = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!p) return res.status(404).json({ erro: 'Participante não encontrado' });
    const anoAtual = new Date().getFullYear();
    const lista = (await conquistasDo(p))
      .filter(c => c.Competicao && c.Competicao.ano >= anoAtual - 1)
      .sort((a, b) => (b.Competicao.ano - a.Competicao.ano) || (a.colocacao - b.colocacao))
      .map(c => ({
        id: c.id,
        rotulo: `${c.Competicao.ano} · ${c.colocacao}º ${c.modalidade}${c.categoria ? ` ${c.categoria}` : ''} · ${c.Competicao.nome}`,
        evento: NIVEL_PARA_EVENTO[c.Competicao.nivel] || 'outros',
        colocacao: c.colocacao, ano: c.Competicao.ano,
        competicao: [c.Competicao.nome, c.Competicao.etapa].filter(Boolean).join(' - '),
        entidade: c.Competicao.entidade || '',
      }));
    res.json(lista);
  } catch (e) { erro500(res, e); }
};

// ── Cadastro de locais de treino ───────────────────────────────────────────

const listarLocais = async (req, res) => {
  try {
    const where = { escola_id: req.usuario.escola_id };
    if (req.query.ativo !== 'todos') where.ativo = req.query.ativo === 'false' ? false : true;
    const locais = await LocalTreino.findAll({ where, order: [['nome', 'ASC']] });
    const usos = await LocalTreinoIncentivo.count({ where: { local_id: locais.map(l => l.id) }, group: ['local_id'] });
    const porId = Object.fromEntries(usos.map(u => [u.local_id, u.count]));
    res.json(locais.map(l => ({ ...l.toJSON(), usos: porId[l.id] || 0 })));
  } catch (e) { erro500(res, e); }
};

function validarCadastroLocal(body) {
  const nome = String(body.nome || '').trim();
  const endereco = String(body.endereco || '').trim();
  const cepDigitos = String(body.cep || '').replace(/\D/g, '');
  if (cepDigitos.length !== 8) throw new Error('Informe o CEP (8 dígitos) — é obrigatório no formulário da prefeitura');
  if (!nome) throw new Error('Informe o nome do local');
  if (!endereco) throw new Error('Informe o endereço completo');
  return { cep: `${cepDigitos.slice(0, 5)}-${cepDigitos.slice(5)}`, nome, endereco };
}

const criarCadastroLocal = async (req, res) => {
  try {
    let dados;
    try { dados = validarCadastroLocal(req.body); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    res.status(201).json(await LocalTreino.create({ ...dados, escola_id: req.usuario.escola_id }));
  } catch (e) { erro500(res, e); }
};

const atualizarCadastroLocal = async (req, res) => {
  try {
    const l = await LocalTreino.findOne({ where: { id: req.params.localTreinoId, escola_id: req.usuario.escola_id } });
    if (!l) return res.status(404).json({ erro: 'Local não encontrado' });
    let dados;
    try { dados = validarCadastroLocal(req.body); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    await l.update({ ...dados, ...(req.body.ativo !== undefined ? { ativo: !!req.body.ativo } : {}) });
    res.json(l);
  } catch (e) { erro500(res, e); }
};

const desativarCadastroLocal = async (req, res) => {
  try {
    const l = await LocalTreino.findOne({ where: { id: req.params.localTreinoId, escola_id: req.usuario.escola_id } });
    if (!l) return res.status(404).json({ erro: 'Local não encontrado' });
    await l.update({ ativo: false });
    res.json({ mensagem: 'Local desativado' });
  } catch (e) { erro500(res, e); }
};

// ── Calendário (competições futuras) ───────────────────────────────────────

function validarCompeticao(body) {
  const nome = String(body.nome || '').trim();
  const ano = Number(body.ano);
  if (!nome) throw new Error('Informe o nome da competição');
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) throw new Error('Ano inválido');
  if (!NIVEIS.includes(body.nivel)) throw new Error('Escolha o nível');
  const data = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null);
  const data_inicio = data(body.data_inicio); const data_fim = data(body.data_fim);
  if (data_inicio && data_fim && data_fim < data_inicio) throw new Error('Data final antes da inicial');
  const t = (v) => String(v || '').trim() || null;
  return {
    nome, ano, nivel: body.nivel, etapa: t(body.etapa), entidade: t(body.entidade), cidade: t(body.cidade),
    estado: t(body.estado)?.toUpperCase().slice(0, 2) || null, pais: t(body.pais) || 'Brasil',
    data_inicio, data_fim, periodo_texto: t(body.periodo_texto),
  };
}

const listarCalendario = async (req, res) => {
  try {
    const anoMin = Number(req.query.desde) || anoExecucao();
    const lista = await Competicao.findAll({
      where: { escola_id: req.usuario.escola_id, ano: { [Op.gte]: anoMin } },
      order: [['ano', 'ASC'], ['data_inicio', 'ASC'], ['nome', 'ASC']],
    });
    res.json(lista);
  } catch (e) { erro500(res, e); }
};

const criarCompeticao = async (req, res) => {
  try {
    let dados;
    try { dados = validarCompeticao(req.body); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    res.status(201).json(await Competicao.create({ ...dados, escola_id: req.usuario.escola_id }));
  } catch (e) { erro500(res, e); }
};

const atualizarCompeticao = async (req, res) => {
  try {
    const c = await Competicao.findOne({ where: { id: req.params.competicaoId, escola_id: req.usuario.escola_id } });
    if (!c) return res.status(404).json({ erro: 'Competição não encontrada' });
    let dados;
    try { dados = validarCompeticao(req.body); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    await c.update(dados);
    res.json(c);
  } catch (e) { erro500(res, e); }
};

const removerCompeticao = async (req, res) => {
  try {
    const c = await Competicao.findOne({ where: { id: req.params.competicaoId, escola_id: req.usuario.escola_id } });
    if (!c) return res.status(404).json({ erro: 'Competição não encontrada' });
    const usos = await ObjetivoIncentivo.count({ where: { competicao_id: c.id } })
      + await CompeticaoPrevistaIncentivo.count({ where: { competicao_id: c.id } })
      + await Conquista.count({ where: { competicao_id: c.id } });
    if (usos) return res.status(400).json({ erro: 'Competição em uso (objetivos, competições previstas ou conquistas) — remova os vínculos antes' });
    await c.destroy();
    res.json({ mensagem: 'Competição removida' });
  } catch (e) { erro500(res, e); }
};

module.exports = {
  buscar, sugerirCurriculo, salvarCurriculo, criarObjetivo, atualizarObjetivo, removerObjetivo,
  adicionarPrevista, removerPrevista, criarLocal, removerLocal, importarLocaisDasTurmas,
  listarCalendario, criarCompeticao, atualizarCompeticao, removerCompeticao,
  sugestoesResultado, listarLocais, criarCadastroLocal, atualizarCadastroLocal, desativarCadastroLocal,
};
