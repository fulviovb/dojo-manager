const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/matriculasController');

router.get('/', autenticar, ctrl.listar);
router.post('/', autenticar, autorizarRole(['admin', 'professor']), ctrl.criar);
router.put('/:id', autenticar, autorizarRole(['admin', 'professor']), ctrl.atualizar);
router.delete('/:id', autenticar, autorizarRole(['admin']), ctrl.desativar);

module.exports = router;
