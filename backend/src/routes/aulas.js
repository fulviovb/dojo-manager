const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/aulasController');

router.post('/gerar-hoje', autenticar, autorizarRole(['admin']), ctrl.gerarHoje);

router.get('/', autenticar, ctrl.listar);
router.get('/:id', autenticar, ctrl.buscar);
router.post('/', autenticar, autorizarRole(['admin', 'professor']), ctrl.criar);
router.put('/:id', autenticar, autorizarRole(['admin', 'professor']), ctrl.atualizar);
router.delete('/:id', autenticar, autorizarRole(['admin']), ctrl.remover);

module.exports = router;
