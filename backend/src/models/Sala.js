const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Sala = sequelize.define('Sala', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  qr_token: { type: DataTypes.UUID, defaultValue: () => uuidv4(), unique: true },
}, { tableName: 'salas' });

module.exports = Sala;
