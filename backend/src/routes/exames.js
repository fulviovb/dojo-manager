const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const ctrl = require('../controllers/examesController');
const gestao = require('../controllers/gestaoExameController');

const staff = autorizarRole(['admin', 'professor']);

router.get('/', autenticar, staff, ctrl.listar);
router.post('/', autenticar, staff, ctrl.criar);
router.post('/comecar-com-roteiro-padrao', autenticar, staff, ctrl.comecarComRoteiroPadrao);
router.get('/:id', autenticar, staff, ctrl.detalhar);
router.delete('/:id', autenticar, staff, ctrl.remover);
router.patch('/:id/status', autenticar, staff, ctrl.atualizarStatus);
router.patch('/:id/tipo', autenticar, staff, ctrl.marcarComoRoteiroPadrao);

router.post('/:id/fases', autenticar, staff, ctrl.criarFase);
router.put('/:id/fases/:fase_id', autenticar, staff, ctrl.atualizarFase);
router.delete('/:id/fases/:fase_id', autenticar, staff, ctrl.removerFase);
router.post('/:id/fases/:fase_id/criterios', autenticar, staff, ctrl.criarCriterio);
router.put('/:id/criterios/:criterio_id', autenticar, staff, ctrl.atualizarCriterio);
router.delete('/:id/criterios/:criterio_id', autenticar, staff, ctrl.removerCriterio);
router.put('/:id/criterios/:criterio_id/faixas', autenticar, staff, ctrl.definirFaixasAplicaveis);

router.get('/:id/participantes/:participante_id/ficha', autenticar, staff, ctrl.fichaParticipante);

router.post('/:id/avaliadores', autenticar, staff, ctrl.adicionarAvaliador);
router.delete('/:id/avaliadores/:avaliador_id', autenticar, staff, ctrl.revogarAvaliador);

router.post('/:id/sorteio', autenticar, staff, ctrl.sortear);
router.patch('/:id/avaliacoes/:avaliacao_id/reabrir', autenticar, staff, ctrl.reabrirAvaliacao);

// Gestão do exame (candidatos, taxa, pedido de faixa, resultado)
router.put('/:id/gestao', autenticar, staff, gestao.atualizarGestao);
router.get('/:id/candidatos', autenticar, staff, gestao.listarCandidatos);
router.get('/:id/elegiveis', autenticar, staff, gestao.listarElegiveis);
router.post('/:id/candidatos', autenticar, staff, gestao.incluirCandidatos);
router.patch('/:id/candidatos', autenticar, staff, gestao.atualizarEmMassa);
router.patch('/:id/candidatos/:pid', autenticar, staff, gestao.atualizarCandidato);
router.delete('/:id/candidatos/:pid', autenticar, staff, gestao.removerCandidato);
router.post('/:id/externos', autenticar, staff, gestao.incluirExterno);
router.put('/:id/externos/:pid', autenticar, staff, gestao.atualizarExterno);
router.post('/:id/pagamentos', autenticar, staff, gestao.registrarPagamento);
router.post('/:id/pagamentos/lote', autenticar, staff, gestao.pagarEmMassa);
router.delete('/:id/pagamentos/:pagamento_id', autenticar, staff, gestao.estornarPagamento);
router.put('/:id/pedidos-faixa/:pid', autenticar, staff, gestao.salvarPedido);
router.post('/:id/resultado', autenticar, staff, gestao.gravarResultado);
router.get('/:id/historico', autenticar, staff, gestao.listarHistorico);

router.get('/:id/relatorio', autenticar, staff, ctrl.relatorio);

module.exports = router;
