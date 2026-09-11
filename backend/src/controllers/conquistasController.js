const { Op } = require('sequelize');
const { Competicao, Conquista, Usuario, ArteMarcial, Faixa } = require('../models');

const includeConquista = [
  { model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'foto_url'] },
  { model: ArteMarcial, attributes: ['id', 'nome'] },
  { model: Faixa, attributes: ['id', 'nome', 'cor'] },
  { model: Competicao, attributes: ['id', 'ano', 'nome', 'etapa', 'nivel', 'entidade', 'cidade', 'estado', 'pais'] },
];

// GET /api/conquistas — lista geral com filtros (tela geral da escola)
const listar = async (req, res) => {
  try {
    const { aluno_id, ano, nivel, modalidade, arte_marcial_id, busca } = req.query;
    const where = { escola_id: req.usuario.escola_id };
    if (aluno_id) where.aluno_id = aluno_id;
    if (modalidade) where.modalidade = modalidade;
    if (arte_marcial_id) where.arte_marcial_id = arte_marcial_id;
    if (busca) where.nome_atleta = { [Op.like]: `%${busca}%` };

    const competicaoWhere = {};
    if (ano) competicaoWhere.ano = ano;
    if (nivel) competicaoWhere.nivel = nivel;

    const conquistas = await Conquista.findAll({
      where,
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'foto_url'] },
        { model: ArteMarcial, attributes: ['id', 'nome'] },
        { model: Faixa, attributes: ['id', 'nome', 'cor'] },
        {
          model: Competicao,
          attributes: ['id', 'ano', 'nome', 'etapa', 'nivel', 'entidade', 'cidade', 'estado', 'pais'],
          where: Object.keys(competicaoWhere).length ? competicaoWhere : undefined,
        },
      ],
      order: [[Competicao, 'ano', 'DESC'], ['nome_atleta', 'ASC']],
    });
    res.json(conquistas);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/conquistas/aluno/:aluno_id — histórico do aluno (aba no perfil)
const listarPorAluno = async (req, res) => {
  try {
    const conquistas = await Conquista.findAll({
      where: { escola_id: req.usuario.escola_id, aluno_id: req.params.aluno_id },
      include: includeConquista,
      order: [[Competicao, 'ano', 'DESC']],
    });
    res.json(conquistas);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const conquista = await Conquista.create({ ...req.body, escola_id: req.usuario.escola_id });
    const completa = await Conquista.findByPk(conquista.id, { include: includeConquista });
    res.status(201).json(completa);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const conquista = await Conquista.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!conquista) return res.status(404).json({ erro: 'Conquista não encontrada' });
    await conquista.update(req.body);
    const completa = await Conquista.findByPk(conquista.id, { include: includeConquista });
    res.json(completa);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const conquista = await Conquista.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!conquista) return res.status(404).json({ erro: 'Conquista não encontrada' });
    await conquista.destroy();
    res.json({ mensagem: 'Conquista removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// --- Competições ---

const listarCompeticoes = async (req, res) => {
  try {
    const { ano } = req.query;
    const where = { escola_id: req.usuario.escola_id };
    if (ano) where.ano = ano;
    const competicoes = await Competicao.findAll({ where, order: [['ano', 'DESC'], ['nome', 'ASC']] });
    res.json(competicoes);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criarCompeticao = async (req, res) => {
  try {
    const competicao = await Competicao.create({ ...req.body, escola_id: req.usuario.escola_id });
    res.status(201).json(competicao);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizarCompeticao = async (req, res) => {
  try {
    const competicao = await Competicao.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!competicao) return res.status(404).json({ erro: 'Competição não encontrada' });
    await competicao.update(req.body);
    res.json(competicao);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const removerCompeticao = async (req, res) => {
  try {
    const competicao = await Competicao.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!competicao) return res.status(404).json({ erro: 'Competição não encontrada' });
    const totalConquistas = await Conquista.count({ where: { competicao_id: competicao.id } });
    if (totalConquistas > 0) {
      return res.status(400).json({ erro: 'Remova as conquistas vinculadas a esta competição antes de excluí-la' });
    }
    await competicao.destroy();
    res.json({ mensagem: 'Competição removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = {
  listar, listarPorAluno, criar, atualizar, remover,
  listarCompeticoes, criarCompeticao, atualizarCompeticao, removerCompeticao,
};
