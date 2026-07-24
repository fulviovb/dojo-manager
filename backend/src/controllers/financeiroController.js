const { PlanoMensalidade, Mensalidade, Pagamento, Usuario } = require('../models');

// ─── PLANOS ──────────────────────────────────────────────────────────────────

const listarPlanos = async (req, res) => {
  try {
    const planos = await PlanoMensalidade.findAll({
      where: { escola_id: req.usuario.escola_id, ativo: true },
      order: [['valor', 'ASC']],
    });
    res.json(planos);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criarPlano = async (req, res) => {
  try {
    const plano = await PlanoMensalidade.create({ ...req.body, escola_id: req.usuario.escola_id });
    res.status(201).json(plano);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizarPlano = async (req, res) => {
  try {
    const plano = await PlanoMensalidade.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!plano) return res.status(404).json({ erro: 'Plano não encontrado' });
    await plano.update(req.body);
    res.json(plano);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const removerPlano = async (req, res) => {
  try {
    const plano = await PlanoMensalidade.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!plano) return res.status(404).json({ erro: 'Plano não encontrado' });
    await plano.update({ ativo: false });
    res.json({ mensagem: 'Plano desativado' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// ─── MENSALIDADES ─────────────────────────────────────────────────────────────

const listarMensalidades = async (req, res) => {
  try {
    const { aluno_id, status, mes } = req.query;
    const where = {};
    if (aluno_id) where.aluno_id = aluno_id;
    if (status) where.status = status;
    if (mes) where.mes_referencia = mes + '-01';
    const mensalidades = await Mensalidade.findAll({
      where,
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'], where: { escola_id: req.usuario.escola_id } },
        { model: PlanoMensalidade, as: 'Plano', attributes: ['id', 'nome', 'valor'] },
      ],
      order: [['mes_referencia', 'DESC']],
    });
    res.json(mensalidades);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criarMensalidade = async (req, res) => {
  try {
    const mensalidade = await Mensalidade.create(req.body);
    res.status(201).json(mensalidade);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizarMensalidade = async (req, res) => {
  try {
    const m = await Mensalidade.findByPk(req.params.id, {
      include: [{ model: Usuario, as: 'Aluno', attributes: ['escola_id'] }],
    });
    if (!m || m.Aluno.escola_id !== req.usuario.escola_id) return res.status(404).json({ erro: 'Mensalidade não encontrada' });
    await m.update(req.body);
    res.json(m);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// ─── PAGAMENTOS ───────────────────────────────────────────────────────────────

const listarPagamentos = async (req, res) => {
  try {
    const { mensalidade_id } = req.query;
    const where = {};
    if (mensalidade_id) where.mensalidade_id = mensalidade_id;
    const pagamentos = await Pagamento.findAll({
      where,
      include: [{ model: Mensalidade, include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] }] }],
      order: [['data_pagamento', 'DESC']],
    });
    res.json(pagamentos);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const registrarPagamento = async (req, res) => {
  try {
    const { mensalidade_id, valor_pago, data_pagamento, forma_pagamento, observacao } = req.body;
    const mensalidade = await Mensalidade.findByPk(mensalidade_id, {
      include: [{ model: Usuario, as: 'Aluno', attributes: ['escola_id'] }],
    });
    if (!mensalidade || mensalidade.Aluno.escola_id !== req.usuario.escola_id) return res.status(404).json({ erro: 'Mensalidade não encontrada' });

    const pagamento = await Pagamento.create({ mensalidade_id, valor_pago, data_pagamento, forma_pagamento, observacao });
    await mensalidade.update({ status: 'pago' });

    res.status(201).json(pagamento);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = {
  listarPlanos, criarPlano, atualizarPlano, removerPlano,
  listarMensalidades, criarMensalidade, atualizarMensalidade,
  listarPagamentos, registrarPagamento,
};
