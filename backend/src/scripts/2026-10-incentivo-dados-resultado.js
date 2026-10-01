// Script one-off: dados de cada comprovante de resultado (evento,
// colocação, ano, competição, entidade promotora) em documentos_incentivo.
// Coluna nova em tabela existente não aparece com sync({alter:false}).
// Idempotente. Rodar uma vez:
//   docker compose exec backend node src/scripts/2026-10-incentivo-dados-resultado.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const atuais = await qi.describeTable('documentos_incentivo');
  const novas = {
    resultado_evento: DataTypes.STRING(30), resultado_colocacao: DataTypes.INTEGER, resultado_ano: DataTypes.INTEGER,
    resultado_competicao: DataTypes.STRING, resultado_entidade: DataTypes.STRING,
  };
  for (const [nome, type] of Object.entries(novas)) {
    if (atuais[nome]) { console.log(`· ${nome} já existe`); continue; }
    await qi.addColumn('documentos_incentivo', nome, { type, allowNull: true });
    console.log(`✓ ${nome} adicionada`);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
