const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const ctrl = require('../controllers/ocorrenciasController');

router.get('/', autenticar, ctrl.listar);
router.post('/', autenticar, ctrl.criar);
router.delete('/:id', autenticar, ctrl.remover);

module.exports = router;
