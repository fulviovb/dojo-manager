const router = require('express').Router();
const { autenticarAvaliador } = require('../middleware/autenticacaoAvaliador');
const ctrl = require('../controllers/avaliacaoPublicaController');

// Login público (PIN) — sem JWT ainda, é aqui que ele é emitido
router.post('/exames/:exame_id/login', ctrl.login);

// Daqui pra baixo, exige o token de avaliador emitido no login acima
router.get('/minhas-avaliacoes', autenticarAvaliador, ctrl.minhasAvaliacoes);
router.get('/avaliacoes/:id', autenticarAvaliador, ctrl.detalharAvaliacao);
router.put('/avaliacoes/:id/criterios/:criterio_id', autenticarAvaliador, ctrl.responderCriterio);
router.post('/avaliacoes/:id/finalizar', autenticarAvaliador, ctrl.finalizar);

module.exports = router;
