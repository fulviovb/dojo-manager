const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const ctrl = require('../controllers/financeiroController');

router.get('/painel', autenticar, ctrl.painel);

module.exports = router;
