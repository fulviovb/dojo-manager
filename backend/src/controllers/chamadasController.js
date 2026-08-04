const { Chamada, Aula, Usuario, MatriculaAluno, Turma } = require('../models');
const { ehDonoDaTurma } = require('../middleware/autorizacao');

// GET /api/chamadas?aula_id=xxx — lista chamadas de uma aula
const listar = async (req, res) => {
  try {
    const { aula_id } = req.query;
    if (!aula_id) return res.status(400).json({ erro: 'aula_id é obrigatório' });

    const chamadas = await Chamada.findAll({
      where: { aula_id },
      include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'foto_url'] }],
    });

    // Alunos matriculados sem chamada = ausentes
    const aula = await Aula.findByPk(aula_id, { include: [{ model: Turma }] });
    if (!aula) return res.status(404).json({ erro: 'Aula não encontrada' });
    if (!ehDonoDaTurma(req.usuario, aula.Turma)) return res.status(403).json({ erro: 'Acesso negado a esta aula' });

    const matriculas = await MatriculaAluno.findAll({
      where: { turma_id: aula.turma_id, ativa: true },
      include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'foto_url'] }],
    });

    const presentes = chamadas.map((c) => c.aluno_id);
    const ausentes = matriculas
      .filter((m) => !presentes.includes(m.aluno_id))
      .map((m) => ({ id: m.Aluno.id, nome: m.Aluno.nome, foto_url: m.Aluno.foto_url }));

    res.json({ aula, chamadas, ausentes });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/chamadas — professor lança presença manualmente
const criar = async (req, res) => {
  try {
    const { aula_id, aluno_id } = req.body;
    const aula = await Aula.findByPk(aula_id, { include: [{ model: Turma }] });
    if (!aula) return res.status(404).json({ erro: 'Aula não encontrada' });
    if (!ehDonoDaTurma(req.usuario, aula.Turma)) return res.status(403).json({ erro: 'Acesso negado a esta aula' });

    const [chamada, criada] = await Chamada.findOrCreate({
      where: { aula_id, aluno_id },
      defaults: { origem: 'professor', validado_por: req.usuario.id },
    });
    res.status(criada ? 201 : 200).json({ sucesso: true, novo: criada, chamada });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// PUT /api/chamadas/:id/validar — professor valida check-in do aluno
const validar = async (req, res) => {
  try {
    const chamada = await Chamada.findByPk(req.params.id, {
      include: [{ model: Aula, include: [{ model: Turma }] }],
    });
    if (!chamada) return res.status(404).json({ erro: 'Chamada não encontrada' });
    if (!ehDonoDaTurma(req.usuario, chamada.Aula.Turma)) return res.status(403).json({ erro: 'Acesso negado a esta chamada' });
    await chamada.update({ validado_por: req.usuario.id });
    res.json(chamada);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/chamadas/fechar/:aula_id — fecha a aula (muda status para 'fechada')
const fecharAula = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.aula_id, { include: [{ model: Turma }] });
    if (!aula) return res.status(404).json({ erro: 'Aula não encontrada' });
    if (!ehDonoDaTurma(req.usuario, aula.Turma)) return res.status(403).json({ erro: 'Acesso negado a esta aula' });
    await aula.update({ status: 'fechada' });

    // Fechar a aula É o ato de validação: qualquer check-in feito por QR Code
    // que ainda não tinha sido revisado individualmente vira confirmado aqui.
    // O professor já teve a chance de remover presenças incorretas antes de fechar.
    await Chamada.update(
      { validado_por: req.usuario.id },
      { where: { aula_id: aula.id, validado_por: null } }
    );

    // Atualiza contador de aulas_desde_graduacao dos presentes.
    // Sequencial (não Promise.all): vários UPDATEs concorrentes na mesma
    // tabela causavam deadlock no MySQL quando a turma tinha muitos presentes.
    const chamadas = await Chamada.findAll({ where: { aula_id: aula.id } });
    for (const c of chamadas) {
      await MatriculaAluno.increment('aulas_desde_graduacao', {
        where: { aluno_id: c.aluno_id, turma_id: aula.turma_id, ativa: true },
      });
    }

    res.json({ mensagem: 'Aula fechada', aula_id: aula.id, presentes: chamadas.length });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// DELETE /api/chamadas/:id — remove chamada
const remover = async (req, res) => {
  try {
    const chamada = await Chamada.findByPk(req.params.id);
    if (!chamada) return res.status(404).json({ erro: 'Chamada não encontrada' });
    await chamada.destroy();
    res.json({ mensagem: 'Chamada removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, validar, fecharAula, remover };
