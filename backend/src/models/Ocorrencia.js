const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ocorrencia = sequelize.define('Ocorrencia', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  professor_id: { type: DataTypes.UUID, allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'ocorrencias' });

module.exports = Ocorrencia;
