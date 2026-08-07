const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GraduacaoAluno = sequelize.define('GraduacaoAluno', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  arte_marcial_id: { type: DataTypes.UUID, allowNull: false },
  faixa_id: { type: DataTypes.UUID, allowNull: false },
  data_inicio: { type: DataTypes.DATEONLY },
  data_fim: { type: DataTypes.DATEONLY },
  atual: { type: DataTypes.BOOLEAN, defaultValue: false },
  observacao: { type: DataTypes.STRING },
  // Preenchidos quando a graduação é confirmada a partir do relatório do
  // Módulo de Exame de Faixa (opcional — segue nulo pro fluxo manual atual).
  exame_participante_id: { type: DataTypes.UUID },
  nota_exame: { type: DataTypes.DECIMAL(5, 2) },
}, { tableName: 'graduacoes_aluno' });

module.exports = GraduacaoAluno;
