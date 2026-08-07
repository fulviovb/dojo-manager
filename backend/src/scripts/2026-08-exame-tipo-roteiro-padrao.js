// Script one-off: coluna `tipo` em `exames` — permite marcar um exame como
// 'roteiro_padrao' (fonte fixa pro botão "Começar exame com base em
// roteiro padrão"), protegido contra exclusão. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-exame-tipo-roteiro-padrao.js
const sequelize = require('../config/database');

const CODIGO_JA_EXISTE = ['ER_DUP_FIELDNAME'];

async function main() {
  await sequelize.authenticate();
  try {
    await sequelize.query(
      "ALTER TABLE exames ADD COLUMN tipo ENUM('normal','roteiro_padrao') NOT NULL DEFAULT 'normal'"
    );
    console.log('✓ coluna tipo criada em exames');
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
