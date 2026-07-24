const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Aula = sequelize.define('Aula', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  turma_id: { type: DataTypes.UUID, allowNull: false },
  sala_id: { type: DataTypes.UUID, allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  hora_inicio: { type: DataTypes.TIME, allowNull: false },
  hora_fim: { type: DataTypes.TIME, allowNull: false },
  status: { type: DataTypes.ENUM('aberta', 'fechada'), defaultValue: 'aberta' },
}, { tableName: 'aulas' });

module.exports = Aula;
