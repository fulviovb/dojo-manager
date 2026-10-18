const { Op } = require('sequelize');
const { FichaEvolucaoInfantil, Turma, MatriculaAluno, Usuario, ArteMarcial } = require('../models');
const { ehDonoDaTurma } = require('../middleware/autorizacao');
const { NIVEIS, AREAS, MODELOS, MODELO_POR_SLUG, TEMATICAS } = require('../constants/evolucaoInfantil');

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_MES = /^\d{4}-\d{2}$/;
const MAX_TEXTO = 5000;
const MAX_REGISTROS = 50;

// Último dia do mês `mesesDepois` meses após o mês de `dataISO` (0 = o próprio mês).
const fimDoMes = (dataISO, mesesDepois = 0) => {
  const [y, m] = dataISO.split('-').map(Number);
  const d = new Date(Date.UTC(y, m + mesesDepois, 0));
  return d.toISOString().slice(0, 10);
};
const inicioDoMes = (dataISO) => `${dataISO.slice(0, 7)}-01`;

const texto = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_TEXTO) : '');

// Turmas que o usuário pode ver: admin vê todas da escola, professor só as dele.
const whereTurmasDoUsuario = (usuario) => {
  const where = { escola_id: usuario.escola_id, tipo: 'regular' };
  if (usuario.role === 'professor') where.professor_id = usuario.id;
  return where;
};

const carregarFichaPermitida = async (req, res) => {
  const ficha = await FichaEvolucaoInfantil.findOne({
    where: { id: req.params.id, escola_id: req.usuario.escola_id },
    include: [
      { model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'data_nascimento'] },
      { model: Usuario, as: 'Professor', attributes: ['id', 'nome'] },
      { model: Turma, attributes: ['id', 'nome', 'professor_id'] },
    ],
  });
  if (!ficha) { res.status(404).json({ erro: 'Ficha não encontrada' }); return null; }
  if (!ehDonoDaTurma(req.usuario, ficha.Turma)) { res.status(403).json({ erro: 'Acesso negado a esta turma' }); return null; }
  return ficha;
};

// Valida e limpa o corpo de uma ficha conforme o modelo do catálogo —
// só entram chaves que o modelo conhece, níveis 1..4 e datas coerentes
// com o tipo de período. Lança Error com mensagem pro usuário.
function normalizarFicha(modelo, body) {
  let dataInicio = body.data_inicio;
  if (modelo.periodo === 'mes' || modelo.periodo === 'trimestre') {
    if (RE_MES.test(dataInicio || '')) dataInicio = `${dataInicio}-01`;
    if (!RE_DATA.test(dataInicio || '')) throw new Error('Informe o mês');
    dataInicio = inicioDoMes(dataInicio);
  } else if (!RE_DATA.test(dataInicio || '')) {
    throw new Error('Informe a data');
  }

  let dataFim = null;
  if (modelo.periodo === 'mes') dataFim = fimDoMes(dataInicio);
  else if (modelo.periodo === 'trimestre') dataFim = fimDoMes(dataInicio, 2);
  else if (modelo.periodo === 'periodo' && body.data_fim) {
    if (!RE_DATA.test(body.data_fim)) throw new Error('Data final inválida');
    if (body.data_fim < dataInicio) throw new Error('A data final é anterior à inicial');
    dataFim = body.data_fim;
  }

  const niveis = {};
  if (modelo.tipo === 'escala') {
    for (const item of modelo.itens) {
      const v = Number(body.niveis?.[item.k]);
      if (Number.isInteger(v) && v >= 1 && v <= 4) niveis[item.k] = v;
    }
  }

  const textos = {};
  const chavesTexto = modelo.campos.map((c) => c.k);
  // Trimestral: uma observação por área, além dos campos gerais.
  if (modelo.tipo === 'trimestral') modelo.itens.forEach((a) => chavesTexto.push(`obs_${a.k}`));
  for (const k of chavesTexto) {
    const t = texto(body.textos?.[k]);
    if (t) textos[k] = t;
  }

  let blocos = null;
  if (modelo.tipo === 'metas') {
    const status = modelo.status_meta.map((s) => s.k);
    blocos = (Array.isArray(body.blocos) ? body.blocos : []).slice(0, modelo.max_metas).map((meta) => {
      const limpo = { status: status.includes(meta?.status) ? meta.status : null };
      modelo.campos_meta.forEach((c) => { limpo[c.k] = texto(meta?.[c.k]); });
      return limpo;
    });
  } else if (modelo.tipo === 'registro_livre') {
    blocos = (Array.isArray(body.blocos) ? body.blocos : []).slice(0, MAX_REGISTROS).map((reg) => {
      const limpo = { data: RE_DATA.test(reg?.data || '') ? reg.data : null };
      modelo.campos_registro.forEach((c) => { limpo[c.k] = texto(reg?.[c.k]); });
      return limpo;
    });
  }

  let dataRevisao = null;
  if (modelo.tem_data_revisao && body.data_revisao) {
    if (!RE_DATA.test(body.data_revisao)) throw new Error('Data da revisão inválida');
    dataRevisao = body.data_revisao;
  }

  return { data_inicio: dataInicio, data_fim: dataFim, data_revisao: dataRevisao, niveis, textos, blocos };
}

