// Script one-off: participantes_incentivo.tecnico_responsavel_id foi
// adicionado ao model depois que a tabela já tinha sido criada pelo
// sync({alter:false}) inicial do módulo Incentivo ao Esporte — coluna nova
// em tabela EXISTENTE não aparece sozinha. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-tecnico-responsavel.js
const sequelize = require('../config/database');

const COLUNA_JA_EXISTE = 'ER_DUP_FIELDNAME';

async function main() {
  await sequelize.authenticate();
  try {
    await sequelize.query(`ALTER TABLE participantes_incentivo ADD COLUMN tecnico_responsavel_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL`);
    console.log('✓ coluna tecnico_responsavel_id adicionada');
  } catch (e) {
    if (e.original?.code === COLUNA_JA_EXISTE) console.log('· (já existe, ignorando)');
    else throw e;
  }
  console.log('✓ Schema aplicado com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar schema:', e);
  process.exit(1);
});
