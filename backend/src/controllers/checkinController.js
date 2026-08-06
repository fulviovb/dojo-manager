const { Op } = require('sequelize');
const { Sala, Aula, Turma, HorarioTurma, MatriculaAluno, Chamada, Usuario } = require('../models');
const { gerarAulasPorData } = require('./aulasController');
const { dataLocalISO } = require('../utils/data');

const TOLERANCIA_MINUTOS = 20;

const minutos = (h) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

// Entre as aulas candidatas (mesma sala, mesmo dia), escolhe a que faz mais
// sentido pro instante dado — necessário porque duas turmas consecutivas na
// mesma sala (ex: 19h e 20h) têm janelas de ±20min que se sobrepõem entre
// si (19h vai até 20h20, 20h já é válida desde 19h40). Sem isso, a primeira
// aula encontrada no banco "ganhava" mesmo já tendo terminado de verdade.
function escolherMelhorAula(aulas, minutosAlvo) {
  const candidatas = aulas
    .map((aula) => {
      const inicio = minutos(aula.hora_inicio);
      const fim = minutos(aula.hora_fim);
      return {
        aula,
        dentroDoNucleo: minutosAlvo >= inicio && minutosAlvo <= fim,
        distancia: Math.min(Math.abs(minutosAlvo - inicio), Math.abs(minutosAlvo - fim)),
        valida: minutosAlvo >= inicio - TOLERANCIA_MINUTOS && minutosAlvo <= fim + TOLERANCIA_MINUTOS,
      };
    })
    .filter((c) => c.valida);

  if (candidatas.length === 0) return null;

  // Prioriza quem está dentro do horário "de verdade" da aula (não só na
  // margem de tolerância); entre empates, a mais próxima do instante.
  candidatas.sort((a, b) => {
    if (a.dentroDoNucleo !== b.dentroDoNucleo) return a.dentroDoNucleo ? -1 : 1;
    return a.distancia - b.distancia;
  });

  return candidatas[0].aula;
}

const getAulaAtiva = async (sala) => {
  const agora = new Date();
  const dataHoje = dataLocalISO(agora);
  const agorMin = minutos(agora.toTimeString().split(' ')[0]);

  // Geração lazy: garante que as Aulas de hoje existam antes de consultar
  await gerarAulasPorData(dataHoje);

  // Turma inativa não deve mais aparecer no check-in — mesmo que uma Aula
  // antiga dela ainda exista no banco (histórico de quando estava ativa).
  const aulas = await Aula.findAll({
    where: { sala_id: sala.id, data: dataHoje, status: 'aberta' },
    include: [{ model: Turma, where: { ativa: true } }],
  });

  return escolherMelhorAula(aulas, agorMin);
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
