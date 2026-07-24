const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MatriculaAluno = sequelize.define('MatriculaAluno', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  turma_id: { type: DataTypes.UUID, allowNull: false },
  data_matricula: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  ativa: { type: DataTypes.BOOLEAN, defaultValue: true },
  graduacao_atual_faixa_id: { type: DataTypes.UUID },
  data_ultima_graduacao: { type: DataTypes.DATEONLY },
  aulas_desde_graduacao: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'matriculas_aluno' });

module.exports = MatriculaAluno;
