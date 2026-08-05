const { ArteMarcial, Faixa } = require('../models');

const listar = async (req, res) => {
  try {
    const artes = await ArteMarcial.findAll({
      where: { escola_id: req.usuario.escola_id },
      include: [{ model: Faixa, attributes: ['id', 'nome', 'cor', 'cor_secundaria', 'ordem'], order: [['ordem', 'ASC']] }],
      order: [['nome', 'ASC']],
    });
    res.json(artes);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const arte = await ArteMarcial.findOne({
      where: { id: req.params.id, escola_id: req.usuario.escola_id },
      include: [{ model: Faixa, order: [['ordem', 'ASC']] }],
    });
    if (!arte) return res.status(404).json({ erro: 'Arte marcial não encontrada' });
    res.json(arte);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const arte = await ArteMarcial.create({ ...req.body, escola_id: req.usuario.escola_id });
    res.status(201).json(arte);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const arte = await ArteMarcial.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!arte) return res.status(404).json({ erro: 'Arte marcial não encontrada' });
    await arte.update(req.body);
    res.json(arte);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const arte = await ArteMarcial.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!arte) return res.status(404).json({ erro: 'Arte marcial não encontrada' });
    await arte.destroy();
    res.json({ mensagem: 'Arte marcial removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, buscar, criar, atualizar, remover };
