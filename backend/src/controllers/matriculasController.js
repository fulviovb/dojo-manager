const { MatriculaAluno, Usuario, Turma, Faixa } = require('../models');

const listar = async (req, res) => {
  try {
    const { turma_id, aluno_id } = req.query;
    const where = { ativa: true };
    if (turma_id) where.turma_id = turma_id;
    if (aluno_id) where.aluno_id = aluno_id;
    const matriculas = await MatriculaAluno.findAll({
      where,
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'email'] },
        { model: Turma, attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor'] },
      ],
      order: [[{ model: Usuario, as: 'Aluno' }, 'nome', 'ASC']],
    });
    res.json(matriculas);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const { aluno_id, turma_id, graduacao_atual_faixa_id } = req.body;
    const [matricula, criada] = await MatriculaAluno.findOrCreate({
      where: { aluno_id, turma_id },
      defaults: {
        data_matricula: new Date(),
        ativa: true,
        graduacao_atual_faixa_id,
        aulas_desde_graduacao: 0,
      },
    });
    if (!criada) await matricula.update({ ativa: true });
    res.status(criada ? 201 : 200).json(matricula);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const matricula = await MatriculaAluno.findByPk(req.params.id);
    if (!matricula) return res.status(404).json({ erro: 'Matrícula não encontrada' });
    await matricula.update(req.body);
    res.json(matricula);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const desativar = async (req, res) => {
  try {
    const matricula = await MatriculaAluno.findByPk(req.params.id);
    if (!matricula) return res.status(404).json({ erro: 'Matrícula não encontrada' });
    await matricula.update({ ativa: false });
    res.json({ mensagem: 'Matrícula cancelada' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, desativar };
