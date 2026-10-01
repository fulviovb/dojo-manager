const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const participantes = require('../controllers/participantesIncentivoController');
const documentos = require('../controllers/documentosIncentivoController');
const contrapartidas = require('../controllers/contrapartidasIncentivoController');
const despesas = require('../controllers/despesasIncentivoController');
const credenciais = require('../controllers/credenciaisIncentivoController');
const entidades = require('../controllers/entidadesFederativasController');
const contrato = require('../controllers/contratoConsultoriaController');
const esportes = require('../controllers/esportesIncentivoController');
const pacote = require('../controllers/pacoteProjetoController');
const projeto = require('../controllers/projetoIncentivoController');
const { RESULTADO_EVENTOS, CHECKLIST_ATLETA, CHECKLIST_TECNICO, CHECKLIST_PESSOA_JURIDICA, CATEGORIAS_DESPESA, TIPOS_CONTRAPARTIDA } = require('../constants/incentivoEsporte');
const { anosValidosResultado } = require('../controllers/documentosIncentivoController');

// Módulo sensível (dados pessoais + financeiro) — só admin, como Mensalidades.
router.use(autenticar, autorizarRole(['admin']));

router.get('/catalogos', (req, res) => res.json({
  resultadoEventos: RESULTADO_EVENTOS, anosResultado: anosValidosResultado(),
  checklistAtleta: CHECKLIST_ATLETA, checklistTecnico: CHECKLIST_TECNICO, checklistPessoaJuridica: CHECKLIST_PESSOA_JURIDICA,
  categoriasDespesa: CATEGORIAS_DESPESA, tiposContrapartida: TIPOS_CONTRAPARTIDA,
}));

router.get('/participantes', participantes.listar);
router.get('/participantes/:id', participantes.buscar);
router.post('/participantes', participantes.criar);
router.put('/participantes/:id', participantes.atualizar);
router.delete('/participantes/:id', participantes.desativar);

// Login/senha do Sistema Incentivo online. GET devolve só o login; a senha
// em texto claro sai apenas pelo POST .../revelar (POST pra não ficar em
// cache/histórico de URL).
router.get('/participantes/:id/credencial', credenciais.buscar);
router.put('/participantes/:id/credencial', credenciais.salvar);
router.post('/participantes/:id/credencial/revelar', credenciais.revelar);
router.delete('/participantes/:id/credencial', credenciais.remover);

// Contrato de consultoria (PDF pra download, fora do checklist).
router.post('/participantes/:id/contrato-consultoria', contrato.gerar);

// Todos os arquivos do checklist num .zip, pra protocolar na prefeitura.
router.get('/participantes/:id/pacote-projeto', pacote.baixar);

// Formulário do projeto (tela "Projeto" do Sistema Incentivo online).
router.get('/participantes/:id/projeto', projeto.buscar);
router.get('/participantes/:id/projeto/curriculo-sugerido', projeto.sugerirCurriculo);
router.get('/participantes/:id/projeto/sugestoes-resultado', projeto.sugestoesResultado);
router.put('/participantes/:id/projeto/curriculo', projeto.salvarCurriculo);
router.post('/participantes/:id/projeto/objetivos', projeto.criarObjetivo);
router.put('/participantes/:id/projeto/objetivos/:objetivoId', projeto.atualizarObjetivo);
router.delete('/participantes/:id/projeto/objetivos/:objetivoId', projeto.removerObjetivo);
router.post('/participantes/:id/projeto/competicoes', projeto.adicionarPrevista);
router.delete('/participantes/:id/projeto/competicoes/:previstaId', projeto.removerPrevista);
router.post('/participantes/:id/projeto/locais', projeto.criarLocal);
router.post('/participantes/:id/projeto/locais/importar-turmas', projeto.importarLocaisDasTurmas);
router.delete('/participantes/:id/projeto/locais/:localId', projeto.removerLocal);

// Cadastro de locais de treino (o participante só escolhe).
router.get('/locais-treino', projeto.listarLocais);
router.post('/locais-treino', projeto.criarCadastroLocal);
router.put('/locais-treino/:localTreinoId', projeto.atualizarCadastroLocal);
router.delete('/locais-treino/:localTreinoId', projeto.desativarCadastroLocal);

// Calendário de competições futuras (mesma tabela das Conquistas).
router.get('/calendario', projeto.listarCalendario);
router.post('/calendario', projeto.criarCompeticao);
router.put('/calendario/:competicaoId', projeto.atualizarCompeticao);
router.delete('/calendario/:competicaoId', projeto.removerCompeticao);

router.get('/esportes', esportes.listar);
router.post('/esportes', esportes.criar);
router.put('/esportes/:id', esportes.atualizar);
router.delete('/esportes/:id', esportes.desativar);

router.get('/entidades', entidades.listar);
router.post('/entidades', entidades.criar);
router.put('/entidades/:id', entidades.atualizar);
router.delete('/entidades/:id', entidades.desativar);

router.get('/documentos', documentos.listar);
router.get('/anexos', documentos.listarAnexosDisponiveis);
router.post('/documentos', documentos.criar);
router.post('/documentos/gerar', documentos.gerar);
router.put('/documentos/:id', documentos.atualizar);
router.put('/documentos/:id/arquivo', documentos.enviarArquivo);
router.post('/documentos/:id/ler-resultado', documentos.lerResultado);
router.delete('/documentos/:id', documentos.remover);

router.get('/contrapartidas', contrapartidas.listar);
router.post('/contrapartidas', contrapartidas.criar);
router.put('/contrapartidas/:id', contrapartidas.atualizar);
router.delete('/contrapartidas/:id', contrapartidas.remover);

router.get('/despesas', despesas.listar);
router.post('/despesas', despesas.criar);
router.put('/despesas/:id', despesas.atualizar);
router.delete('/despesas/:id', despesas.remover);

module.exports = router;
