const { FaseExame, CriterioExame, CriterioExameFaixa } = require('../models');

// Monta { id, nome, ordem, criterios: [{ id, nome, ordem, faixa_ids }] }
// a partir das FaseExame/CriterioExame já criadas (instância do exame).
const buscarFasesDoExame = async (exameId, { transaction } = {}) => {
  const fases = await FaseExame.findAll({
    where: { exame_id: exameId },
    include: [{ model: CriterioExame, include: [{ model: CriterioExameFaixa, attributes: ['faixa_id'] }] }],
    order: [['ordem', 'ASC'], [CriterioExame, 'ordem', 'ASC']],
    transaction,
  });
  return fases.map((fase) => ({
    id: fase.id,
    nome: fase.nome,
    ordem: fase.ordem,
    criterios: fase.CriterioExames.map((c) => ({
      id: c.id,
      nome: c.nome,
      ordem: c.ordem,
      faixa_ids: c.CriterioExameFaixas.map((f) => f.faixa_id),
    })),
  }));
};

// Copia fases/critérios/faixas-aplicáveis de um exame de origem pra um
// exame de destino recém-criado — usado tanto pelo "+ Novo Exame" (copia
// do mais recente) quanto por "Começar exame com base em roteiro padrão"
// (copia especificamente do exame tipo='roteiro_padrao' da arte).
const copiarRoteiro = async (origemExameId, destinoExameId, { transaction } = {}) => {
  const fasesOrigem = await buscarFasesDoExame(origemExameId, { transaction });
  for (const faseOrigem of fasesOrigem) {
    const fase = await FaseExame.create({ exame_id: destinoExameId, nome: faseOrigem.nome, ordem: faseOrigem.ordem }, { transaction });
    for (const criterioOrigem of faseOrigem.criterios) {
      const criterio = await CriterioExame.create({
        fase_exame_id: fase.id, nome: criterioOrigem.nome, ordem: criterioOrigem.ordem,
      }, { transaction });
      if (criterioOrigem.faixa_ids.length > 0) {
        await CriterioExameFaixa.bulkCreate(
          criterioOrigem.faixa_ids.map((faixa_id) => ({ criterio_exame_id: criterio.id, faixa_id })),
          { transaction }
        );
      }
    }
  }
};

module.exports = { buscarFasesDoExame, copiarRoteiro };
