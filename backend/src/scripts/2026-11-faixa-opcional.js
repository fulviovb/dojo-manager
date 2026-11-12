// Script one-off: faixas.opcional — faixa que o aluno pode pular no exame
// (na indicação ao próximo exame o sistema pergunta se o exame é para ela ou
// para a seguinte). Marca Cinza e Marrom 3 do Karatê Shotokan. Idempotente.
//   docker compose exec backend node src/scripts/2026-11-faixa-opcional.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const colunas = await qi.describeTable('faixas');
  if (colunas.opcional) console.log('· opcional já existe');
  else {
    await qi.addColumn('faixas', 'opcional', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    console.log('✓ opcional adicionada');
  }
  // Model carregado só depois da coluna existir
  const { ArteMarcial, Faixa } = require('../models');
  const artes = await ArteMarcial.findAll({ where: { nome: 'Karatê Shotokan' } });
  for (const arte of artes) {
    const [n] = await Faixa.update({ opcional: true }, { where: { arte_marcial_id: arte.id, nome: ['Cinza', 'Marrom 3'] } });
    console.log(`✓ ${arte.nome}: ${n} faixa(s) marcadas como opcionais`);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
