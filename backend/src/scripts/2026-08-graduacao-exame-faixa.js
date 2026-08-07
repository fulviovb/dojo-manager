// Script one-off: colunas `exame_participante_id` e `nota_exame` em
// `graduacoes_aluno` — preenchidas quando a graduação é confirmada a partir
// do relatório do Módulo de Exame de Faixa (ambas opcionais, fluxo manual
// de graduação continua igual). Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-graduacao-exame-faixa.js
const sequelize = require('../config/database');

const CODIGO_JA_EXISTE = ['ER_DUP_FIELDNAME'];

async function adicionarColuna(sql, descricao) {
  try {
    await sequelize.query(sql);
    console.log(`✓ ${descricao}`);
  } catch (e) {
    if (CODIGO_JA_EXISTE.includes(e.original?.code)) {
      console.log(`· ${descricao} (já aplicado, ignorando)`);
    } else {
      throw e;
    }
  }
}

async function main() {
  await sequelize.authenticate();
  await adicionarColuna(
    'ALTER TABLE graduacoes_aluno ADD COLUMN exame_participante_id CHAR(36) NULL',
    'coluna exame_participante_id criada em graduacoes_aluno'
  );
  await adicionarColuna(
    'ALTER TABLE graduacoes_aluno ADD COLUMN nota_exame DECIMAL(5,2) NULL',
    'coluna nota_exame criada em graduacoes_aluno'
  );
  console.log('✓ Migração aplicada com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar migração:', e);
  process.exit(1);
});
