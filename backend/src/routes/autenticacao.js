const router = require('express').Router();
const { login, me } = require('../controllers/autenticacaoController');
const { autenticar } = require('../middleware/autenticacao');

router.post('/login', login);
router.get('/me', autenticar, me);

module.exports = router;
