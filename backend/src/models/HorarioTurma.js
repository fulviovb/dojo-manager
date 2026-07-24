const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// dia_semana: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
const HorarioTurma = sequelize.define('HorarioTurma', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  turma_id: { type: DataTypes.UUID, allowNull: false },
  sala_id: { type: DataTypes.UUID, allowNull: false },
  dia_semana: { type: DataTypes.INTEGER, allowNull: false },
  hora_inicio: { type: DataTypes.TIME, allowNull: false },
  hora_fim: { type: DataTypes.TIME, allowNull: false },
}, { tableName: 'horarios_turma' });

module.exports = HorarioTurma;
