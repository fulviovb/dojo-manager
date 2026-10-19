const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/evolucaoInfantilController');

router.use(autenticar, autorizarRole(['admin', 'professor']));

router.get('/modelos', ctrl.modelos);
router.get('/turmas', ctrl.turmas);
router.get('/turmas/:turma_id/mapa', ctrl.mapaTurma);
router.post('/turmas/:turma_id/mensal-lote', ctrl.mensalLote);
router.get('/sugestao', ctrl.sugestao);
router.get('/alunos/:aluno_id/evolucao', ctrl.evolucaoAluno);
router.get('/fichas', ctrl.listar);
router.get('/fichas/:id', ctrl.buscar);
router.post('/fichas', ctrl.criar);
router.put('/fichas/:id', ctrl.atualizar);
router.delete('/fichas/:id', ctrl.remover);

module.exports = router;
