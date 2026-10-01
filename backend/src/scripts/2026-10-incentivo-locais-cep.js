// Script one-off: CEP no cadastro de locais de treino (primeiro campo,
// obrigatório, do "Adicionar local" no formulário da prefeitura). Adiciona
// a coluna e preenche com o CEP que já estiver escrito no endereço; os sem
// CEP no texto ficam pra completar na aba "Locais". Idempotente.
//   docker compose exec backend node src/scripts/2026-10-incentivo-locais-cep.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { LocalTreino } = require('../models');
const { cepDoTexto } = require('../utils/textoProjeto');

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const colunas = await qi.describeTable('locais_treino');
  if (!colunas.cep) {
    await qi.addColumn('locais_treino', 'cep', { type: DataTypes.STRING(9), allowNull: true });
    console.log('✓ locais_treino.cep adicionada');
  } else console.log('· cep já existe');
  for (const l of await LocalTreino.findAll({ where: { cep: null } })) {
    const cep = cepDoTexto(l.endereco);
    if (cep) { await l.update({ cep }); console.log(`✓ ${l.nome}: ${cep}`); }
    else console.log(`! ${l.nome}: sem CEP no endereço — completar na aba Locais`);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
