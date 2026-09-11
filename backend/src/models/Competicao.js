const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Competicao = sequelize.define('Competicao', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  ano: { type: DataTypes.INTEGER, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  etapa: { type: DataTypes.STRING },
  nivel: {
    type: DataTypes.ENUM('municipal', 'estadual', 'nacional', 'panamericano', 'mundial'),
    allowNull: false,
  },
  entidade: { type: DataTypes.STRING },
  cidade: { type: DataTypes.STRING },
  estado: { type: DataTypes.STRING(2) },
  pais: { type: DataTypes.STRING, defaultValue: 'Brasil' },
}, { tableName: 'competicoes' });

module.exports = Competicao;
