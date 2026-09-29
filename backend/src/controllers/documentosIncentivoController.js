const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { DocumentoIncentivo, ParticipanteIncentivo, CredencialIncentivo, EntidadeFederativa } = require('../models');
const { textoEntidade } = require('./entidadesFederativasController');
const { ANEXOS, ITEM_CREDENCIAL, buscarItemChecklist } = require('../constants/incentivoEsporte');
const { gerarAnexo, montarLinhasAnexoXI } = require('../services/anexoService');

const PASTA_DOCS = path.join(__dirname, '..', '..', 'uploads', 'incentivo-esporte', 'documentos');
fs.mkdirSync(PASTA_DOCS, { recursive: true });

const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PASTA_DOCS),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
      return cb(new Error('Formato não suportado (use JPEG, PNG, WEBP ou PDF)'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('arquivo');

const buscarDaEscola = async (id, escola_id) => {
  return DocumentoIncentivo.findOne({
    where: { id },
    include: [{ model: ParticipanteIncentivo, where: { escola_id }, attributes: [] }],
  });
};

const listar = async (req, res) => {
  try {
    const { participante_id } = req.query;
    if (!participante_id) return res.status(400).json({ erro: 'participante_id é obrigatório' });
    const participante = await ParticipanteIncentivo.findOne({ where: { id: participante_id, escola_id: req.usuario.escola_id } });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });

    const documentos = await DocumentoIncentivo.findAll({
      where: { participante_id }, order: [['ordem', 'ASC'], ['created_at', 'ASC']],
    });
    res.json(documentos);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// Cria um documento novo: ou um item extra de checklist (tipo_documento não
// previsto no checklist padrão), ou mais uma instância de um item já
// previsto que aceita múltiplos arquivos (ex: outro comprovante de
// resultado) — nesse caso ordem/nome_exibicao vêm sempre do checklist
// canônico (ignora o que o cliente mandar), e o limite é validado aqui.
const criar = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload' });
    try {
      const { participante_id, tipo_documento, nome_exibicao, data_validade, observacao } = req.body;
      const participante = await ParticipanteIncentivo.findOne({ where: { id: participante_id, escola_id: req.usuario.escola_id } });
      if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });

      const itemChecklist = tipo_documento ? buscarItemChecklist(participante.tipo_pessoa, tipo_documento) : null;

      if (itemChecklist) {
        if (!itemChecklist.multiplo) {
          return res.status(400).json({ erro: 'Este documento já existe no checklist — use "Enviar arquivo" nele em vez de criar um novo.' });
        }
        const existentes = await DocumentoIncentivo.count({ where: { participante_id, tipo_documento } });
        if (itemChecklist.max && existentes >= itemChecklist.max) {
          return res.status(400).json({ erro: `Limite de ${itemChecklist.max} arquivos atingido para "${itemChecklist.nome}".` });
        }
      }

      const documento = await DocumentoIncentivo.create({
        escola_id: req.usuario.escola_id,
        participante_id,
        tipo_documento: itemChecklist ? itemChecklist.key : (tipo_documento || 'extra'),
        nome_exibicao: itemChecklist ? itemChecklist.nome : (nome_exibicao || 'Documento adicional'),
        ordem: itemChecklist ? itemChecklist.ordemCanonica : 1000,
        origem: 'upload',
        status: req.file ? 'recebido' : 'pendente',
        arquivo_url: req.file ? `/uploads/incentivo-esporte/documentos/${req.file.filename}` : null,
        data_validade: data_validade || null,
        observacao: observacao || null,
      });
      res.status(201).json(documento);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
};

// Envia (ou substitui) o arquivo de um item de checklist já existente —
// marca status 'recebido' automaticamente se ainda estava 'pendente'.
const enviarArquivo = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload' });
    try {
      const documento = await buscarDaEscola(req.params.id, req.usuario.escola_id);
      if (!documento) return res.status(404).json({ erro: 'Documento não encontrado' });
      if (!req.file) return res.status(400).json({ erro: 'Arquivo é obrigatório' });

      const anterior = documento.arquivo_url;
      const arquivo_url = `/uploads/incentivo-esporte/documentos/${req.file.filename}`;
      await documento.update({
        arquivo_url,
        status: documento.status === 'pendente' ? 'recebido' : documento.status,
      });
      if (anterior?.startsWith('/uploads/incentivo-esporte/')) {
        fs.unlink(path.join(__dirname, '..', '..', anterior), () => {});
      }
      res.json(documento);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
};

