// Rotas autenticadas (Bearer <API_KEY>), chamadas só pelo sistema local.
const router = require('express').Router();
const storage = require('../storage');

// POST /sync/roster — sistema local empurra a lista de hoje (salas → turmas → alunos)
router.post('/roster', (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.salas)) {
    return res.status(400).json({ erro: 'payload inválido — esperado { salas: [...] }' });
  }
  const salvo = storage.salvarRoster(payload);
  res.json({ sucesso: true, salas: salvo.salas.length, sincronizado_em: salvo.sincronizado_em });
});

// GET /sync/checkins — devolve todos os check-ins ainda não confirmados
router.get('/checkins', (req, res) => {
  const { arquivos, eventos } = storage.lerTodosPendentes();
  res.json({ arquivos, eventos });
});

// POST /sync/checkins/confirmar { arquivos: [...] } — sistema local avisa
// que já salvou esses eventos; os arquivos saem da fila de pendentes
router.post('/checkins/confirmar', (req, res) => {
  const { arquivos } = req.body || {};
  if (!Array.isArray(arquivos)) return res.status(400).json({ erro: 'arquivos deve ser uma lista' });
  const confirmados = storage.confirmarArquivos(arquivos);
  res.json({ sucesso: true, confirmados });
});

// POST /sync/limpar-antigos { dias } — remove arquivos já confirmados há
// mais de N dias (padrão 7), pra não acumular lixo no disco
router.post('/limpar-antigos', (req, res) => {
  const diasInformado = parseInt(req.body?.dias, 10);
  const dias = Number.isFinite(diasInformado) ? diasInformado : 7;
  const removidos = storage.limparAntigos(dias);
  res.json({ sucesso: true, removidos });
});

module.exports = router;
