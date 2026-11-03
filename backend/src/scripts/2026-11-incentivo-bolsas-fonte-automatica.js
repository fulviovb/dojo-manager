// Script one-off: despesas_bolsa_incentivo.fonte passa a aceitar NULL — a
// verba agora é calculada pela data (2º semestre cobre a suplementação
// primeiro). Valores antigos ficam como estão (ignorados). Idempotente.
//   docker compose exec backend node src/scripts/2026-11-incentivo-bolsas-fonte-automatica.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const colunas = await qi.describeTable('despesas_bolsa_incentivo');
  if (colunas.fonte.allowNull) console.log('· fonte já aceita NULL');
  else {
    await qi.changeColumn('despesas_bolsa_incentivo', 'fonte', { type: DataTypes.ENUM('bolsa', 'suplementacao'), allowNull: true });
    console.log('✓ fonte agora aceita NULL');
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
