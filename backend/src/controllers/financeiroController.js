const { Op } = require('sequelize');
const { PlanoMensalidade, AssinaturaAluno, Mensalidade, Pagamento, Usuario, Escola } = require('../models');
const { gerarFaturasPendentes } = require('../services/faturaService');
const { dataLocalISO } = require('../utils/data');

// ─── PLANOS ──────────────────────────────────────────────────────────────────

const listarPlanos = async (req, res) => {
  try {
    const where = { escola_id: req.usuario.escola_id };
    if (req.query.todos !== 'true') where.ativo = true;
    const planos = await PlanoMensalidade.findAll({ where, order: [['valor', 'ASC']] });
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

// ─── MENSALIDADES (Faturas) ───────────────────────────────────────────────────

const listarMensalidades = async (req, res) => {
  try {
    await gerarFaturasPendentes(req.usuario.escola_id);

    const { aluno_id, status, ano, vencida } = req.query;
    const hoje = dataLocalISO(new Date());
    const where = {};
    if (aluno_id) where.aluno_id = aluno_id;
    if (status) where.status = status;

    const filtrosVencimento = {};
    if (ano) Object.assign(filtrosVencimento, { [Op.gte]: `${ano}-01-01`, [Op.lte]: `${ano}-12-31` });
    if (vencida === 'true') { where.status = 'pendente'; Object.assign(filtrosVencimento, { [Op.lt]: hoje }); }
    if (vencida === 'false') { where.status = 'pendente'; Object.assign(filtrosVencimento, { [Op.gte]: hoje }); }
    if (Object.keys(filtrosVencimento).length) where.data_vencimento = filtrosVencimento;

    const mensalidades = await Mensalidade.findAll({
      where,
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'foto_url'], where: { escola_id: req.usuario.escola_id } },
        { model: PlanoMensalidade, as: 'Plano', attributes: ['id', 'nome', 'valor', 'periodicidade'] },
        { model: Pagamento, attributes: ['id', 'valor_pago', 'data_pagamento', 'forma_pagamento'] },
      ],
      order: [['data_vencimento', 'DESC']],
    });
    res.json(mensalidades);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const criarMensalidade = async (req, res) => {
  try {
    const { data_vencimento, mes_referencia } = req.body;
    const mensalidade = await Mensalidade.create({
      ...req.body,
      data_vencimento: data_vencimento || mes_referencia,
    });
    res.status(201).json(mensalidade);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const buscarMensalidadeDaEscola = async (id, escola_id) => {
  return Mensalidade.findOne({
    where: { id },
    include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'email'], where: { escola_id } }],
  });
};

