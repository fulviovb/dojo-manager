// Script one-off: formulário do projeto (tela "Projeto" do Sistema
// Incentivo online) — colunas novas em tabelas existentes não aparecem com
// sync({alter:false}):
//   - competicoes: data_inicio, data_fim, periodo_texto (calendário);
//   - participantes_incentivo: curriculo_esportivo;
//   - tabelas novas: objetivos_incentivo, competicoes_previstas_incentivo,
//     locais_treino_incentivo (FK pra competicoes com ON DELETE RESTRICT).
// Idempotente. Rodar uma vez:
//   docker compose exec backend node src/scripts/2026-10-incentivo-formulario-projeto.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { ObjetivoIncentivo, CompeticaoPrevistaIncentivo, LocalTreinoIncentivo } = require('../models');

async function adicionar(qi, tabela, colunas) {
  const atuais = await qi.describeTable(tabela);
  for (const [nome, def] of Object.entries(colunas)) {
    if (atuais[nome]) { console.log(`· ${tabela}.${nome} já existe`); continue; }
    await qi.addColumn(tabela, nome, { ...def, allowNull: true });
    console.log(`✓ ${tabela}.${nome} adicionada`);
  }
}

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  await adicionar(qi, 'competicoes', { data_inicio: { type: DataTypes.DATEONLY }, data_fim: { type: DataTypes.DATEONLY }, periodo_texto: { type: DataTypes.STRING } });
  await adicionar(qi, 'participantes_incentivo', { curriculo_esportivo: { type: DataTypes.TEXT } });
  for (const m of [ObjetivoIncentivo, CompeticaoPrevistaIncentivo, LocalTreinoIncentivo]) {
    await m.sync();
    console.log(`✓ tabela ${m.getTableName()} ok`);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
