const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/financeiroController');

router.get('/', autenticar, ctrl.listarMensalidades);
router.post('/', autenticar, autorizarRole(['admin']), ctrl.criarMensalidade);
router.put('/:id', autenticar, autorizarRole(['admin']), ctrl.atualizarMensalidade);
router.put('/:id/cancelar', autenticar, autorizarRole(['admin']), ctrl.cancelarMensalidade);
router.get('/:id/recibo', autenticar, ctrl.reciboMensalidade);

module.exports = router;
