// Script one-off: Gestão do Exame de Faixa — colunas novas em `exames` e
// `exame_participantes`, status 'cancelado' e 3 tabelas novas. Só adiciona,
// nunca remove. Idempotente. Rodar ANTES de subir o backend novo:
//   docker compose exec backend node src/scripts/2026-11-gestao-exame.js
const { DataTypes: T } = require('sequelize');
const sequelize = require('../config/database');

const COLUNAS = {
  exames: {
    usa_avaliacao: { type: T.BOOLEAN, allowNull: false, defaultValue: true },
    local: { type: T.STRING },
    horario: { type: T.TIME },
    taxa_padrao: { type: T.DECIMAL(10, 2) },
    preco_faixa_padrao: { type: T.DECIMAL(10, 2) },
    prazo_pagamento: { type: T.DATEONLY },
    prazo_pedido_faixa: { type: T.DATEONLY },
    inscricoes_fechadas: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
  },
  exame_participantes: {
    indicacao_exame_id: { type: T.UUID },
    turma_id: { type: T.UUID },
    valor_taxa: { type: T.DECIMAL(10, 2) },
    desconto: { type: T.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    motivo_desconto: { type: T.STRING },
    isento: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
    status_inscricao: { type: T.ENUM('indicado', 'confirmado', 'desistiu'), allowNull: false, defaultValue: 'indicado' },
    presenca: { type: T.ENUM('presente', 'ausente') },
    resultado: { type: T.ENUM('aprovado', 'nao_aprovado') },
    graduacao_aluno_id: { type: T.UUID },
    observacoes: { type: T.TEXT },
  },
};

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  for (const [tabela, colunas] of Object.entries(COLUNAS)) {
    const atuais = await qi.describeTable(tabela);
    for (const [nome, def] of Object.entries(colunas)) {
      if (atuais[nome]) { console.log(`· ${tabela}.${nome} já existe`); continue; }
      await qi.addColumn(tabela, nome, def);
      console.log(`✓ ${tabela}.${nome}`);
    }
  }
  const { status } = await qi.describeTable('exames');
  if (!status.type.includes('cancelado')) {
    await qi.changeColumn('exames', 'status', {
      type: T.ENUM('planejamento', 'em_andamento', 'finalizado', 'cancelado'), allowNull: false, defaultValue: 'planejamento',
    });
    console.log("✓ exames.status aceita 'cancelado'");
  }
  const { ExamePagamento, ExamePedidoFaixa, ExameHistorico } = require('../models');
  for (const M of [ExamePagamento, ExamePedidoFaixa, ExameHistorico]) {
    await M.sync();
    console.log(`✓ tabela ${M.tableName}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
