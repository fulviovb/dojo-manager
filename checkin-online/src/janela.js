// Mesma regra de ±20min do sistema principal (backend/src/controllers/
// checkinController.js), só que aplicada sobre os horários que o sistema
// local já sincronizou pra hoje, em vez de gerar uma Aula de verdade.
const TOLERANCIA_MINUTOS = 20;

function minutosDoDia(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function turmaAtivaAgora(turmasHoje, agora = new Date()) {
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  return (turmasHoje || []).find((t) => {
    const inicio = minutosDoDia(t.hora_inicio) - TOLERANCIA_MINUTOS;
    const fim = minutosDoDia(t.hora_fim) + TOLERANCIA_MINUTOS;
    return agoraMin >= inicio && agoraMin <= fim;
  }) || null;
}

module.exports = { turmaAtivaAgora };
