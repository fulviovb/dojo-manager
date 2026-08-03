const { GraduacaoAluno, Faixa, ArteMarcial, Usuario, MatriculaAluno, Turma } = require('../models');
const { Op } = require('sequelize');
const { dataLocalISO } = require('../utils/data');

const listar = async (req, res) => {
  try {
    const { aluno_id } = req.query;
    const where = { escola_id: req.usuario.escola_id };
    if (aluno_id) where.aluno_id = aluno_id;
    const graduacoes = await GraduacaoAluno.findAll({
      where,
      include: [
        { model: Faixa },
        { model: ArteMarcial },
      ],
      order: [['data_inicio', 'ASC']],
    });
    res.json(graduacoes);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const { aluno_id, arte_marcial_id, faixa_id, data_inicio, data_fim, atual, observacao } = req.body;

    if (atual) {
      // Desmarca a graduação atual anterior nessa arte
      await GraduacaoAluno.update(
        { atual: false, data_fim: data_inicio || dataLocalISO() },
        { where: { aluno_id, arte_marcial_id, atual: true, escola_id: req.usuario.escola_id } }
      );
    }

    const graduacao = await GraduacaoAluno.create({
      escola_id: req.usuario.escola_id,
      aluno_id, arte_marcial_id, faixa_id,
      data_inicio, data_fim, atual: atual || false, observacao,
    });

    if (atual) {
      // MatriculaAluno.graduacao_atual_faixa_id é um retrato usado pela tela
      // de turma (badge de graduação por aluno matriculado) — precisa ficar
      // sincronizado sempre que a graduação atual mudar, senão fica "presa"
      // na faixa anterior.
      const turmasDaArte = await Turma.findAll({ where: { arte_marcial_id }, attributes: ['id'] });
      await MatriculaAluno.update(
        { graduacao_atual_faixa_id: faixa_id },
        { where: { aluno_id, turma_id: { [Op.in]: turmasDaArte.map((t) => t.id) } } }
      );
    }

    const completo = await GraduacaoAluno.findByPk(graduacao.id, {
      include: [{ model: Faixa }, { model: ArteMarcial }],
    });

    res.status(201).json(completo);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const g = await GraduacaoAluno.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!g) return res.status(404).json({ erro: 'Graduação não encontrada' });
    await g.destroy();
    res.json({ mensagem: 'Graduação removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, remover };
