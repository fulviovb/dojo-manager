const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/financeiroController');

router.get('/', autenticar, ctrl.listarPagamentos);
router.post('/', autenticar, autorizarRole(['admin']), ctrl.registrarPagamento);
router.delete('/:id', autenticar, autorizarRole(['admin']), ctrl.desfazerPagamento);

module.exports = router;
