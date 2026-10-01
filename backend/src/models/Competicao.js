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
  // Competição futura (calendário do Incentivo ao Esporte): datas quando já
  // conhecidas; senão `periodo_texto` livre ("Maio/2027", "2º semestre").
  data_inicio: { type: DataTypes.DATEONLY },
  data_fim: { type: DataTypes.DATEONLY },
  periodo_texto: { type: DataTypes.STRING },
}, { tableName: 'competicoes' });

module.exports = Competicao;
