const { CriterioGraduacao, ArteMarcial, Faixa } = require('../models');

const listar = async (req, res) => {
  try {
    const criterios = await CriterioGraduacao.findAll({
      where: { escola_id: req.usuario.escola_id },
      include: [
        { model: ArteMarcial, attributes: ['id', 'nome'] },
        { model: Faixa, attributes: ['id', 'nome', 'cor', 'ordem'] },
      ],
      order: [[{ model: Faixa }, 'ordem', 'ASC']],
    });
    res.json(criterios);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const criterio = await CriterioGraduacao.create({ ...req.body, escola_id: req.usuario.escola_id });
    res.status(201).json(criterio);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const criterio = await CriterioGraduacao.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });
    await criterio.update(req.body);
    res.json(criterio);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const criterio = await CriterioGraduacao.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });
    await criterio.destroy();
    res.json({ mensagem: 'Critério removido' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, remover };
