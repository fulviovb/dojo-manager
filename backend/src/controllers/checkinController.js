const { Op } = require('sequelize');
const { Sala, Aula, Turma, HorarioTurma, MatriculaAluno, Chamada, Usuario } = require('../models');
const { gerarAulasPorData } = require('./aulasController');
const { dataLocalISO } = require('../utils/data');

const TOLERANCIA_MINUTOS = 20;

const getAulaAtiva = async (sala) => {
  const agora = new Date();
  const dataHoje = dataLocalISO(agora);
  const horaAgora = agora.toTimeString().split(' ')[0]; // HH:MM:SS

  const minutos = (h) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  };

  const agorMin = minutos(horaAgora);

  // Geração lazy: garante que as Aulas de hoje existam antes de consultar
  await gerarAulasPorData(dataHoje);

  const aula = await Aula.findOne({
    where: {
      sala_id: sala.id,
      data: dataHoje,
      status: 'aberta',
    },
    include: [{ model: Turma }],
  });

  if (!aula) return null;

  const inicioMin = minutos(aula.hora_inicio) - TOLERANCIA_MINUTOS;
  const fimMin = minutos(aula.hora_fim) + TOLERANCIA_MINUTOS;

  if (agorMin < inicioMin || agorMin > fimMin) return null;

  return aula;
};

// GET /api/checkin/:qr_token — retorna aula ativa + alunos matriculados
const getCheckin = async (req, res) => {
  try {
    const sala = await Sala.findOne({ where: { qr_token: req.params.qr_token } });
    if (!sala) return res.status(404).json({ erro: 'QR Code inválido' });

    const aula = await getAulaAtiva(sala);
    if (!aula) {
      return res.status(200).json({ aula_ativa: false, mensagem: 'Nenhuma aula em andamento no momento.' });
    }

    const matriculas = await MatriculaAluno.findAll({
      where: { turma_id: aula.turma_id, ativa: true },
      include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] }],
    });

    const checkins = await Chamada.findAll({ where: { aula_id: aula.id } });
    const checkinIds = checkins.map((c) => c.aluno_id);

    const alunos = matriculas.map((m) => ({
      id: m.Aluno.id,
      nome: m.Aluno.nome,
      checkin_feito: checkinIds.includes(m.Aluno.id),
    }));

    res.json({
      aula_ativa: true,
      aula: { id: aula.id, turma: aula.Turma.nome, hora_inicio: aula.hora_inicio, hora_fim: aula.hora_fim },
      alunos,
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// POST /api/checkin/:qr_token — registra check-in do aluno
const postCheckin = async (req, res) => {
  try {
    const { aluno_id } = req.body;
    if (!aluno_id) return res.status(400).json({ erro: 'aluno_id é obrigatório' });

    const sala = await Sala.findOne({ where: { qr_token: req.params.qr_token } });
    if (!sala) return res.status(404).json({ erro: 'QR Code inválido' });

    const aula = await getAulaAtiva(sala);
    if (!aula) return res.status(400).json({ erro: 'Nenhuma aula em andamento no momento.' });

    const [chamada, criada] = await Chamada.findOrCreate({
      where: { aula_id: aula.id, aluno_id },
      defaults: { origem: 'qrcode' },
    });

    res.json({ sucesso: true, novo: criada, chamada });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

module.exports = { getCheckin, postCheckin };
