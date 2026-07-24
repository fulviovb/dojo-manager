const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/financeiroController');

router.get('/', autenticar, ctrl.listarPlanos);
router.post('/', autenticar, autorizarRole(['admin']), ctrl.criarPlano);
router.put('/:id', autenticar, autorizarRole(['admin']), ctrl.atualizarPlano);
router.delete('/:id', autenticar, autorizarRole(['admin']), ctrl.removerPlano);

module.exports = router;
