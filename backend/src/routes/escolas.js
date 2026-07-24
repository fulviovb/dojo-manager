const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/escolasController');

router.get('/', autenticar, ctrl.listar);
router.get('/:id', autenticar, ctrl.buscar);
router.post('/', autenticar, autorizarRole(['admin']), ctrl.criar);
router.put('/:id', autenticar, autorizarRole(['admin']), ctrl.atualizar);

module.exports = router;
