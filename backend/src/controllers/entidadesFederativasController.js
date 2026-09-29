const { Op } = require('sequelize');
const { EntidadeFederativa, ParticipanteIncentivo } = require('../models');

// CNPJ opcional; se vier, precisa ter 14 dígitos e dígitos verificadores
// válidos. Devolve formatado, ou null se vazio. Lança Error com mensagem
// pro usuário se inválido.
function normalizarCnpj(valor) {
  const d = String(valor || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) throw new Error('CNPJ inválido');
  const dv = (base) => {
    let soma = 0; let peso = base.length - 7;
    for (const n of base) { soma += Number(n) * peso--; if (peso < 2) peso = 9; }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  if (dv(d.slice(0, 12)) !== Number(d[12]) || dv(d.slice(0, 13)) !== Number(d[13])) throw new Error('CNPJ inválido');
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

async function validarDados(body, escola_id, idAtual) {
  const nome = String(body.nome || '').trim();
  if (!nome) throw new Error('Informe o nome da entidade');
  const cnpj = normalizarCnpj(body.cnpj);
  if (cnpj) {
    const duplicada = await EntidadeFederativa.findOne({
      where: { escola_id, cnpj, ...(idAtual ? { id: { [Op.ne]: idAtual } } : {}) },
    });
    if (duplicada) throw new Error(`CNPJ já cadastrado para "${duplicada.nome}"`);
  }
  return { nome, cnpj, cidade: String(body.cidade || '').trim() || null };
}

const listar = async (req, res) => {
  try {
    const where = { escola_id: req.usuario.escola_id };
    if (req.query.ativo !== 'todos') where.ativo = req.query.ativo === 'false' ? false : true;
    const entidades = await EntidadeFederativa.findAll({ where, order: [['nome', 'ASC']] });
    // Quantos participantes usam cada uma — ajuda a decidir antes de desativar.
    const contagens = await ParticipanteIncentivo.count({
      where: { escola_id: req.usuario.escola_id, entidade_federativa_id: entidades.map(e => e.id) },
      group: ['entidade_federativa_id'],
    });
    const porId = Object.fromEntries(contagens.map(c => [c.entidade_federativa_id, c.count]));
    res.json(entidades.map(e => ({ ...e.toJSON(), participantes: porId[e.id] || 0 })));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    let dados;
    try { dados = await validarDados(req.body, req.usuario.escola_id); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    const entidade = await EntidadeFederativa.create({ ...dados, escola_id: req.usuario.escola_id });
    res.status(201).json(entidade);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const entidade = await EntidadeFederativa.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!entidade) return res.status(404).json({ erro: 'Entidade não encontrada' });
    let dados;
    try { dados = await validarDados(req.body, req.usuario.escola_id, entidade.id); } catch (ex) { return res.status(400).json({ erro: ex.message }); }
    await entidade.update({ ...dados, ...(req.body.ativo !== undefined ? { ativo: !!req.body.ativo } : {}) });
    res.json(entidade);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const desativar = async (req, res) => {
  try {
    const entidade = await EntidadeFederativa.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!entidade) return res.status(404).json({ erro: 'Entidade não encontrada' });
    await entidade.update({ ativo: false });
    res.json({ mensagem: 'Entidade desativada' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// "NOME - CNPJ 00.000.000/0000-00" — formato usado no Anexo XVII.
function textoEntidade(entidade) {
  if (!entidade) return '';
  return entidade.cnpj ? `${entidade.nome} - CNPJ ${entidade.cnpj}` : entidade.nome;
}

module.exports = { listar, criar, atualizar, desativar, normalizarCnpj, textoEntidade };
