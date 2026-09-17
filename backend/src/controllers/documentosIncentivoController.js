const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { DocumentoIncentivo, ParticipanteIncentivo } = require('../models');
const { ANEXOS, buscarItemChecklist } = require('../constants/incentivoEsporte');
const { gerarAnexo, montarLinhasAnexoXI } = require('../services/anexoService');

const PASTA_DOCS = path.join(__dirname, '..', '..', 'uploads', 'incentivo-esporte', 'documentos');
const PASTA_GERADOS = path.join(__dirname, '..', '..', 'uploads', 'incentivo-esporte', 'gerados');
fs.mkdirSync(PASTA_DOCS, { recursive: true });
fs.mkdirSync(PASTA_GERADOS, { recursive: true });

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
        if (existentes >= itemChecklist.max) {
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
  return participante[partes[0]] ?? '';
}

const listarAnexosDisponiveis = (req, res) => {
  const lista = Object.entries(ANEXOS).map(([codigo, def]) => ({
    codigo, nome: def.nome, gerar_para: def.gerar_para,
    campos: def.campos.map(c => ({ key: c.key, label: c.label, temFonte: !!c.fonte })),
  }));
  res.json(lista);
};

const gerar = async (req, res) => {
  try {
    const { participante_id, tipo_anexo, campos } = req.body;
    const def = ANEXOS[tipo_anexo];
    if (!def) return res.status(400).json({ erro: 'Anexo desconhecido' });

    const participante = await ParticipanteIncentivo.findOne({
      where: { id: participante_id, escola_id: req.usuario.escola_id },
      include: [{ model: ParticipanteIncentivo, as: 'TecnicoResponsavel', attributes: ['id', 'nome', 'rg', 'cpf'] }],
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
      dados.linhas = await montarLinhasAnexoXI(participante.id);
    }

    const pdfBuffer = await gerarAnexo(tipo_anexo, dados);
    const nomeArquivo = `${uuidv4()}.pdf`;
    fs.writeFileSync(path.join(PASTA_GERADOS, nomeArquivo), pdfBuffer);

    const documento = await DocumentoIncentivo.create({
      escola_id: req.usuario.escola_id,
      participante_id,
      tipo_documento: `anexo_${tipo_anexo.toLowerCase()}`,
      nome_exibicao: `Anexo ${tipo_anexo} — ${def.nome}`,
      origem: 'gerado',
      tipo_anexo,
      dados_preenchidos: dados,
      status: 'recebido',
      arquivo_url: `/uploads/incentivo-esporte/gerados/${nomeArquivo}`,
    });
    res.status(201).json(documento);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao gerar documento. Verifique se o LibreOffice está disponível no servidor.' });
  }
};

module.exports = { listar, criar, enviarArquivo, atualizar, remover, listarAnexosDisponiveis, gerar };
