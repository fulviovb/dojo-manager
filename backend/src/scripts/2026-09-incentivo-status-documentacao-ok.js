// Script one-off: status_programa ganha 'documentacao_ok' (documentação
// completa, ainda não protocolada) e o default da coluna passa a ser
// 'documentacao_pendente'. ENUM alterado em tabela existente não aparece
// sozinho com sync({alter:false}). Não mexe no status de ninguém.
// Idempotente. Rodar uma vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-status-documentacao-ok.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const colunas = await qi.describeTable('participantes_incentivo');
  if (colunas.status_programa.type.includes('documentacao_ok') && colunas.status_programa.defaultValue === 'documentacao_pendente') {
    console.log('· status_programa já atualizado');
  } else {
    await qi.changeColumn('participantes_incentivo', 'status_programa', {
      type: DataTypes.ENUM('documentacao_pendente', 'documentacao_ok', 'inscrito', 'habilitado', 'indeferido', 'inabilitado'),
      defaultValue: 'documentacao_pendente',
    });
    console.log('✓ status_programa aceita documentacao_ok (default documentacao_pendente)');
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
