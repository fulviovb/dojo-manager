// Script one-off: schema do módulo Evolução Infantil. server.js roda
// sync({alter:false}) — cria a tabela nova sozinho, mas não a coluna nova
// em tabela existente (turmas.educacao_infantil). Idempotente. Rodar:
//   docker compose exec backend node src/scripts/2026-10-evolucao-infantil-schema.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { FichaEvolucaoInfantil } = require('../models');

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();

  const colunas = await qi.describeTable('turmas');
  if (colunas.educacao_infantil) {
    console.log('· turmas.educacao_infantil já existe');
  } else {
    await qi.addColumn('turmas', 'educacao_infantil', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    console.log('✓ turmas.educacao_infantil criada');
  }

  await FichaEvolucaoInfantil.sync();
  console.log('✓ tabela fichas_evolucao_infantil ok');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar schema:', e);
  process.exit(1);
});
