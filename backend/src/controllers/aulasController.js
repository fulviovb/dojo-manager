const { Op } = require('sequelize');
const { Aula, HorarioTurma, Turma, Sala, Chamada, MatriculaAluno } = require('../models');
const { ehDonoDaTurma } = require('../middleware/autorizacao');
const { dataLocalISO } = require('../utils/data');

// Gera Aulas para uma data baseando-se nos HorarioTurma do dia da semana.
// Retorna array com { aula, criada }.
const gerarAulasPorData = async (data) => {
  const date = data ? new Date(data + 'T00:00:00') : new Date();
  const dataStr = dataLocalISO(date);
  const diaSemana = date.getDay(); // 0=Dom ... 6=Sab

  const horarios = await HorarioTurma.findAll({ where: { dia_semana: diaSemana } });

  const resultados = await Promise.all(
    horarios.map(async (h) => {
      const [aula, criada] = await Aula.findOrCreate({
        where: { turma_id: h.turma_id, sala_id: h.sala_id, data: dataStr },
        defaults: {
          hora_inicio: h.hora_inicio,
          hora_fim: h.hora_fim,
          status: 'aberta',
        },
      });
      return { aula, criada };
    })
  );

  return resultados;
};

// POST /api/aulas/gerar-hoje  (admin)
const gerarHoje = async (req, res) => {
  try {
    const resultados = await gerarAulasPorData(req.query.data);
    const criadas = resultados.filter((r) => r.criada).length;
    const existentes = resultados.length - criadas;
    res.json({ total: resultados.length, criadas, existentes });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// GET /api/aulas
const listar = async (req, res) => {
  try {
    const { data, turma_id } = req.query;
    const where = {};
    if (data) where.data = data;
    if (turma_id) where.turma_id = turma_id;

    const turmaInclude = { model: Turma, attributes: ['id', 'nome', 'professor_id'] };
    if (req.usuario.role === 'professor') {
      turmaInclude.where = { professor_id: req.usuario.id };
      turmaInclude.required = true;
    }

    const aulas = await Aula.findAll({
      where,
      include: [
        turmaInclude,
        { model: Sala, attributes: ['id', 'nome', 'qr_token'] },
        { model: Chamada, attributes: ['id'] },
      ],
      order: [['data', 'DESC'], ['hora_inicio', 'ASC']],
    });

    const totalMatriculados = turma_id
      ? await MatriculaAluno.count({ where: { turma_id, ativa: true } })
      : null;

    const resultado = aulas.map((a) => {
      const json = a.toJSON();
      const presentes = json.Chamadas?.length || 0;
      delete json.Chamadas;
      return {
        ...json,
        presentes,
        ausentes: totalMatriculados !== null ? Math.max(totalMatriculados - presentes, 0) : null,
      };
    });

    res.json(resultado);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// GET /api/aulas/:id
const buscar = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id, {
      include: [
        { model: Turma },
        { model: Sala },
      ],
    });
    if (!aula) return res.status(404).json({ erro: 'Aula não encontrada' });
    if (!ehDonoDaTurma(req.usuario, aula.Turma)) return res.status(403).json({ erro: 'Acesso negado a esta aula' });
    res.json(aula);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// POST /api/aulas  (criação manual)
const criar = async (req, res) => {
  try {
    const { turma_id, sala_id, data, hora_inicio, hora_fim } = req.body;
    const turma = await Turma.findByPk(turma_id);
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    if (!ehDonoDaTurma(req.usuario, turma)) return res.status(403).json({ erro: 'Acesso negado a esta turma' });

    const aula = await Aula.create({ turma_id, sala_id, data, hora_inicio, hora_fim });
    res.status(201).json(aula);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// PUT /api/aulas/:id
const atualizar = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id, { include: [{ model: Turma }] });
    if (!aula) return res.status(404).json({ erro: 'Aula não encontrada' });
    if (!ehDonoDaTurma(req.usuario, aula.Turma)) return res.status(403).json({ erro: 'Acesso negado a esta aula' });
    await aula.update(req.body);
    res.json(aula);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// DELETE /api/aulas/:id
const remover = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);
    if (!aula) return res.status(404).json({ erro: 'Aula não encontrada' });
    await aula.destroy();
    res.json({ mensagem: 'Aula removida' });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

module.exports = { gerarAulasPorData, gerarHoje, listar, buscar, criar, atualizar, remover };
