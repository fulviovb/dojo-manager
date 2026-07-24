const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArteMarcial = sequelize.define('ArteMarcial', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'artes_marciais', indexes: [{ unique: true, fields: ['escola_id', 'nome'] }] });

module.exports = ArteMarcial;
