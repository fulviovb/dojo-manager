// Script one-off: 11 contas de aluno importadas caíram com o e-mail
// "admin@escola.com" (mesmo e-mail da conta real do Administrador) — provável
// valor padrão/placeholder usado durante a importação, não um e-mail real de
// família. Como o login busca por e-mail e pega a primeira conta cuja senha
// bate (ver autenticacaoController.js), essas contas de aluno colidindo com
// a do admin faziam o login em admin@escola.com resolver pra uma conta
// aleatória entre as 12 (não-determinístico) sempre que a senha também
// batia. Corrige atribuindo um e-mail placeholder único (baseado na
// matrícula) só pras contas de aluno — a conta admin mantém
// admin@escola.com. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-09-corrigir-email-admin-duplicado.js
const sequelize = require('../config/database');

async function main() {
  await sequelize.authenticate();

  const [antes] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM usuarios WHERE email = 'admin@escola.com'`
  );
  console.log(`Contas com admin@escola.com antes da correção: ${antes[0].total}`);

  const [result] = await sequelize.query(
    `UPDATE usuarios
     SET email = CONCAT('sememail.', matricula, '@placeholder.local')
     WHERE email = 'admin@escola.com' AND role != 'admin'`
  );
  console.log(`✓ ${result.affectedRows ?? result.changedRows ?? 0} conta(s) de aluno corrigida(s)`);

  const [depois] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM usuarios WHERE email = 'admin@escola.com'`
  );
  console.log(`Contas com admin@escola.com depois: ${depois[0].total} (deve ser 1 — só o Administrador)`);

  console.log('✓ Correção aplicada com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar correção:', e);
  process.exit(1);
});
