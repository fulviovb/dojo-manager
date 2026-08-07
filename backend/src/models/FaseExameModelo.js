const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FaseExameModelo = sequelize.define('FaseExameModelo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  arte_marcial_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'fases_exame_modelo' });

module.exports = FaseExameModelo;
