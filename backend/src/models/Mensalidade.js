const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mensalidade = sequelize.define('Mensalidade', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  // Nullable: faturas avulsas (ex: taxa de matrícula) não estão ligadas a um
  // PlanoMensalidade — usam `descricao` no lugar do nome do plano.
  plano_id: { type: DataTypes.UUID },
  assinatura_id: { type: DataTypes.UUID },
  turma_id: { type: DataTypes.UUID },
  descricao: { type: DataTypes.STRING },
  mes_referencia: { type: DataTypes.DATEONLY, allowNull: false },
  data_vencimento: { type: DataTypes.DATEONLY },
  valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  desconto: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  juros: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('pendente', 'pago', 'cancelado'), defaultValue: 'pendente' },
}, {
  tableName: 'mensalidades',
  indexes: [{ unique: true, fields: ['assinatura_id', 'data_vencimento'] }],
});

module.exports = Mensalidade;
