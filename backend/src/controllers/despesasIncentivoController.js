const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { DespesaIncentivo, ParticipanteIncentivo } = require('../models');
const { dataLocalISO } = require('../utils/data');

const PASTA = path.join(__dirname, '..', '..', 'uploads', 'incentivo-esporte', 'comprovantes-despesa');
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
  return DespesaIncentivo.findOne({
    where: { id },
    include: [{ model: ParticipanteIncentivo, where: { escola_id }, attributes: [] }],
  });
};

const listar = async (req, res) => {
  try {
    const { participante_id, categoria, com_comprovante, reportado_prefeitura } = req.query;
    const where = {};
    if (categoria) where.categoria = categoria;
    if (com_comprovante === 'true') where.comprovante_url = { [require('sequelize').Op.ne]: null };
    if (com_comprovante === 'false') where.comprovante_url = null;
    if (reportado_prefeitura !== undefined) where.reportado_prefeitura = reportado_prefeitura === 'true';

    if (participante_id) {
      where.participante_id = participante_id;
      const despesas = await DespesaIncentivo.findAll({ where, order: [['data_despesa', 'DESC']] });
      return res.json(despesas);
    }
    const despesas = await DespesaIncentivo.findAll({
      where,
      include: [{ model: ParticipanteIncentivo, where: { escola_id: req.usuario.escola_id }, attributes: ['id', 'nome', 'tipo_pessoa'] }],
      order: [['data_despesa', 'DESC']],
    });
    res.json(despesas);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload' });
    try {
      const { participante_id, categoria, descricao, valor, data_despesa, reportado_prefeitura, observacao } = req.body;
      const participante = await ParticipanteIncentivo.findOne({ where: { id: participante_id, escola_id: req.usuario.escola_id } });
      if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });

      const despesa = await DespesaIncentivo.create({
        escola_id: req.usuario.escola_id,
        participante_id, categoria, descricao, valor, data_despesa, observacao,
        comprovante_url: req.file ? `/uploads/incentivo-esporte/comprovantes-despesa/${req.file.filename}` : null,
        reportado_prefeitura: reportado_prefeitura === 'true' || reportado_prefeitura === true,
        data_reportado_prefeitura: (reportado_prefeitura === 'true' || reportado_prefeitura === true) ? dataLocalISO(new Date()) : null,
      });
      res.status(201).json(despesa);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
};

const atualizar = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload' });
    try {
      const despesa = await buscarDaEscola(req.params.id, req.usuario.escola_id);
      if (!despesa) return res.status(404).json({ erro: 'Despesa não encontrada' });

      const { categoria, descricao, valor, data_despesa, reportado_prefeitura, observacao } = req.body;
      const anterior = despesa.comprovante_url;
      const viraReportada = reportado_prefeitura !== undefined
        && (reportado_prefeitura === 'true' || reportado_prefeitura === true)
        && !despesa.reportado_prefeitura;

      await despesa.update({
        ...(categoria !== undefined ? { categoria } : {}),
        ...(descricao !== undefined ? { descricao } : {}),
        ...(valor !== undefined ? { valor } : {}),
        ...(data_despesa !== undefined ? { data_despesa } : {}),
        ...(observacao !== undefined ? { observacao } : {}),
        ...(reportado_prefeitura !== undefined ? {
          reportado_prefeitura: reportado_prefeitura === 'true' || reportado_prefeitura === true,
          data_reportado_prefeitura: viraReportada ? dataLocalISO(new Date())
            : (reportado_prefeitura === 'false' || reportado_prefeitura === false) ? null
            : despesa.data_reportado_prefeitura,
        } : {}),
        ...(req.file ? { comprovante_url: `/uploads/incentivo-esporte/comprovantes-despesa/${req.file.filename}` } : {}),
      });
      if (req.file && anterior?.startsWith('/uploads/incentivo-esporte/')) {
        fs.unlink(path.join(__dirname, '..', '..', anterior), () => {});
      }
      res.json(despesa);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
};

const remover = async (req, res) => {
  try {
    const despesa = await buscarDaEscola(req.params.id, req.usuario.escola_id);
    if (!despesa) return res.status(404).json({ erro: 'Despesa não encontrada' });
    if (despesa.comprovante_url?.startsWith('/uploads/incentivo-esporte/')) {
      fs.unlink(path.join(__dirname, '..', '..', despesa.comprovante_url), () => {});
    }
    await despesa.destroy();
    res.json({ mensagem: 'Despesa removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, remover };
