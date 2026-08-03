const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const ctrl = require('../controllers/relatoriosController');

router.get('/alunos-por-graduacao', autenticar, ctrl.alunosPorGraduacao);
router.get('/alunos-por-turma', autenticar, ctrl.alunosPorTurma);
router.get('/ficha-cadastral', autenticar, ctrl.fichaCadastral);
router.get('/frequencia-turma', autenticar, ctrl.frequenciaTurma);
router.get('/frequencia-aluno', autenticar, ctrl.frequenciaAluno);
router.get('/aniversariantes', autenticar, ctrl.aniversariantes);

module.exports = router;
