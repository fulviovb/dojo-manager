const { GraduacaoAluno, Faixa, ArteMarcial } = require('../models');
const { registrarGraduacao } = require('../services/graduacaoService');

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
    const {
      aluno_id, arte_marcial_id, faixa_id, data_inicio, data_fim, atual, observacao,
      exame_participante_id, nota_exame,
    } = req.body;

    const graduacao = await registrarGraduacao({
      escola_id: req.usuario.escola_id,
      aluno_id, arte_marcial_id, faixa_id, data_inicio, data_fim, atual, observacao,
      // Preenchidos quando a graduação vem confirmada a partir do relatório
      // do Módulo de Exame de Faixa (opcionais — fluxo manual não muda).
      exame_participante_id, nota_exame,
    });

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
