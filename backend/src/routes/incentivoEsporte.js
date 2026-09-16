const router = require('express').Router();
const { autenticar } = require('../middleware/autenticacao');
const { autorizarRole } = require('../middleware/autorizacao');
const participantes = require('../controllers/participantesIncentivoController');
const documentos = require('../controllers/documentosIncentivoController');
const contrapartidas = require('../controllers/contrapartidasIncentivoController');
const despesas = require('../controllers/despesasIncentivoController');
const { CHECKLIST_ATLETA, CHECKLIST_TECNICO, CATEGORIAS_DESPESA, TIPOS_CONTRAPARTIDA } = require('../constants/incentivoEsporte');

// Módulo sensível (dados pessoais + financeiro) — só admin, como Mensalidades.
router.use(autenticar, autorizarRole(['admin']));

router.get('/catalogos', (req, res) => res.json({
  checklistAtleta: CHECKLIST_ATLETA, checklistTecnico: CHECKLIST_TECNICO,
  categoriasDespesa: CATEGORIAS_DESPESA, tiposContrapartida: TIPOS_CONTRAPARTIDA,
}));

router.get('/participantes', participantes.listar);
router.get('/participantes/:id', participantes.buscar);
router.post('/participantes', participantes.criar);
router.put('/participantes/:id', participantes.atualizar);
router.delete('/participantes/:id', participantes.desativar);

router.get('/documentos', documentos.listar);
router.get('/anexos', documentos.listarAnexosDisponiveis);
router.post('/documentos', documentos.criar);
router.post('/documentos/gerar', documentos.gerar);
router.put('/documentos/:id', documentos.atualizar);
router.put('/documentos/:id/arquivo', documentos.enviarArquivo);
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
