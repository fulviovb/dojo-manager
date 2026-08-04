// Rotas públicas (sem JWT/API key) — o aluno escaneia o QR Code e cai aqui
// direto, igual ao GET/POST /api/checkin/:qr_token do sistema principal.
const router = require('express').Router();
const storage = require('../storage');
const { turmaAtivaAgora } = require('../janela');

function rosterValidoDeHoje() {
  const roster = storage.lerRoster();
  if (!roster || roster.sincronizado_em !== storage.hojeISO()) return null;
  return roster;
}

// GET /checkin/:qr_token — retorna a turma ativa (se houver) + lista de alunos
router.get('/:qr_token', (req, res) => {
  const roster = rosterValidoDeHoje();
  if (!roster) {
    return res.json({ aula_ativa: false, mensagem: 'Lista de alunos ainda não sincronizada hoje — avise a administração.' });
  }

  const sala = roster.salas.find((s) => s.qr_token === req.params.qr_token);
  if (!sala) return res.status(404).json({ erro: 'QR Code inválido' });

  const turma = turmaAtivaAgora(sala.turmas_hoje);
  if (!turma) return res.json({ aula_ativa: false, mensagem: 'Nenhuma aula em andamento no momento.' });

  const idsCheckin = storage.lerCheckinsDoDia()
    .filter((c) => c.qr_token === req.params.qr_token)
    .map((c) => c.aluno_id);

  res.json({
    aula_ativa: true,
    turma_nome: turma.turma_nome,
    hora_inicio: turma.hora_inicio,
    hora_fim: turma.hora_fim,
    alunos: turma.alunos.map((a) => ({ ...a, checkin_feito: idsCheckin.includes(a.id) })),
  });
});

// POST /checkin/:qr_token { aluno_id } — registra o toque, idempotente
router.post('/:qr_token', (req, res) => {
  const { aluno_id } = req.body || {};
  if (!aluno_id) return res.status(400).json({ erro: 'aluno_id é obrigatório' });

  const roster = rosterValidoDeHoje();
  if (!roster) return res.status(400).json({ erro: 'Lista de alunos ainda não sincronizada hoje — avise a administração.' });

  const sala = roster.salas.find((s) => s.qr_token === req.params.qr_token);
  if (!sala) return res.status(404).json({ erro: 'QR Code inválido' });

  const turma = turmaAtivaAgora(sala.turmas_hoje);
  if (!turma) return res.status(400).json({ erro: 'Nenhuma aula em andamento no momento.' });

  if (!turma.alunos.some((a) => a.id === aluno_id)) {
    return res.status(400).json({ erro: 'Aluno não matriculado nesta turma.' });
  }

  if (storage.jaFezCheckin(req.params.qr_token, aluno_id)) {
    return res.json({ sucesso: true, novo: false });
  }

  const evento = storage.registrarCheckin(req.params.qr_token, aluno_id);
  res.json({ sucesso: true, novo: true, evento });
});

module.exports = router;
