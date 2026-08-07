const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RespostaCriterio = sequelize.define('RespostaCriterio', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  avaliacao_id: { type: DataTypes.UUID, allowNull: false },
  criterio_exame_id: { type: DataTypes.UUID, allowNull: false },
  conceito: { type: DataTypes.ENUM('+', '+-', '-'), allowNull: false },
}, {
  tableName: 'respostas_criterio',
  indexes: [{ unique: true, fields: ['avaliacao_id', 'criterio_exame_id'] }],
});

module.exports = RespostaCriterio;
