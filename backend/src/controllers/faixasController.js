const { Faixa, ArteMarcial } = require('../models');

const listar = async (req, res) => {
  try {
    const { arte_marcial_id } = req.query;
    const where = {};
    if (arte_marcial_id) where.arte_marcial_id = arte_marcial_id;
    const faixas = await Faixa.findAll({ where, order: [['ordem', 'ASC']] });
    res.json(faixas);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const faixa = await Faixa.create(req.body);
    res.status(201).json(faixa);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const faixa = await Faixa.findByPk(req.params.id);
    if (!faixa) return res.status(404).json({ erro: 'Faixa não encontrada' });
    await faixa.update(req.body);
    res.json(faixa);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const faixa = await Faixa.findByPk(req.params.id);
    if (!faixa) return res.status(404).json({ erro: 'Faixa não encontrada' });
    await faixa.destroy();
    res.json({ mensagem: 'Faixa removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, remover };
