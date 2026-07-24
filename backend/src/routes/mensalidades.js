const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/financeiroController');

router.get('/', autenticar, ctrl.listarMensalidades);
router.post('/', autenticar, autorizarRole(['admin']), ctrl.criarMensalidade);
router.put('/:id', autenticar, autorizarRole(['admin']), ctrl.atualizarMensalidade);

module.exports = router;
