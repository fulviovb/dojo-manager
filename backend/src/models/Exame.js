const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exame = sequelize.define('Exame', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  arte_marcial_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('planejamento', 'em_andamento', 'finalizado'),
    allowNull: false,
    defaultValue: 'planejamento',
  },
}, { tableName: 'exames' });

module.exports = Exame;
