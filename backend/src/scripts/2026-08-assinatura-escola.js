// Script one-off: coluna `assinatura_url` em `escolas`, pra cada escola
// poder ter sua própria assinatura desenhada (recibo), guardada em arquivo
// (uploads/assinaturas/), assim como já acontece com foto_url do aluno.
// Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-assinatura-escola.js
const sequelize = require('../config/database');

const CODIGO_JA_EXISTE = ['ER_DUP_FIELDNAME'];

async function main() {
  await sequelize.authenticate();
  try {
    await sequelize.query('ALTER TABLE escolas ADD COLUMN assinatura_url VARCHAR(255) NULL');
    console.log('✓ coluna assinatura_url criada em escolas');
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
