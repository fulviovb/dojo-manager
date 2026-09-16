const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ContrapartidaIncentivo, ParticipanteIncentivo } = require('../models');

const PASTA = path.join(__dirname, '..', '..', 'uploads', 'incentivo-esporte', 'comprovantes-contrapartida');
fs.mkdirSync(PASTA, { recursive: true });

const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PASTA),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
      return cb(new Error('Formato não suportado (use JPEG, PNG, WEBP ou PDF)'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('comprovante');

const buscarDaEscola = async (id, escola_id) => {
  return ContrapartidaIncentivo.findOne({
    where: { id },
    include: [{ model: ParticipanteIncentivo, where: { escola_id }, attributes: [] }],
  });
};

const listar = async (req, res) => {
  try {
    const { participante_id, tipo, status } = req.query;
    const where = {};
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (participante_id) {
      where.participante_id = participante_id;
      const contrapartidas = await ContrapartidaIncentivo.findAll({ where, order: [['data', 'DESC']] });
      return res.json(contrapartidas);
    }
    // Sem participante_id: lista geral da escola (aba "Contrapartidas").
    const contrapartidas = await ContrapartidaIncentivo.findAll({
      where,
      include: [{ model: ParticipanteIncentivo, where: { escola_id: req.usuario.escola_id }, attributes: ['id', 'nome', 'tipo_pessoa'] }],
      order: [['data', 'DESC']],
    });
    res.json(contrapartidas);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload' });
    try {
      const { participante_id, tipo, descricao, data, status, observacao } = req.body;
      const participante = await ParticipanteIncentivo.findOne({ where: { id: participante_id, escola_id: req.usuario.escola_id } });
      if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });

      const contrapartida = await ContrapartidaIncentivo.create({
        escola_id: req.usuario.escola_id,
        participante_id, tipo, descricao, data, observacao,
        status: status || (req.file ? 'cumprida' : 'pendente'),
        comprovante_url: req.file ? `/uploads/incentivo-esporte/comprovantes-contrapartida/${req.file.filename}` : null,
      });
      res.status(201).json(contrapartida);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
};

const atualizar = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload' });
    try {
      const contrapartida = await buscarDaEscola(req.params.id, req.usuario.escola_id);
      if (!contrapartida) return res.status(404).json({ erro: 'Contrapartida não encontrada' });

      const { tipo, descricao, data, status, observacao } = req.body;
      const anterior = contrapartida.comprovante_url;
      await contrapartida.update({
        ...(tipo !== undefined ? { tipo } : {}),
        ...(descricao !== undefined ? { descricao } : {}),
        ...(data !== undefined ? { data } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(observacao !== undefined ? { observacao } : {}),
        ...(req.file ? { comprovante_url: `/uploads/incentivo-esporte/comprovantes-contrapartida/${req.file.filename}` } : {}),
      });
      if (req.file && anterior?.startsWith('/uploads/incentivo-esporte/')) {
        fs.unlink(path.join(__dirname, '..', '..', anterior), () => {});
      }
      res.json(contrapartida);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
};

const remover = async (req, res) => {
  try {
    const contrapartida = await buscarDaEscola(req.params.id, req.usuario.escola_id);
    if (!contrapartida) return res.status(404).json({ erro: 'Contrapartida não encontrada' });
    if (contrapartida.comprovante_url?.startsWith('/uploads/incentivo-esporte/')) {
      fs.unlink(path.join(__dirname, '..', '..', contrapartida.comprovante_url), () => {});
    }
    await contrapartida.destroy();
    res.json({ mensagem: 'Contrapartida removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, remover };
