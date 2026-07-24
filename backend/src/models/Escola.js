const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Escola = sequelize.define('Escola', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nome: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  logo_url: { type: DataTypes.STRING },
  threshold_falta_vermelho: { type: DataTypes.INTEGER, defaultValue: 40 },
  ativa: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'escolas' });

module.exports = Escola;
