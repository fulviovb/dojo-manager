const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExameHistorico = sequelize.define('ExameHistorico', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  exame_id: { type: DataTypes.UUID, allowNull: false },
  exame_participante_id: { type: DataTypes.UUID },
  tipo: { type: DataTypes.STRING(30), allowNull: false },
  descricao: { type: DataTypes.STRING(500), allowNull: false },
  usuario_id: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'exame_historico',
  indexes: [{ fields: ['exame_id'] }, { fields: ['exame_participante_id'] }],
});

module.exports = ExameHistorico;
