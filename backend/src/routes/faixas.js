const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/faixasController');

router.get('/', autenticar, ctrl.listar);
router.post('/', autenticar, autorizarRole(['admin']), ctrl.criar);
router.put('/:id', autenticar, autorizarRole(['admin']), ctrl.atualizar);
router.delete('/:id', autenticar, autorizarRole(['admin']), ctrl.remover);

module.exports = router;
