// Script one-off: Pessoa Jurídica como proponente no Incentivo ao Esporte.
// Coluna nova / ENUM alterado em tabela existente não aparecem sozinhos
// com sync({alter:false}):
//   - tipo_pessoa ganha 'pessoa_juridica';
//   - colunas cnpj, responsavel_financeiro_nome/rg/cpf, local_execucao,
//     projeto_nome.
// Idempotente. Rodar uma vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-pessoa-juridica.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const colunas = await qi.describeTable('participantes_incentivo');

  if (!colunas.tipo_pessoa.type.includes('pessoa_juridica')) {
    await qi.changeColumn('participantes_incentivo', 'tipo_pessoa', {
      type: DataTypes.ENUM('atleta', 'tecnico', 'pessoa_juridica'), allowNull: false,
    });
    console.log('✓ tipo_pessoa aceita pessoa_juridica');
  } else console.log('· tipo_pessoa já aceita pessoa_juridica');

  const novas = {
    cnpj: DataTypes.STRING(18),
    responsavel_financeiro_nome: DataTypes.STRING,
    responsavel_financeiro_rg: DataTypes.STRING,
    responsavel_financeiro_cpf: DataTypes.STRING,
    local_execucao: DataTypes.STRING,
    projeto_nome: DataTypes.STRING,
  };
  for (const [nome, type] of Object.entries(novas)) {
    if (colunas[nome]) { console.log(`· ${nome} já existe`); continue; }
    await qi.addColumn('participantes_incentivo', nome, { type, allowNull: true });
    console.log(`✓ coluna ${nome} adicionada`);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
