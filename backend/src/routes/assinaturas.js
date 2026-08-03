const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/assinaturasController');

router.get('/', autenticar, ctrl.listar);
router.post('/', autenticar, autorizarRole(['admin']), ctrl.criar);
router.put('/:id', autenticar, autorizarRole(['admin']), ctrl.atualizar);
router.put('/:id/pausar', autenticar, autorizarRole(['admin']), ctrl.pausar);
router.put('/:id/reativar', autenticar, autorizarRole(['admin']), ctrl.reativar);
router.put('/:id/finalizar', autenticar, autorizarRole(['admin']), ctrl.finalizar);
router.post('/:id/gerar-fatura', autenticar, autorizarRole(['admin']), ctrl.gerarFatura);

module.exports = router;
