const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CriterioExame = sequelize.define('CriterioExame', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fase_exame_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'criterios_exame' });

module.exports = CriterioExame;
