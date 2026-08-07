const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AvaliadorExame = sequelize.define('AvaliadorExame', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  exame_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  // PIN numérico curto, único dentro do exame — login descartável do
  // avaliador no dia do exame (sem Usuario/bcrypt, ver plano do módulo).
  pin: { type: DataTypes.STRING(6), allowNull: false },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'avaliadores_exame',
  indexes: [{ unique: true, fields: ['exame_id', 'pin'] }],
});

module.exports = AvaliadorExame;
