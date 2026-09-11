const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const ctrl = require('../controllers/conquistasController');

router.get('/competicoes', autenticar, ctrl.listarCompeticoes);
router.post('/competicoes', autenticar, ctrl.criarCompeticao);
router.put('/competicoes/:id', autenticar, ctrl.atualizarCompeticao);
router.delete('/competicoes/:id', autenticar, ctrl.removerCompeticao);

router.get('/aluno/:aluno_id', autenticar, ctrl.listarPorAluno);
router.get('/', autenticar, ctrl.listar);
router.post('/', autenticar, ctrl.criar);
router.put('/:id', autenticar, ctrl.atualizar);
router.delete('/:id', autenticar, ctrl.remover);

module.exports = router;
