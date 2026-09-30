const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { EsporteIncentivo, ParticipanteIncentivo } = require('../models');

async function validar(body, escola_id, idAtual) {
  const nome = String(body.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do esporte');
  const repetido = await EsporteIncentivo.findOne({
    where: {
      escola_id,
      [Op.and]: [sqlWhere(fn('LOWER', col('nome')), nome.toLowerCase())],
      ...(idAtual ? { id: { [Op.ne]: idAtual } } : {}),
    },
  });
  if (repetido) throw new Error(`"${repetido.nome}" já está cadastrado${repetido.ativo ? '' : ' (inativo — reative na lista)'}`);
  const olimpico = body.olimpico === true || body.olimpico === false ? body.olimpico : null;
  return { nome, olimpico };
}

const listar = async (req, res) => {
  try {
    const where = { escola_id: req.usuario.escola_id };
    if (req.query.ativo !== 'todos') where.ativo = req.query.ativo === 'false' ? false : true;
    const esportes = await EsporteIncentivo.findAll({ where, order: [['nome', 'ASC']] });
    const contagens = await ParticipanteIncentivo.count({
      where: { escola_id: req.usuario.escola_id, esporte_id: esportes.map(e => e.id) },
      group: ['esporte_id'],
    });
    const porId = Object.fromEntries(contagens.map(c => [c.esporte_id, c.count]));
    res.json(esportes.map(e => ({ ...e.toJSON(), participantes: porId[e.id] || 0 })));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    let dados;
    try { dados = await validar(req.body, req.usuario.escola_id); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    res.status(201).json(await EsporteIncentivo.create({ ...dados, escola_id: req.usuario.escola_id }));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const esporte = await EsporteIncentivo.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!esporte) return res.status(404).json({ erro: 'Esporte não encontrado' });
    let dados;
    try { dados = await validar(req.body, req.usuario.escola_id, esporte.id); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    await esporte.update({ ...dados, ...(req.body.ativo !== undefined ? { ativo: !!req.body.ativo } : {}) });
    res.json(esporte);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const desativar = async (req, res) => {
  try {
    const esporte = await EsporteIncentivo.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!esporte) return res.status(404).json({ erro: 'Esporte não encontrado' });
    await esporte.update({ ativo: false });
    res.json({ mensagem: 'Esporte desativado' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, desativar };
