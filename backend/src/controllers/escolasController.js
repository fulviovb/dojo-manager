const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Escola } = require('../models');

const PASTA_ASSINATURAS = path.join(__dirname, '..', '..', 'uploads', 'assinaturas');
fs.mkdirSync(PASTA_ASSINATURAS, { recursive: true });

const uploadAssinaturaMiddleware = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PASTA_ASSINATURAS),
    filename: (req, file, cb) => cb(null, `${uuidv4()}.png`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'image/png') return cb(new Error('Envie a assinatura como PNG'));
    cb(null, true);
  },
  limits: { fileSize: 1 * 1024 * 1024 },
}).single('assinatura');

const listar = async (req, res) => {
  try {
    const escolas = await Escola.findAll({ where: { ativa: true }, order: [['nome', 'ASC']] });
    res.json(escolas);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const escola = await Escola.findByPk(req.params.id);
    if (!escola) return res.status(404).json({ erro: 'Escola não encontrada' });
    res.json(escola);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const escola = await Escola.create(req.body);
    res.status(201).json(escola);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const escola = await Escola.findByPk(req.params.id);
    if (!escola) return res.status(404).json({ erro: 'Escola não encontrada' });
    await escola.update(req.body);
    res.json(escola);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/escolas/:id/assinatura (admin, só da própria escola) — recebe
// um PNG (o professor/admin desenha num canvas e exporta como blob) e
// substitui a assinatura usada nos recibos dessa escola.
const enviarAssinatura = (req, res) => {
  if (req.params.id !== req.usuario.escola_id) {
    return res.status(403).json({ erro: 'Acesso negado a esta escola' });
  }
  uploadAssinaturaMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload da assinatura' });
    try {
      const escola = await Escola.findByPk(req.params.id);
      if (!escola) return res.status(404).json({ erro: 'Escola não encontrada' });
      if (!req.file) return res.status(400).json({ erro: 'Arquivo de assinatura é obrigatório' });

      const anterior = escola.assinatura_url;
      const assinatura_url = `/uploads/assinaturas/${req.file.filename}`;
      await escola.update({ assinatura_url });

      if (anterior?.startsWith('/uploads/assinaturas/')) {
        fs.unlink(path.join(PASTA_ASSINATURAS, path.basename(anterior)), () => {});
      }
      res.json(escola);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
};

module.exports = { listar, buscar, criar, atualizar, enviarAssinatura };
