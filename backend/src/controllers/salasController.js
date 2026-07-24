const { Sala } = require('../models');

const listar = async (req, res) => {
  try {
    const salas = await Sala.findAll({
      where: { escola_id: req.usuario.escola_id },
      order: [['nome', 'ASC']],
    });
    res.json(salas);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const sala = await Sala.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!sala) return res.status(404).json({ erro: 'Sala não encontrada' });
    res.json(sala);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const sala = await Sala.create({ ...req.body, escola_id: req.usuario.escola_id });
    res.status(201).json(sala);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const sala = await Sala.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!sala) return res.status(404).json({ erro: 'Sala não encontrada' });
    await sala.update(req.body);
    res.json(sala);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const sala = await Sala.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!sala) return res.status(404).json({ erro: 'Sala não encontrada' });
    await sala.destroy();
    res.json({ mensagem: 'Sala removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, buscar, criar, atualizar, remover };
