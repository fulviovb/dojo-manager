const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/usuariosController');

router.get('/', autenticar, ctrl.listar);
router.get('/:id/perfil', autenticar, ctrl.perfil);
router.get('/:id', autenticar, ctrl.buscar);
router.post('/', autenticar, autorizarRole(['admin']), ctrl.criar);
router.put('/:id', autenticar, autorizarRole(['admin']), ctrl.atualizar);
router.delete('/:id', autenticar, autorizarRole(['admin']), ctrl.desativar);

module.exports = router;
