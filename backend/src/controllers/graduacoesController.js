const sequelize = require('../config/database');
const {
  GraduacaoAluno, Faixa, ArteMarcial, Usuario, ExameParticipante, IndicacaoExame, ExameHistorico,
} = require('../models');
const { ErroRegra, responderErro, podeGerenciar } = require('../services/indicacaoExameService');
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

// "+ Graduação" manual. Aprovação em exame tem caminho próprio
// (POST /exames/:id/resultado), por isso aqui não se aceita nota nem vínculo.
// Professor: só alunos das turmas dele naquela arte.
const criar = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { aluno_id, arte_marcial_id, faixa_id, data_inicio, data_fim, atual, observacao } = req.body;
    if (!aluno_id || !arte_marcial_id || !faixa_id) return res.status(400).json({ erro: 'Aluno, arte marcial e faixa são obrigatórios' });

    const [aluno, arte, faixa] = await Promise.all([
      Usuario.findOne({ where: { id: aluno_id, escola_id, role: 'aluno' }, attributes: ['id'] }),
      ArteMarcial.findOne({ where: { id: arte_marcial_id, escola_id }, attributes: ['id'] }),
      Faixa.findOne({ where: { id: faixa_id, arte_marcial_id }, attributes: ['id'] }),
    ]);
    if (!aluno || !arte || !faixa) return res.status(404).json({ erro: 'Aluno, arte marcial ou faixa não encontrado' });
    if (!(await podeGerenciar(req.usuario, aluno_id, arte_marcial_id))) return res.status(403).json({ erro: 'Sem permissão para este aluno' });

    const graduacao = await sequelize.transaction((transaction) => registrarGraduacao({
      escola_id, aluno_id, arte_marcial_id, faixa_id, data_inicio, data_fim, atual, observacao,
    }, { transaction }));

    const completo = await GraduacaoAluno.findByPk(graduacao.id, {
      include: [{ model: Faixa }, { model: ArteMarcial }],
    });

    res.status(201).json(completo);
  } catch (e) { responderErro(res, e); }
};

// Graduação vinda de exame: desfazer também libera o candidato e reabre a
// indicação, senão ele nunca mais poderia receber resultado (RN-14).
const remover = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const g = await GraduacaoAluno.findOne({
        where: { id: req.params.id, escola_id: req.usuario.escola_id }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!g) throw new ErroRegra(404, 'Graduação não encontrada');
      if (!(await podeGerenciar(req.usuario, g.aluno_id, g.arte_marcial_id))) throw new ErroRegra(403, 'Sem permissão para este aluno');
      const cand = await ExameParticipante.findOne({ where: { graduacao_aluno_id: g.id }, transaction });
      if (cand) {
        await cand.update({ graduacao_aluno_id: null, resultado: null }, { transaction });
        const aberta = await IndicacaoExame.findOne({
          where: { escola_id: g.escola_id, aluno_id: g.aluno_id, arte_marcial_id: g.arte_marcial_id, status: 'indicado' }, transaction,
        });
        if (!aberta) {
          await IndicacaoExame.update({ status: 'indicado', data_aprovacao: null, graduacao_id: null },
            { where: { id: cand.indicacao_exame_id, graduacao_id: g.id }, transaction });
        }
        await ExameHistorico.create({
          escola_id: g.escola_id, exame_id: cand.exame_id, exame_participante_id: cand.id, tipo: 'resultado',
          descricao: 'Graduação removida: resultado desfeito', usuario_id: req.usuario.id,
        }, { transaction });
      }
      await g.destroy({ transaction });
    });
    res.json({ mensagem: 'Graduação removida' });
  } catch (e) { responderErro(res, e); }
};

module.exports = { listar, criar, remover };
