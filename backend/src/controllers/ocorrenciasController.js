const { Ocorrencia, Usuario } = require('../models');

const listar = async (req, res) => {
  try {
    const { aluno_id } = req.query;
    const where = { escola_id: req.usuario.escola_id };
    if (aluno_id) where.aluno_id = aluno_id;
    const ocorrencias = await Ocorrencia.findAll({
      where,
      include: [{ model: Usuario, as: 'Professor', attributes: ['id', 'nome'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(ocorrencias);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const { aluno_id, texto } = req.body;
    const ocorrencia = await Ocorrencia.create({
      escola_id: req.usuario.escola_id,
      aluno_id,
      professor_id: req.usuario.id,
      texto,
    });
    const completo = await Ocorrencia.findByPk(ocorrencia.id, {
      include: [{ model: Usuario, as: 'Professor', attributes: ['id', 'nome'] }],
    });
    res.status(201).json(completo);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const o = await Ocorrencia.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!o) return res.status(404).json({ erro: 'Ocorrência não encontrada' });
    await o.destroy();
    res.json({ mensagem: 'Ocorrência removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, remover };
