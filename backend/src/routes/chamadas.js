const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/chamadasController');

router.get('/', autenticar, autorizarRole(['admin', 'professor']), ctrl.listar);
router.post('/', autenticar, autorizarRole(['admin', 'professor']), ctrl.criar);
router.put('/:id/validar', autenticar, autorizarRole(['admin', 'professor']), ctrl.validar);
router.post('/fechar/:aula_id', autenticar, autorizarRole(['admin', 'professor']), ctrl.fecharAula);
router.delete('/:id', autenticar, autorizarRole(['admin']), ctrl.remover);

module.exports = router;
