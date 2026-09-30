// Script one-off: cadastro de esportes do Incentivo ao Esporte.
//   1. cria esportes_incentivo e a coluna participantes_incentivo.esporte_id
//      (coluna nova em tabela existente não aparece com sync({alter:false}));
//   2. para cada arte marcial usada por participantes, cria um esporte de
//      mesmo nome na escola e aponta os participantes pra ele.
// arte_marcial_id fica na tabela (legado), sem uso. Idempotente. Rodar uma vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-esportes.js
const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');
const { ParticipanteIncentivo, EsporteIncentivo, ArteMarcial } = require('../models');

async function main() {
  await sequelize.authenticate();
  await EsporteIncentivo.sync();
  const qi = sequelize.getQueryInterface();
  const colunas = await qi.describeTable('participantes_incentivo');
  if (!colunas.esporte_id) {
    await qi.addColumn('participantes_incentivo', 'esporte_id', { type: DataTypes.UUID, allowNull: true });
    console.log('✓ coluna esporte_id adicionada');
  } else console.log('· coluna esporte_id já existe');

  const pendentes = await ParticipanteIncentivo.findAll({
    where: { arte_marcial_id: { [Op.ne]: null }, esporte_id: null },
    include: [{ model: ArteMarcial }],
  });
  for (const p of pendentes) {
    if (!p.ArteMarcial) { console.log(`! ${p.nome}: arte marcial ${p.arte_marcial_id} não existe mais`); continue; }
    const [esporte, novo] = await EsporteIncentivo.findOrCreate({
      where: { escola_id: p.escola_id, nome: p.ArteMarcial.nome },
      defaults: { escola_id: p.escola_id, nome: p.ArteMarcial.nome },
    });
    if (novo) console.log(`✓ esporte criado: ${esporte.nome}`);
    await p.update({ esporte_id: esporte.id });
  }
  console.log(`✓ ${pendentes.length} participante(s) apontado(s) pro esporte`);
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
