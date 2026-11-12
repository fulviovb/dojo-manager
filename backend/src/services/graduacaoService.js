const { Op } = require('sequelize');
const { GraduacaoAluno, MatriculaAluno, Turma } = require('../models');
const { dataLocalISO } = require('../utils/data');

// Registra uma graduação. Com `atual`, encerra a graduação atual anterior
// naquela arte e sincroniza MatriculaAluno.graduacao_atual_faixa_id — o
// retrato usado pela tela de turma (badge por aluno), que senão fica "preso"
// na faixa anterior. Usado pelo "+ Graduação" manual e pelo "Aprovado" da
// indicação ao exame.
const registrarGraduacao = async ({
  escola_id, aluno_id, arte_marcial_id, faixa_id, data_inicio, data_fim, atual, observacao,
  exame_participante_id, nota_exame,
}, { transaction } = {}) => {
  if (atual) {
    await GraduacaoAluno.update(
      { atual: false, data_fim: data_inicio || dataLocalISO() },
      { where: { aluno_id, arte_marcial_id, atual: true, escola_id }, transaction }
    );
  }

  const graduacao = await GraduacaoAluno.create({
    escola_id, aluno_id, arte_marcial_id, faixa_id,
    data_inicio, data_fim, atual: atual || false, observacao,
    exame_participante_id: exame_participante_id || null,
    nota_exame: nota_exame ?? null,
  }, { transaction });

  if (atual) {
    const turmasDaArte = await Turma.findAll({ where: { arte_marcial_id, escola_id }, attributes: ['id'], transaction });
    await MatriculaAluno.update(
      { graduacao_atual_faixa_id: faixa_id },
      { where: { aluno_id, turma_id: { [Op.in]: turmasDaArte.map((t) => t.id) } }, transaction }
    );
  }

  return graduacao;
};

module.exports = { registrarGraduacao };
