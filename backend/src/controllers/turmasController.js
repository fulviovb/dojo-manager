const { Turma, ArteMarcial, Usuario, HorarioTurma, Sala } = require('../models');
const { ehDonoDaTurma } = require('../middleware/autorizacao');

const listar = async (req, res) => {
  try {
    const where = { escola_id: req.usuario.escola_id, ativa: true };
    if (req.usuario.role === 'professor') where.professor_id = req.usuario.id;

    const turmas = await Turma.findAll({
      where,
      include: [
        { model: ArteMarcial, attributes: ['id', 'nome'] },
        { model: Usuario, as: 'Professor', attributes: ['id', 'nome'] },
        { model: HorarioTurma, include: [{ model: Sala, attributes: ['id', 'nome'] }] },
      ],
      order: [['nome', 'ASC']],
    });
    res.json(turmas);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const turma = await Turma.findOne({
      where: { id: req.params.id, escola_id: req.usuario.escola_id },
      include: [
        { model: ArteMarcial },
        { model: Usuario, as: 'Professor', attributes: ['id', 'nome', 'email'] },
        { model: HorarioTurma, include: [{ model: Sala }] },
      ],
    });
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    if (!ehDonoDaTurma(req.usuario, turma)) return res.status(403).json({ erro: 'Acesso negado a esta turma' });
    res.json(turma);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const existente = await Turma.findOne({ where: { escola_id: req.usuario.escola_id, nome: req.body.nome } });
    if (existente) return res.status(409).json({ erro: 'Já existe uma turma com esse nome nesta escola' });
    const turma = await Turma.create({ ...req.body, escola_id: req.usuario.escola_id });
    res.status(201).json(turma);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const turma = await Turma.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    if (!ehDonoDaTurma(req.usuario, turma)) return res.status(403).json({ erro: 'Acesso negado a esta turma' });
    await turma.update(req.body);
    res.json(turma);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const turma = await Turma.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    await turma.update({ ativa: false });
    res.json({ mensagem: 'Turma desativada' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, buscar, criar, atualizar, remover };
