const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Sinalização, na tela do aluno, de que ele vai prestar o próximo exame de
// faixa naquela arte marcial. Independe do Módulo de Exame (o exame pode
// acontecer fora do sistema): o relatório "Exame de Faixa" lista só quem
// está `indicado`, e "Aprovado" gradua o aluno na faixa pretendida e fecha
// a indicação como `aprovado` (fica como histórico, com o graduacao_id).
const IndicacaoExame = sequelize.define('IndicacaoExame', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  arte_marcial_id: { type: DataTypes.UUID, allowNull: false },
  faixa_atual_id: { type: DataTypes.UUID },
  faixa_pretendida_id: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM('indicado', 'aprovado'), allowNull: false, defaultValue: 'indicado' },
  data_indicacao: { type: DataTypes.DATEONLY, allowNull: false },
  data_aprovacao: { type: DataTypes.DATEONLY },
  graduacao_id: { type: DataTypes.UUID },
  indicado_por_id: { type: DataTypes.UUID },
}, {
  tableName: 'indicacoes_exame',
  indexes: [{ fields: ['escola_id', 'arte_marcial_id', 'status'] }, { fields: ['aluno_id'] }],
});

module.exports = IndicacaoExame;
