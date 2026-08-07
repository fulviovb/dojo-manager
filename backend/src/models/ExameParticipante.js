const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExameParticipante = sequelize.define('ExameParticipante', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  exame_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  faixa_atual_id: { type: DataTypes.UUID },
  faixa_pretendida_id: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'exame_participantes',
  indexes: [{ unique: true, fields: ['exame_id', 'aluno_id'] }],
});

module.exports = ExameParticipante;