const modelos = (req, res) => res.json({ niveis: NIVEIS, areas: AREAS, modelos: MODELOS });

// Visão por turma: alunos com matrícula ativa nas turmas de educação
// infantil e, pro mês pedido, se já têm a ficha Mensal.
const turmas = async (req, res) => {
  try {
    const mes = RE_MES.test(req.query.mes || '') ? req.query.mes : new Date().toISOString().slice(0, 7);
    const lista = await Turma.findAll({
      where: { ...whereTurmasDoUsuario(req.usuario), ativa: true, educacao_infantil: true },
      include: [
        { model: ArteMarcial, attributes: ['id', 'nome'] },
        { model: Usuario, as: 'Professor', attributes: ['id', 'nome'] },
        {
          model: MatriculaAluno, where: { ativa: true }, required: false,
          include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'data_nascimento', 'foto_url'] }],
        },
      ],
      order: [['nome', 'ASC']],
    });

    const alunoIds = lista.flatMap((t) => t.MatriculaAlunos.map((m) => m.aluno_id));
    const fichas = alunoIds.length ? await FichaEvolucaoInfantil.findAll({
      where: { escola_id: req.usuario.escola_id, aluno_id: alunoIds, turma_id: lista.map((t) => t.id) },
      attributes: ['id', 'aluno_id', 'turma_id', 'modelo', 'data_inicio', 'updated_at'],
    }) : [];

    const resultado = lista.map((t) => ({
      id: t.id, nome: t.nome, arte_marcial: t.ArteMarcial?.nome, professor: t.Professor?.nome,
      alunos: t.MatriculaAlunos
        .map((m) => {
          const doAluno = fichas.filter((f) => f.aluno_id === m.aluno_id && f.turma_id === t.id);
          const mensal = doAluno.find((f) => f.modelo === 'mensal' && f.data_inicio.slice(0, 7) === mes);
          const ultima = doAluno.reduce((max, f) => (!max || f.data_inicio > max ? f.data_inicio : max), null);
          return {
            id: m.Aluno.id, nome: m.Aluno.nome, data_nascimento: m.Aluno.data_nascimento, foto_url: m.Aluno.foto_url,
            total_fichas: doAluno.length,
            tem_observacao_inicial: doAluno.some((f) => f.modelo === 'observacao_inicial'),
            fichas_no_mes: doAluno.filter((f) => f.data_inicio.slice(0, 7) === mes).length,
            mensal_id: mensal?.id || null,
            ultima_ficha: ultima,
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    }));
    res.json({ mes, turmas: resultado });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const listar = async (req, res) => {
  try {
    const { aluno_id, turma_id, modelo } = req.query;
    if (!aluno_id && !turma_id) return res.status(400).json({ erro: 'Informe aluno_id ou turma_id' });
    const where = { escola_id: req.usuario.escola_id };
    if (aluno_id) where.aluno_id = aluno_id;
    if (turma_id) where.turma_id = turma_id;
    if (modelo) where.modelo = modelo;
    const fichas = await FichaEvolucaoInfantil.findAll({
      where,
      include: [
        { model: Usuario, as: 'Professor', attributes: ['id', 'nome'] },
        { model: Turma, attributes: ['id', 'nome'], where: whereTurmasDoUsuario(req.usuario) },
      ],
      order: [['data_inicio', 'DESC'], ['created_at', 'DESC']],
    });
    res.json(fichas);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const ficha = await carregarFichaPermitida(req, res);
    if (ficha) res.json(ficha);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const modelo = MODELO_POR_SLUG[req.body.modelo];
    if (!modelo) return res.status(400).json({ erro: 'Modelo de ficha inválido' });

    const turma = await Turma.findOne({ where: { id: req.body.turma_id, escola_id: req.usuario.escola_id } });
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    if (!ehDonoDaTurma(req.usuario, turma)) return res.status(403).json({ erro: 'Acesso negado a esta turma' });

    // Matrícula inativa também vale — permite registrar fichas retroativas.
    const matricula = await MatriculaAluno.findOne({ where: { turma_id: turma.id, aluno_id: req.body.aluno_id } });
    if (!matricula) return res.status(400).json({ erro: 'O aluno não está matriculado nesta turma' });

    let dados;
    try { dados = normalizarFicha(modelo, req.body); } catch (e) { return res.status(400).json({ erro: e.message }); }

    // Uma Mensal por aluno/turma/mês — a Trimestral lê os níveis dela.
    if (modelo.slug === 'mensal') {
      const existente = await FichaEvolucaoInfantil.findOne({
        where: { escola_id: req.usuario.escola_id, aluno_id: req.body.aluno_id, turma_id: turma.id, modelo: 'mensal', data_inicio: dados.data_inicio },
      });
      if (existente) return res.status(409).json({ erro: 'Já existe ficha mensal deste aluno neste mês', ficha_id: existente.id });
    }

    const ficha = await FichaEvolucaoInfantil.create({
      ...dados,
      escola_id: req.usuario.escola_id,
      aluno_id: req.body.aluno_id,
      turma_id: turma.id,
      professor_id: req.usuario.id,
      modelo: modelo.slug,
    });
    res.status(201).json(ficha);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const ficha = await carregarFichaPermitida(req, res);
    if (!ficha) return;
    const modelo = MODELO_POR_SLUG[ficha.modelo];
    let dados;
    try { dados = normalizarFicha(modelo, req.body); } catch (e) { return res.status(400).json({ erro: e.message }); }
    if (modelo.slug === 'mensal' && dados.data_inicio !== ficha.data_inicio) {
      const existente = await FichaEvolucaoInfantil.findOne({
        where: { escola_id: ficha.escola_id, aluno_id: ficha.aluno_id, turma_id: ficha.turma_id, modelo: 'mensal', data_inicio: dados.data_inicio, id: { [Op.ne]: ficha.id } },
      });
      if (existente) return res.status(409).json({ erro: 'Já existe ficha mensal deste aluno neste mês', ficha_id: existente.id });
    }
    await ficha.update(dados);
    res.json(ficha);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const ficha = await carregarFichaPermitida(req, res);
    if (!ficha) return;
    await ficha.destroy();
    res.json({ mensagem: 'Ficha removida' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// Níveis das fichas Mensais do aluno, mês a mês — linha do tempo do perfil
// e grade da Trimestral (que não tem níveis próprios: lê os 3 meses daqui).
const evolucaoAluno = async (req, res) => {
  try {
    const mensais = await FichaEvolucaoInfantil.findAll({
      where: { escola_id: req.usuario.escola_id, aluno_id: req.params.aluno_id, modelo: 'mensal' },
      include: [{ model: Turma, attributes: [], where: whereTurmasDoUsuario(req.usuario) }],
      attributes: ['id', 'turma_id', 'data_inicio', 'niveis'],
      order: [['data_inicio', 'ASC']],
    });
    res.json({
      areas: AREAS,
      meses: mensais.map((f) => ({ id: f.id, turma_id: f.turma_id, mes: f.data_inicio.slice(0, 7), niveis: f.niveis || {} })),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// Sugestão de nível por área (Mensal/Resumo) = média arredondada dos itens
// das fichas temáticas daquela área no período. O professor confirma ou ajusta.
const sugestao = async (req, res) => {
  try {
    const { aluno_id, de, ate } = req.query;
    if (!aluno_id || !RE_DATA.test(de || '') || !RE_DATA.test(ate || '')) {
      return res.status(400).json({ erro: 'Informe aluno_id, de e ate (AAAA-MM-DD)' });
    }
    const tematicas = await FichaEvolucaoInfantil.findAll({
      where: {
        escola_id: req.usuario.escola_id, aluno_id,
        modelo: TEMATICAS.map((t) => t.slug),
        data_inicio: { [Op.between]: [de, ate] },
      },
      include: [{ model: Turma, attributes: [], where: whereTurmasDoUsuario(req.usuario) }],
      attributes: ['modelo', 'niveis'],
    });
    const somas = {};
    for (const f of tematicas) {
      const area = TEMATICAS.find((t) => t.slug === f.modelo).area;
      for (const v of Object.values(f.niveis || {})) {
        somas[area] = somas[area] || { soma: 0, n: 0, fichas: new Set() };
        somas[area].soma += v;
        somas[area].n += 1;
      }
      if (somas[area]) somas[area].fichas.add(f);
    }
    const niveis = {};
    const detalhe = {};
    for (const [area, s] of Object.entries(somas)) {
      niveis[area] = Math.round(s.soma / s.n);
      detalhe[area] = { media: Math.round((s.soma / s.n) * 10) / 10, fichas: s.fichas.size };
    }
    res.json({ niveis, detalhe, total_fichas: tematicas.length });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { modelos, turmas, listar, buscar, criar, atualizar, remover, evolucaoAluno, sugestao };
