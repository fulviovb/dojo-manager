const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mensalidade = sequelize.define('Mensalidade', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  plano_id: { type: DataTypes.UUID, allowNull: false },
  mes_referencia: { type: DataTypes.DATEONLY, allowNull: false },
  valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  desconto: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('pendente', 'pago', 'cancelado'), defaultValue: 'pendente' },
}, { tableName: 'mensalidades' });

module.exports = Mensalidade;
