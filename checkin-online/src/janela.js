// Mesma regra de ±20min do sistema principal (backend/src/controllers/
// checkinController.js), só que aplicada sobre os horários que o sistema
// local já sincronizou pra hoje, em vez de gerar uma Aula de verdade.
const TOLERANCIA_MINUTOS = 20;

function minutosDoDia(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Duas turmas consecutivas na mesma sala (ex: 19h e 20h) têm janelas de
// ±20min que se sobrepõem entre si (19h vai até 20h20, 20h já é válida
// desde 19h40) — sem desempate, a primeira do array "ganhava" mesmo já
// tendo terminado de verdade, escondendo a turma certa (e a lista de
// alunos certa) de quem escaneou o QR. Prioriza quem está dentro do
// horário "de verdade" da aula, não só na margem de tolerância; por fim, a
// mais próxima do instante.
function turmaAtivaAgora(turmasHoje, agora = new Date()) {
  // Inclui os segundos como fração de minuto — ver mesmo comentário em
  // checkinOnlineService.js (evita empate exato no minuto de troca entre
  // duas turmas costas-com-costas).
  const agoraMin = agora.getHours() * 60 + agora.getMinutes() + agora.getSeconds() / 60;
  const candidatas = (turmasHoje || [])
    .map((t) => {
      const inicio = minutosDoDia(t.hora_inicio);
      const fim = minutosDoDia(t.hora_fim);
      return {
        turma: t,
        dentroDoNucleo: agoraMin >= inicio && agoraMin <= fim,
        distancia: Math.min(Math.abs(agoraMin - inicio), Math.abs(agoraMin - fim)),
        valida: agoraMin >= inicio - TOLERANCIA_MINUTOS && agoraMin <= fim + TOLERANCIA_MINUTOS,
      };
    })
    .filter((c) => c.valida);

  if (candidatas.length === 0) return null;

  candidatas.sort((a, b) => {
    if (a.dentroDoNucleo !== b.dentroDoNucleo) return a.dentroDoNucleo ? -1 : 1;
    return a.distancia - b.distancia;
  });

  return candidatas[0].turma;
}

module.exports = { turmaAtivaAgora };
