const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const ctrl = require('../controllers/dashboardController');

router.get('/', autenticar, ctrl.resumo);
router.get('/semaforo', autenticar, ctrl.semaforo);
router.get('/graduacao', autenticar, ctrl.graduacao);

module.exports = router;
