const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CriterioExameModelo = sequelize.define('CriterioExameModelo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fase_modelo_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'criterios_exame_modelo' });

module.exports = CriterioExameModelo;
