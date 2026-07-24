const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Faixa = sequelize.define('Faixa', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  arte_marcial_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  cor: { type: DataTypes.STRING },
  ordem: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'faixas' });

module.exports = Faixa;
