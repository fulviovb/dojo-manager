// Script one-off: aplica no banco as mudanças de schema do módulo de Treino
// Extra. server.js roda sync({alter:false}), então coluna nova em tabela
// EXISTENTE (turmas.tipo) e alteração de coluna existente (aulas.sala_id
// virando nullable) não acontecem sozinhas. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-09-treino-extra-schema.js
const sequelize = require('../config/database');

const COLUNA_JA_EXISTE = 'ER_DUP_FIELDNAME';

async function alterarSeNecessario(sql, codigosIgnoraveis) {
  try {
    await sequelize.query(sql);
    console.log('✓', sql);
  } catch (e) {
    if (codigosIgnoraveis.includes(e.original?.code)) {
      console.log('· (já existe, ignorando)', sql);
    } else {
      throw e;
    }
  }
}

async function main() {
  await sequelize.authenticate();

  await alterarSeNecessario(
    `ALTER TABLE turmas ADD COLUMN tipo ENUM('regular','treino_extra') NOT NULL DEFAULT 'regular'`,
    [COLUNA_JA_EXISTE]
  );

  // MODIFY (não ADD) — sempre roda, mas é idempotente (só afeta nulidade).
  // Charset/collation precisam bater exatamente com salas.id (FK aulas_ibfk_2),
  // senão o MySQL recusa a alteração como "incompatible columns".
  await sequelize.query(
    `ALTER TABLE aulas MODIFY COLUMN sala_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL`
  );
  console.log('✓ aulas.sala_id agora aceita NULL');

  console.log('✓ Schema de Treino Extra aplicado com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar schema:', e);
  process.exit(1);
});
