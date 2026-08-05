// Script one-off: coluna `data_proximo_exame` em `artes_marciais` — data
// prevista do próximo exame de faixa, configurável em Configurações, usada
// pelo "Semáforo de Graduação" pra calcular quantas aulas ainda restam até
// lá. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-arte-marcial-data-exame.js
const sequelize = require('../config/database');

const CODIGO_JA_EXISTE = ['ER_DUP_FIELDNAME'];

async function main() {
  await sequelize.authenticate();
  try {
    await sequelize.query('ALTER TABLE artes_marciais ADD COLUMN data_proximo_exame DATE NULL');
    console.log('✓ coluna data_proximo_exame criada em artes_marciais');
  } catch (e) {
    if (CODIGO_JA_EXISTE.includes(e.original?.code)) {
      console.log('· (já aplicado, ignorando)');
    } else {
      throw e;
    }
  }
  console.log('✓ Migração aplicada com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar migração:', e);
  process.exit(1);
});
