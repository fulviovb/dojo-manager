const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const ctrl = require('../controllers/dashboardController');

router.get('/', autenticar, ctrl.resumo);
router.get('/semaforo', autenticar, ctrl.semaforo);
router.get('/graduacao', autenticar, ctrl.graduacao);
router.get('/semaforo-graduacao', autenticar, ctrl.semaforoGraduacao);
router.get('/horas-por-turma', autenticar, ctrl.horasPorTurma);

module.exports = router;
