const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CriterioGraduacao = sequelize.define('CriterioGraduacao', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  arte_marcial_id: { type: DataTypes.UUID, allowNull: false },
  faixa_id: { type: DataTypes.UUID, allowNull: false },
  min_aulas: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'criterios_graduacao' });

module.exports = CriterioGraduacao;
