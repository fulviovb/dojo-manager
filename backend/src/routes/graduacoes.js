const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/graduacoesController');

router.get('/', autenticar, ctrl.listar);
const equipe = autorizarRole(['admin', 'professor']);

router.post('/', autenticar, equipe, ctrl.criar);
router.delete('/:id', autenticar, equipe, ctrl.remover);

module.exports = router;
