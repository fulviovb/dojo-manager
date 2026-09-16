// Script one-off: aplica no banco as mudanças de schema da Taxa de Matrícula
// (cobrança única, opcional por turma, gerada ao matricular um aluno).
// server.js roda sync({alter:false}), então coluna nova em tabela EXISTENTE
// (turmas.taxa_matricula, mensalidades.descricao, mensalidades.turma_id) e
// alteração de coluna existente (mensalidades.plano_id virando nullable, pra
// permitir fatura de taxa sem vínculo com um Plano de mensalidade) não
// acontecem sozinhas. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-09-taxa-matricula-schema.js
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
    `ALTER TABLE turmas ADD COLUMN taxa_matricula DECIMAL(10,2) NULL`,
    [COLUNA_JA_EXISTE]
  );

  // MODIFY (não ADD) — sempre roda, mas é idempotente. Charset/collation
  // precisam bater exatamente com planos_mensalidade.id (FK
  // mensalidades_ibfk_2), senão o MySQL recusa a alteração como
  // "incompatible columns".
  await sequelize.query(
    `ALTER TABLE mensalidades MODIFY COLUMN plano_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL`
  );
  console.log('✓ mensalidades.plano_id agora aceita NULL');

  await alterarSeNecessario(
    `ALTER TABLE mensalidades ADD COLUMN descricao VARCHAR(255) NULL`,
    [COLUNA_JA_EXISTE]
  );
  await alterarSeNecessario(
    `ALTER TABLE mensalidades ADD COLUMN turma_id CHAR(36) NULL`,
    [COLUNA_JA_EXISTE]
  );

  console.log('✓ Schema de Taxa de Matrícula aplicado com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar schema:', e);
  process.exit(1);
});
