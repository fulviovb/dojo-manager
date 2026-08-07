const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/examesController');

const staff = autorizarRole(['admin', 'professor']);

router.get('/', autenticar, staff, ctrl.listar);
router.post('/', autenticar, staff, ctrl.criar);
router.get('/:id', autenticar, staff, ctrl.detalhar);
router.patch('/:id/status', autenticar, staff, ctrl.atualizarStatus);

router.post('/:id/participantes', autenticar, staff, ctrl.adicionarParticipante);
router.delete('/:id/participantes/:participante_id', autenticar, staff, ctrl.removerParticipante);
router.get('/:id/participantes/:participante_id/ficha', autenticar, staff, ctrl.fichaParticipante);

router.post('/:id/avaliadores', autenticar, staff, ctrl.adicionarAvaliador);
router.delete('/:id/avaliadores/:avaliador_id', autenticar, staff, ctrl.revogarAvaliador);

router.post('/:id/sorteio', autenticar, staff, ctrl.sortear);
router.patch('/:id/avaliacoes/:avaliacao_id/reabrir', autenticar, staff, ctrl.reabrirAvaliacao);

router.get('/:id/relatorio', autenticar, staff, ctrl.relatorio);

module.exports = router;
