// Script one-off: CPF passa a ser o identificador único do aluno; e-mail
// deixa de ser único no schema (irmãos menores costumam compartilhar o
// e-mail dos pais — só precisa ser único pra quem loga de verdade,
// admin/professor, e isso é validado na aplicação).
// Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-cpf-unico.js
const sequelize = require('../config/database');

const CODIGO_JA_EXISTE = ['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_CANT_DROP_FIELD_OR_KEY'];

async function rodar(sql, descricao) {
  try {
    await sequelize.query(sql);
    console.log('✓', descricao);
  } catch (e) {
    if (CODIGO_JA_EXISTE.includes(e.original?.code)) {
      console.log('· (já aplicado, ignorando)', descricao);
    } else {
      throw e;
    }
  }
}

async function main() {
  await sequelize.authenticate();

  const [result] = await sequelize.query(
    `UPDATE usuarios SET cpf = NULL WHERE cpf IS NOT NULL AND TRIM(cpf) = ''`
  );
  console.log(`✓ normalizados ${result.affectedRows ?? result.changedRows ?? 0} CPF(s) em branco para NULL`);

  await rodar(`ALTER TABLE usuarios DROP INDEX email`, 'removido índice único de email');
  await rodar(`ALTER TABLE usuarios ADD UNIQUE INDEX cpf (cpf)`, 'criado índice único de cpf');

  console.log('✓ Migração aplicada com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar migração:', e);
  process.exit(1);
});
