const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Bolsa já RECEBIDA num ciclo do Incentivo ao Esporte (acompanhamento de
// gastos e prestação de contas). É separada de ParticipanteIncentivo, que é a
// INSCRIÇÃO de um ciclo futuro (ex.: 2027) — misturar os dois faria os gastos
// de 2026 aparecerem na ficha de inscrição de 2027. Por isso guarda o próprio
// nome e só aponta opcionalmente pro aluno (há bolsistas sem cadastro de aluno).
//
// Dois valores: a bolsa (1º repasse) e a suplementação (2º semestre, nem todo
// atleta recebe). A suplementação tem que ser comprovada com gastos feitos NO
// 2º SEMESTRE do ano — gasto do 1º semestre não conta pra ela, mesmo que
// cubra a soma dos dois valores.
const BolsaIncentivo = sequelize.define('BolsaIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  ano: { type: DataTypes.INTEGER, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  aluno_id: { type: DataTypes.UUID },

  valor_bolsa: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  data_recebimento_bolsa: { type: DataTypes.DATEONLY },
  valor_suplementacao: { type: DataTypes.DECIMAL(10, 2) }, // null = não recebeu
  data_recebimento_suplementacao: { type: DataTypes.DATEONLY },

  situacao_prestacao: {
    type: DataTypes.ENUM('em_andamento', 'entregue', 'aprovada', 'pendencia'),
    allowNull: false, defaultValue: 'em_andamento',
  },
  observacao: { type: DataTypes.TEXT },
}, {
  tableName: 'bolsas_incentivo',
  indexes: [{ unique: true, fields: ['escola_id', 'ano', 'nome'] }],
});

module.exports = BolsaIncentivo;
