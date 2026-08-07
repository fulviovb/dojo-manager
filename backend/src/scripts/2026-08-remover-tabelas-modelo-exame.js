// Script one-off: remove as tabelas de template do Exame de Faixa
// (fases_exame_modelo, criterios_exame_modelo, criterios_exame_modelo_faixa)
// — decisão revertida: o roteiro passou a ser editado direto na tela do
// Exame (copiado do exame mais recente da mesma arte marcial), sem uma
// tela de template separada em Configurações. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-remover-tabelas-modelo-exame.js
const sequelize = require('../config/database');

async function main() {
  await sequelize.authenticate();
  await sequelize.query('DROP TABLE IF EXISTS criterios_exame_modelo_faixa');
  await sequelize.query('DROP TABLE IF EXISTS criterios_exame_modelo');
  await sequelize.query('DROP TABLE IF EXISTS fases_exame_modelo');
  console.log('✓ Tabelas de template do Exame de Faixa removidas.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao remover tabelas:', e);
  process.exit(1);
});
