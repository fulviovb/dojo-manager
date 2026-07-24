const { Escola } = require('../models');

const listar = async (req, res) => {
  try {
    const escolas = await Escola.findAll({ where: { ativa: true }, order: [['nome', 'ASC']] });
    res.json(escolas);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const escola = await Escola.findByPk(req.params.id);
    if (!escola) return res.status(404).json({ erro: 'Escola não encontrada' });
    res.json(escola);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const escola = await Escola.create(req.body);
    res.status(201).json(escola);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const escola = await Escola.findByPk(req.params.id);
    if (!escola) return res.status(404).json({ erro: 'Escola não encontrada' });
    await escola.update(req.body);
    res.json(escola);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, buscar, criar, atualizar };
