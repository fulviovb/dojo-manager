// Script one-off: coluna `cor_secundaria` em `faixas`, pra permitir faixa de
// duas cores (ex: Cinza-Branca) com cores explícitas em vez de depender só
// do nome. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-faixa-cor-secundaria.js
const sequelize = require('../config/database');

const CODIGO_JA_EXISTE = ['ER_DUP_FIELDNAME'];

async function main() {
  await sequelize.authenticate();
  try {
    await sequelize.query('ALTER TABLE faixas ADD COLUMN cor_secundaria VARCHAR(20) NULL');
    console.log('✓ coluna cor_secundaria criada em faixas');
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
