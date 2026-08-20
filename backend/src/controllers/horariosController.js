const { HorarioTurma, Turma, Sala } = require('../models');

const listar = async (req, res) => {
  try {
    const { turma_id } = req.query;
    const where = {};
    if (turma_id) where.turma_id = turma_id;
    const horarios = await HorarioTurma.findAll({
      where,
      include: [
        { model: Turma, attributes: ['id', 'nome'] },
        { model: Sala, attributes: ['id', 'nome'] },
      ],
      order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']],
    });
    res.json(horarios);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const turma = await Turma.findOne({ where: { id: req.body.turma_id, escola_id: req.usuario.escola_id } });
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    const horario = await HorarioTurma.create(req.body);
    res.status(201).json(horario);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const horario = await HorarioTurma.findByPk(req.params.id, { include: [{ model: Turma, attributes: ['escola_id'] }] });
    if (!horario || horario.Turma.escola_id !== req.usuario.escola_id) return res.status(404).json({ erro: 'Horário não encontrado' });
    await horario.update(req.body);
    res.json(horario);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const horario = await HorarioTurma.findByPk(req.params.id, { include: [{ model: Turma, attributes: ['escola_id'] }] });
    if (!horario || horario.Turma.escola_id !== req.usuario.escola_id) return res.status(404).json({ erro: 'Horário não encontrado' });
    await horario.destroy();
    res.json({ mensagem: 'Horário removido' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, remover };