const atualizarMensalidade = async (req, res) => {
  try {
    const m = await buscarMensalidadeDaEscola(req.params.id, req.usuario.escola_id);
    if (!m) return res.status(404).json({ erro: 'Mensalidade não encontrada' });
    await m.update(req.body);
    res.json(m);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const cancelarMensalidade = async (req, res) => {
  try {
    const m = await buscarMensalidadeDaEscola(req.params.id, req.usuario.escola_id);
    if (!m) return res.status(404).json({ erro: 'Mensalidade não encontrada' });
    await m.update({ status: 'cancelado' });
    res.json(m);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const reciboMensalidade = async (req, res) => {
  try {
    const m = await Mensalidade.findOne({
      where: { id: req.params.id },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'escola_id'], where: { escola_id: req.usuario.escola_id } },
        { model: PlanoMensalidade, as: 'Plano', attributes: ['id', 'nome', 'periodicidade'] },
        { model: Pagamento, order: [['data_pagamento', 'DESC']] },
      ],
    });
    if (!m || m.status !== 'pago') return res.status(404).json({ erro: 'Fatura paga não encontrada' });
    const escola = await Escola.findByPk(req.usuario.escola_id);
    const pagamento = m.Pagamentos?.[0];

    res.json({
      numero: m.id.slice(0, 8).toUpperCase(),
      aluno_nome: m.Aluno.nome,
      valor_pago: pagamento?.valor_pago ?? m.valor,
      data_vencimento: m.data_vencimento,
      data_pagamento: pagamento?.data_pagamento,
      forma_pagamento: pagamento?.forma_pagamento,
      plano_nome: m.Plano?.nome || 'Fatura avulsa',
      periodicidade: m.Plano?.periodicidade || null,
      escola_nome: escola?.nome || '',
      escola_assinatura_url: escola?.assinatura_url || null,
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// ─── PAGAMENTOS ───────────────────────────────────────────────────────────────

const listarPagamentos = async (req, res) => {
  try {
    const { mensalidade_id, aluno_id } = req.query;
    const where = {};
    if (mensalidade_id) where.mensalidade_id = mensalidade_id;
    const mensalidadeWhere = aluno_id ? { aluno_id } : undefined;
    const pagamentos = await Pagamento.findAll({
      where,
      include: [{
        model: Mensalidade,
        where: mensalidadeWhere,
        include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome'], where: { escola_id: req.usuario.escola_id } }],
      }],
      order: [['data_pagamento', 'DESC']],
    });
    res.json(pagamentos);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const registrarPagamento = async (req, res) => {
  try {
    const { mensalidade_id, valor_pago, data_pagamento, forma_pagamento, observacao, juros, desconto } = req.body;
    const mensalidade = await buscarMensalidadeDaEscola(mensalidade_id, req.usuario.escola_id);
    if (!mensalidade) return res.status(404).json({ erro: 'Mensalidade não encontrada' });

    if (juros !== undefined || desconto !== undefined) {
      await mensalidade.update({
        ...(juros !== undefined ? { juros } : {}),
        ...(desconto !== undefined ? { desconto } : {}),
      });
    }

    const pagamento = await Pagamento.create({ mensalidade_id, valor_pago, data_pagamento, forma_pagamento, observacao });
    await mensalidade.update({ status: 'pago' });

    res.status(201).json(pagamento);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const desfazerPagamento = async (req, res) => {
  try {
    const pagamento = await Pagamento.findOne({
      where: { id: req.params.id },
      include: [{ model: Mensalidade, include: [{ model: Usuario, as: 'Aluno', attributes: ['escola_id'], where: { escola_id: req.usuario.escola_id } }] }],
    });
    if (!pagamento) return res.status(404).json({ erro: 'Pagamento não encontrado' });
    const mensalidade = pagamento.Mensalidade;
    await pagamento.destroy();
    await mensalidade.update({ status: 'pendente' });
    res.json({ mensagem: 'Pagamento desfeito', mensalidade });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// ─── PAINEL FINANCEIRO ────────────────────────────────────────────────────────

const painel = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    await gerarFaturasPendentes(escola_id);

    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const hoje = dataLocalISO(new Date());
    const hojeDate = new Date();
    const mesAtualISO = dataLocalISO(hojeDate).slice(0, 7);
    const mesPassadoDate = new Date(hojeDate.getFullYear(), hojeDate.getMonth() - 1, 1);
    const mesPassadoISO = dataLocalISO(mesPassadoDate).slice(0, 7);

    const todasFaturas = await Mensalidade.findAll({
      include: [
        { model: Usuario, as: 'Aluno', attributes: [], where: { escola_id } },
        { model: Pagamento, attributes: ['valor_pago', 'data_pagamento'] },
      ],
    });

    let em_aberto = 0, vencidas = 0, ganhos_mes_atual = 0, ganhos_mes_passado = 0;
    let total_ganho = 0, pagasNoPrazo = 0, pagasEmAtraso = 0;
    const serie = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, ganhos: 0, a_receber: 0 }));

    for (const f of todasFaturas) {
      if (f.status === 'pendente') {
        if (f.data_vencimento < hoje) vencidas++; else em_aberto++;
        if (f.data_vencimento?.slice(0, 4) === String(ano)) {
          const mesIdx = parseInt(f.data_vencimento.slice(5, 7)) - 1;
          serie[mesIdx].a_receber += parseFloat(f.valor) - parseFloat(f.desconto || 0) + parseFloat(f.juros || 0);
        }
      }
      if (f.status === 'pago') {
        const pagamento = f.Pagamentos?.[0];
        const valorPago = parseFloat(pagamento?.valor_pago || 0);
        total_ganho += valorPago;
        if (pagamento?.data_pagamento) {
          if (pagamento.data_pagamento > f.data_vencimento) pagasEmAtraso++; else pagasNoPrazo++;
          if (pagamento.data_pagamento.slice(0, 7) === mesAtualISO) ganhos_mes_atual += valorPago;
          if (pagamento.data_pagamento.slice(0, 7) === mesPassadoISO) ganhos_mes_passado += valorPago;
          if (pagamento.data_pagamento.slice(0, 4) === String(ano)) {
            const mesIdx = parseInt(pagamento.data_pagamento.slice(5, 7)) - 1;
            serie[mesIdx].ganhos += valorPago;
          }
        }
      }
    }

    const totalPagas = pagasNoPrazo + pagasEmAtraso;
    const pct_pagas_em_atraso = totalPagas > 0 ? Math.round((pagasEmAtraso / totalPagas) * 100) : 0;

    const [total_planos, total_assinaturas] = await Promise.all([
      PlanoMensalidade.count({ where: { escola_id, ativo: true } }),
      AssinaturaAluno.count({ where: { escola_id, status: 'ativa' } }),
    ]);

    res.json({
      ano,
      em_aberto, vencidas, ganhos_mes_atual, ganhos_mes_passado,
      total_faturas: todasFaturas.length,
      total_ganho, total_planos, total_assinaturas, pct_pagas_em_atraso,
      serie,
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = {
  listarPlanos, criarPlano, atualizarPlano, removerPlano,
  listarMensalidades, criarMensalidade, atualizarMensalidade, cancelarMensalidade, reciboMensalidade,
  listarPagamentos, registrarPagamento, desfazerPagamento,
  painel,
};
