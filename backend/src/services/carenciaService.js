const { Op } = require('sequelize');
const { GraduacaoAluno, Faixa, CriterioGraduacao, Chamada, Aula, Turma } = require('../models');

// Faixa atual + aulas na faixa × mínimo, em lote. Mesma regra de
// relatoriosController.aulasNaFaixaAtual (presenças em qualquer turma da
// arte desde o início da graduação atual, somando `quantidade`).
// Map aluno_id → { faixa_atual, aulas, min_aulas, situacao }
const carenciaEmLote = async (escola_id, arte_marcial_id, alunoIds) => {
  const mapa = new Map();
  if (!alunoIds.length) return mapa;
  const [graus, criterios] = await Promise.all([
    GraduacaoAluno.findAll({
      where: { escola_id, arte_marcial_id, atual: true, aluno_id: alunoIds },
      include: [{ model: Faixa, attributes: ['id', 'nome', 'cor', 'ordem'] }],
    }),
    CriterioGraduacao.findAll({ where: { escola_id, arte_marcial_id } }),
  ]);
  const comInicio = graus.filter((g) => g.data_inicio);
  const chamadas = comInicio.length ? await Chamada.findAll({
    where: { aluno_id: comInicio.map((g) => g.aluno_id) },
    attributes: ['aluno_id', 'quantidade'],
    include: [{
      model: Aula, attributes: ['data'], required: true,
      where: { data: { [Op.gte]: comInicio.map((g) => g.data_inicio).sort()[0] } },
      include: [{ model: Turma, attributes: [], required: true, where: { arte_marcial_id, escola_id } }],
    }],
  }) : [];
  const inicio = new Map(comInicio.map((g) => [g.aluno_id, g.data_inicio]));
  const aulas = new Map();
  for (const c of chamadas) {
    if (c.Aula.data >= inicio.get(c.aluno_id)) aulas.set(c.aluno_id, (aulas.get(c.aluno_id) || 0) + Number(c.quantidade ?? 0));
  }
  for (const id of alunoIds) {
    const g = graus.find((x) => x.aluno_id === id);
    const crit = g ? criterios.find((c) => c.faixa_id === g.faixa_id) : null;
    const n = aulas.get(id) || 0;
    mapa.set(id, {
      faixa_atual: g?.Faixa ? g.Faixa.toJSON() : null,
      aulas: n,
      min_aulas: crit ? crit.min_aulas : null,
      situacao: !crit ? 'sem_criterio' : n >= crit.min_aulas ? 'ok' : 'abaixo',
    });
  }
  return mapa;
};

module.exports = { carenciaEmLote };
