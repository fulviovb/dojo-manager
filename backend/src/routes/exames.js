const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/examesController');

const staff = autorizarRole(['admin', 'professor']);

router.get('/', autenticar, staff, ctrl.listar);
router.post('/', autenticar, staff, ctrl.criar);
router.get('/:id', autenticar, staff, ctrl.detalhar);
router.patch('/:id/status', autenticar, staff, ctrl.atualizarStatus);

router.post('/:id/fases', autenticar, staff, ctrl.criarFase);
router.put('/:id/fases/:fase_id', autenticar, staff, ctrl.atualizarFase);
router.delete('/:id/fases/:fase_id', autenticar, staff, ctrl.removerFase);
router.post('/:id/fases/:fase_id/criterios', autenticar, staff, ctrl.criarCriterio);
router.put('/:id/criterios/:criterio_id', autenticar, staff, ctrl.atualizarCriterio);
router.delete('/:id/criterios/:criterio_id', autenticar, staff, ctrl.removerCriterio);
router.put('/:id/criterios/:criterio_id/faixas', autenticar, staff, ctrl.definirFaixasAplicaveis);

router.post('/:id/participantes', autenticar, staff, ctrl.adicionarParticipante);
router.delete('/:id/participantes/:participante_id', autenticar, staff, ctrl.removerParticipante);
router.get('/:id/participantes/:participante_id/ficha', autenticar, staff, ctrl.fichaParticipante);

router.post('/:id/avaliadores', autenticar, staff, ctrl.adicionarAvaliador);
router.delete('/:id/avaliadores/:avaliador_id', autenticar, staff, ctrl.revogarAvaliador);

router.post('/:id/sorteio', autenticar, staff, ctrl.sortear);
router.patch('/:id/avaliacoes/:avaliacao_id/reabrir', autenticar, staff, ctrl.reabrirAvaliacao);

router.get('/:id/relatorio', autenticar, staff, ctrl.relatorio);

module.exports = router;