const atualizar = async (req, res) => {
  try {
    const documento = await buscarDaEscola(req.params.id, req.usuario.escola_id);
    if (!documento) return res.status(404).json({ erro: 'Documento não encontrado' });
    const { status, observacao, data_validade } = req.body;
    await documento.update({
      ...(status !== undefined ? { status } : {}),
      ...(observacao !== undefined ? { observacao } : {}),
      ...(data_validade !== undefined ? { data_validade } : {}),
    });
    res.json(documento);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const documento = await buscarDaEscola(req.params.id, req.usuario.escola_id);
    if (!documento) return res.status(404).json({ erro: 'Documento não encontrado' });
    if (documento.arquivo_url?.startsWith('/uploads/incentivo-esporte/')) {
      fs.unlink(path.join(__dirname, '..', '..', documento.arquivo_url), () => {});
    }
    // Tirar o item de login/senha do checklist apaga a credencial junto —
    // não deixa senha cifrada órfã sem item visível na tela.
    if (documento.tipo_documento === ITEM_CREDENCIAL.key) {
      await CredencialIncentivo.destroy({ where: { participante_id: documento.participante_id, escola_id: req.usuario.escola_id } });
    }
    await documento.destroy();
    res.json({ mensagem: 'Documento removido' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// Resolve o valor de um campo com `fonte` (ex: 'nome', 'tecnico.rg') a
// partir do participante (e seu técnico responsável, quando aplicável).
function resolverFonte(participante, fonte) {
  if (!fonte) return undefined;
  const partes = fonte.split('.');
  if (partes[0] === 'tecnico') {
    return participante.TecnicoResponsavel?.[partes[1]] ?? '';
  }
  // Entidade do cadastro (dados atuais, "NOME - CNPJ ..."); sem entidade
  // vinculada cai no texto legado digitado no participante.
  if (partes[0] === 'entidade') {
    const entidade = participante.EntidadeFederativa;
    if (partes[1] === 'nome_cnpj') return entidade ? textoEntidade(entidade) : (participante.vinculo_federativo_entidade ?? '');
    if (partes[1] === 'cidade') return entidade?.cidade || (participante.vinculo_federativo_cidade ?? '');
  }
  return participante[partes[0]] ?? '';
}

const listarAnexosDisponiveis = (req, res) => {
  const lista = Object.entries(ANEXOS).map(([codigo, def]) => ({
    codigo, nome: def.nome, gerar_para: def.gerar_para,
    campos: def.campos.map(c => ({ key: c.key, label: c.label, temFonte: !!c.fonte })),
  }));
  res.json(lista);
};

// Documento gerado sai SEM assinatura — não é entregável. Por isso gerar
// não cria item "recebido": o PDF só é devolvido pra download, e o usuário
// assina e envia pelo item correspondente do checklist. Só se esse item
// não existir (ex: usuário removeu) ele é (re)criado como pendente — com
// nome/ordem canônicos quando o anexo mapeia pra um item do checklist do
// participante, ou como item avulso `anexo_<código>` quando não mapeia.
async function garantirItemNoChecklist(participante, tipoAnexo, def) {
  const canonico = def.item_checklist ? buscarItemChecklist(participante.tipo_pessoa, def.item_checklist) : null;
  const tipo_documento = canonico ? canonico.key : `anexo_${tipoAnexo.toLowerCase()}`;
  const [doc, adicionado] = await DocumentoIncentivo.findOrCreate({
    where: { participante_id: participante.id, tipo_documento },
    defaults: {
      escola_id: participante.escola_id, participante_id: participante.id, tipo_documento,
      nome_exibicao: canonico ? canonico.nome : `Anexo ${tipoAnexo} — ${def.nome}`,
      origem: 'upload', status: 'pendente', ordem: canonico ? canonico.ordemCanonica : 1000,
    },
  });
  return { nome_exibicao: doc.nome_exibicao, adicionado };
}

const gerar = async (req, res) => {
  try {
    const { participante_id, tipo_anexo, campos, atletas_ids } = req.body;
    const def = ANEXOS[tipo_anexo];
    if (!def) return res.status(400).json({ erro: 'Anexo desconhecido' });
    if (tipo_anexo === 'XI' && (!Array.isArray(atletas_ids) || atletas_ids.length === 0)) {
      return res.status(400).json({ erro: 'Selecione ao menos um atleta para a relação' });
    }

    const participante = await ParticipanteIncentivo.findOne({
      where: { id: participante_id, escola_id: req.usuario.escola_id },
      include: [
        { model: ParticipanteIncentivo, as: 'TecnicoResponsavel', attributes: ['id', 'nome', 'rg', 'cpf'] },
        { model: EntidadeFederativa },
      ],
    });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });

    const dados = {};
    for (const campoDef of def.campos) {
      const daFonte = resolverFonte(participante, campoDef.fonte);
      const doFormulario = campos?.[campoDef.key];
      // Só grava a chave quando há valor de verdade — campo em branco
      // (ex: dia/mês da assinatura) fica de fora pra não sobrescrever o
      // default (data de hoje) que o anexoService aplica.
      if (daFonte) dados[campoDef.key] = daFonte;
      else if (doFormulario) dados[campoDef.key] = doFormulario;
    }
    if (tipo_anexo === 'XI') {
      dados.linhas = await montarLinhasAnexoXI(req.usuario.escola_id, atletas_ids);
      if (dados.linhas.length === 0) return res.status(400).json({ erro: 'Nenhum dos atletas selecionados foi encontrado' });
    }

    const pdfBuffer = await gerarAnexo(tipo_anexo, dados);
    const item = await garantirItemNoChecklist(participante, tipo_anexo, def);

    const nomeArquivo = `Anexo_${tipo_anexo}_${participante.nome}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_') + '.pdf';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      // Frontend (outra porta) só enxerga headers custom se expostos.
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Item-Checklist, X-Item-Adicionado',
      'X-Item-Checklist': encodeURIComponent(item.nome_exibicao),
      'X-Item-Adicionado': item.adicionado ? '1' : '0',
    });
    res.send(pdfBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao gerar documento. Verifique se o LibreOffice está disponível no servidor.' });
  }
};

module.exports = { listar, criar, enviarArquivo, atualizar, remover, listarAnexosDisponiveis, gerar };
