const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AssinaturaAluno = sequelize.define('AssinaturaAluno', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  plano_id: { type: DataTypes.UUID, allowNull: false },
  dia_vencimento: { type: DataTypes.INTEGER, allowNull: false },
  data_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  proximo_vencimento: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('ativa', 'pausada', 'finalizada'), defaultValue: 'ativa' },
  observacao: { type: DataTypes.TEXT },
}, { tableName: 'assinaturas_aluno' });

module.exports = AssinaturaAluno;
