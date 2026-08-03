const { AssinaturaAluno, PlanoMensalidade, Usuario } = require('../models');
const { gerarFaturasPendentes, calcularPrimeiroVencimento, gerarFaturaAntecipada } = require('../services/faturaService');
const { dataLocalISO } = require('../utils/data');

const INCLUDE_PADRAO = [
  { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
  { model: PlanoMensalidade, as: 'Plano', attributes: ['id', 'nome', 'valor', 'periodicidade'] },
];

const listar = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    await gerarFaturasPendentes(escola_id);

    const { status, aluno_id } = req.query;
    const where = { escola_id };
    if (aluno_id) where.aluno_id = aluno_id;
    if (!status || status === 'todas') {
      // sem filtro de status
    } else {
      where.status = status;
    }

    const assinaturas = await AssinaturaAluno.findAll({
      where,
      include: INCLUDE_PADRAO,
      order: [['created_at', 'DESC']],
    });
    res.json(assinaturas);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { aluno_id, plano_id, dia_vencimento, data_inicio, observacao } = req.body;

    if (!(dia_vencimento >= 1 && dia_vencimento <= 31)) {
      return res.status(400).json({ erro: 'Dia de vencimento deve ser entre 1 e 31' });
    }

    const aluno = await Usuario.findOne({ where: { id: aluno_id, escola_id } });
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const plano = await PlanoMensalidade.findOne({ where: { id: plano_id, escola_id } });
    if (!plano) return res.status(404).json({ erro: 'Plano não encontrado' });

    const inicio = data_inicio || dataLocalISO(new Date());
    const proximo_vencimento = calcularPrimeiroVencimento(inicio, dia_vencimento);

    const assinatura = await AssinaturaAluno.create({
      escola_id, aluno_id, plano_id, dia_vencimento,
      data_inicio: inicio, proximo_vencimento, observacao,
    });

    await gerarFaturasPendentes(escola_id);

    const completa = await AssinaturaAluno.findByPk(assinatura.id, { include: INCLUDE_PADRAO });
    res.status(201).json(completa);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const buscarDaEscola = async (id, escola_id) => {
  return AssinaturaAluno.findOne({ where: { id, escola_id }, include: INCLUDE_PADRAO });
};

const atualizar = async (req, res) => {
  try {
    const assinatura = await buscarDaEscola(req.params.id, req.usuario.escola_id);
    if (!assinatura) return res.status(404).json({ erro: 'Assinatura não encontrada' });
    const { plano_id, dia_vencimento, observacao } = req.body;
    await assinatura.update({
      ...(plano_id !== undefined ? { plano_id } : {}),
      ...(dia_vencimento !== undefined ? { dia_vencimento } : {}),
      ...(observacao !== undefined ? { observacao } : {}),
    });
    res.json(assinatura);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const pausar = async (req, res) => {
  try {
    const assinatura = await buscarDaEscola(req.params.id, req.usuario.escola_id);
    if (!assinatura) return res.status(404).json({ erro: 'Assinatura não encontrada' });
    await assinatura.update({ status: 'pausada' });
    res.json(assinatura);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const reativar = async (req, res) => {
  try {
    const assinatura = await buscarDaEscola(req.params.id, req.usuario.escola_id);
    if (!assinatura) return res.status(404).json({ erro: 'Assinatura não encontrada' });
    const hoje = dataLocalISO(new Date());
    // Pula o período pausado: só recalcula o cursor se ele já tiver ficado
    // no passado; se ainda está no futuro, mantém (não houve atraso real).
    const proximo_vencimento = assinatura.proximo_vencimento <= hoje
      ? calcularPrimeiroVencimento(hoje, assinatura.dia_vencimento)
      : assinatura.proximo_vencimento;
    await assinatura.update({ status: 'ativa', proximo_vencimento });
    res.json(assinatura);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const finalizar = async (req, res) => {
  try {
    const assinatura = await buscarDaEscola(req.params.id, req.usuario.escola_id);
    if (!assinatura) return res.status(404).json({ erro: 'Assinatura não encontrada' });
    await assinatura.update({ status: 'finalizada' });
    res.json(assinatura);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const gerarFatura = async (req, res) => {
  try {
    const assinatura = await buscarDaEscola(req.params.id, req.usuario.escola_id);
    if (!assinatura) return res.status(404).json({ erro: 'Assinatura não encontrada' });
    if (assinatura.status !== 'ativa') return res.status(400).json({ erro: 'Assinatura não está ativa' });
    const { fatura, criada } = await gerarFaturaAntecipada(assinatura);
    res.status(criada ? 201 : 200).json({ fatura, criada });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, pausar, reativar, finalizar, gerarFatura };
