const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/checkinOnlineController');

router.post('/sincronizar', autenticar, autorizarRole(['admin']), ctrl.sincronizar);

module.exports = router;
