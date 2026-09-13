const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const ctrl = require('../controllers/treinosExtrasController');

router.get('/', autenticar, ctrl.listar);
router.post('/', autenticar, ctrl.criar);
router.put('/:id', autenticar, ctrl.atualizar);
router.delete('/:id', autenticar, ctrl.remover);

module.exports = router;
