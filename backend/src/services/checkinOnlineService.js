// Integração com o módulo satélite `checkin-online/` (deploy separado, sem
// banco — ver plano/decisão no Progress.txt). Duas responsabilidades:
// empurrar a lista de hoje (quem pode fazer check-in em cada sala) e puxar
// os check-ins que os alunos já deram por lá, reconciliando como Chamada
// de verdade — mesmo resultado de um check-in local (`checkinController.js`).
const { Sala, HorarioTurma, Turma, MatriculaAluno, Usuario, Aula, Chamada } = require('../models');
const { gerarAulasPorData } = require('../controllers/aulasController');
const { dataLocalISO } = require('../utils/data');

const BASE_URL = process.env.CHECKIN_ONLINE_URL;
const API_KEY = process.env.CHECKIN_ONLINE_API_KEY;
const TOLERANCIA_MINUTOS = 20;

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` });

const exigirConfiguracao = () => {
  if (!BASE_URL) throw new Error('CHECKIN_ONLINE_URL não configurado no .env');
};

async function montarRosterDeHoje(escola_id) {
  const diaSemana = new Date().getDay();
  const salas = await Sala.findAll({ where: { escola_id } });

  const resultado = [];
  for (const sala of salas) {
    const horarios = await HorarioTurma.findAll({
      where: { sala_id: sala.id, dia_semana: diaSemana },
      include: [{ model: Turma, where: { escola_id, ativa: true } }],
    });
    if (!horarios.length) continue;

    const turmas_hoje = [];
    for (const h of horarios) {
      const matriculas = await MatriculaAluno.findAll({
        where: { turma_id: h.turma_id, ativa: true },
        include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] }],
      });
      turmas_hoje.push({
        turma_nome: h.Turma.nome,
        hora_inicio: h.hora_inicio.slice(0, 5),
        hora_fim: h.hora_fim.slice(0, 5),
        alunos: matriculas.map((m) => ({ id: m.Aluno.id, nome: m.Aluno.nome })),
      });
    }
    resultado.push({ qr_token: sala.qr_token, turmas_hoje });
  }
  return { salas: resultado };
}

async function sincronizarRoster(escola_id) {
  exigirConfiguracao();
  const payload = await montarRosterDeHoje(escola_id);
  const r = await fetch(`${BASE_URL}/sync/roster`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`Falha ao sincronizar roster (HTTP ${r.status})`);
  return r.json();
}

const minutosDoDia = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Variação de `checkinController.getAulaAtiva`, mas pra um instante do
// passado (o momento em que o aluno tocou o nome no módulo online) em vez
// de "agora". Gera as Aulas do dia primeiro — se ninguém abriu o sistema
// local hoje, elas ainda não existiriam.
async function encontrarAulaPorInstante(sala_id, timestampISO) {
  const instante = new Date(timestampISO);
  const data = dataLocalISO(instante);
  const minutosEvento = instante.getHours() * 60 + instante.getMinutes();

  await gerarAulasPorData(data);

  const aulas = await Aula.findAll({ where: { sala_id, data } });
  return aulas.find((a) => {
    const inicio = minutosDoDia(a.hora_inicio.slice(0, 5)) - TOLERANCIA_MINUTOS;
    const fim = minutosDoDia(a.hora_fim.slice(0, 5)) + TOLERANCIA_MINUTOS;
    return minutosEvento >= inicio && minutosEvento <= fim;
  }) || null;
}

async function buscarEReconciliarCheckins(escola_id) {
  exigirConfiguracao();
  const r = await fetch(`${BASE_URL}/sync/checkins`, { headers: headers() });
  if (!r.ok) throw new Error(`Falha ao buscar check-ins (HTTP ${r.status})`);
  const { arquivos, eventos } = await r.json();

  const salas = await Sala.findAll({ where: { escola_id } });
  const salaPorToken = new Map(salas.map((s) => [s.qr_token, s]));

  let novos = 0;
  for (const evento of eventos) {
    const sala = salaPorToken.get(evento.qr_token);
    if (!sala) continue; // token não é desta escola (ou sala removida)

    const aula = await encontrarAulaPorInstante(sala.id, evento.ts);
    if (!aula) continue; // defensivo — não deveria acontecer, já validado no módulo online

    const [, criada] = await Chamada.findOrCreate({
      where: { aula_id: aula.id, aluno_id: evento.aluno_id },
      defaults: { origem: 'qrcode' },
    });
    if (criada) novos++;
  }

  if (arquivos.length) {
    await fetch(`${BASE_URL}/sync/checkins/confirmar`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ arquivos }),
    });
  }

  return { total_eventos: eventos.length, novos_checkins: novos };
}

module.exports = { sincronizarRoster, buscarEReconciliarCheckins };
