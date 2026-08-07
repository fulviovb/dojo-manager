const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CriterioExameFaixa = sequelize.define('CriterioExameFaixa', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  criterio_exame_id: { type: DataTypes.UUID, allowNull: false },
  faixa_id: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'criterios_exame_faixa',
  indexes: [{ unique: true, fields: ['criterio_exame_id', 'faixa_id'] }],
});

module.exports = CriterioExameFaixa;
