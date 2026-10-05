// Script one-off: participantes_incentivo.numero_protocolo (número que a
// SMELJ fornece após o protocolo do projeto). Idempotente.
//   docker compose exec backend node src/scripts/2026-10-incentivo-numero-protocolo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const colunas = await qi.describeTable('participantes_incentivo');
  if (colunas.numero_protocolo) console.log('· numero_protocolo já existe');
  else {
    await qi.addColumn('participantes_incentivo', 'numero_protocolo', { type: DataTypes.STRING(50), allowNull: true });
    console.log('✓ numero_protocolo adicionada');
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
