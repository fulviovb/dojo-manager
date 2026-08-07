const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/faseExameModelosController');

router.get('/', autenticar, ctrl.listar);

router.post('/', autenticar, autorizarRole(['admin']), ctrl.criarFase);
router.put('/:id', autenticar, autorizarRole(['admin']), ctrl.atualizarFase);
router.delete('/:id', autenticar, autorizarRole(['admin']), ctrl.removerFase);

router.post('/:fase_id/criterios', autenticar, autorizarRole(['admin']), ctrl.criarCriterio);
router.put('/criterios/:id', autenticar, autorizarRole(['admin']), ctrl.atualizarCriterio);
router.delete('/criterios/:id', autenticar, autorizarRole(['admin']), ctrl.removerCriterio);
router.put('/criterios/:id/faixas', autenticar, autorizarRole(['admin']), ctrl.definirFaixasAplicaveis);

module.exports = router;
