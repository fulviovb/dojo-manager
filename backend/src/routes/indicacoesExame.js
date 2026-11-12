const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/indicacoesExameController');

const equipe = autorizarRole(['admin', 'professor']);

router.post('/', autenticar, equipe, ctrl.indicar);
router.post('/:id/aprovar', autenticar, equipe, ctrl.aprovar);
router.delete('/:id', autenticar, equipe, ctrl.cancelar);

module.exports = router;
