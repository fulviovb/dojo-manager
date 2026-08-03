// Script one-off: aplica no banco as colunas novas do módulo de Gestão
// Financeira (Assinaturas/Faturas). server.js roda sync({alter:false}), então
// colunas novas em tabelas EXISTENTES não são criadas sozinhas — só a tabela
// nova (assinaturas_aluno) é. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-financeiro-schema.js
const sequelize = require('../config/database');

const COLUNA_JA_EXISTE = 'ER_DUP_FIELDNAME';
const INDICE_JA_EXISTE = 'ER_DUP_KEYNAME';

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
    `ALTER TABLE planos_mensalidade ADD COLUMN periodicidade ENUM('mensal','trimestral','semestral','anual') NOT NULL DEFAULT 'mensal'`,
    [COLUNA_JA_EXISTE]
  );

  await alterarSeNecessario(
    `ALTER TABLE mensalidades ADD COLUMN assinatura_id CHAR(36) NULL`,
    [COLUNA_JA_EXISTE]
  );
  await alterarSeNecessario(
    `ALTER TABLE mensalidades ADD COLUMN data_vencimento DATE NULL`,
    [COLUNA_JA_EXISTE]
  );
  await alterarSeNecessario(
    `ALTER TABLE mensalidades ADD COLUMN juros DECIMAL(10,2) NOT NULL DEFAULT 0`,
    [COLUNA_JA_EXISTE]
  );

  const [result] = await sequelize.query(
    `UPDATE mensalidades SET data_vencimento = mes_referencia WHERE data_vencimento IS NULL`
  );
  console.log(`✓ backfill data_vencimento: ${result.affectedRows ?? result.changedRows ?? 0} linha(s)`);

  await alterarSeNecessario(
    `ALTER TABLE mensalidades ADD UNIQUE INDEX mensalidades_assinatura_vencimento (assinatura_id, data_vencimento)`,
    [INDICE_JA_EXISTE]
  );

  console.log('✓ Schema financeiro aplicado com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar schema:', e);
  process.exit(1);
});
