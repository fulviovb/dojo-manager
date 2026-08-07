const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Aplicabilidade: se existe uma linha (criterio_modelo_id, faixa_id), esse
// critério é avaliado de verdade pra quem presta exame dessa faixa. Se não
// existe, o critério não se aplica e recebe nota cheia automática (regra 2.4).
const CriterioExameModeloFaixa = sequelize.define('CriterioExameModeloFaixa', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  criterio_modelo_id: { type: DataTypes.UUID, allowNull: false },
  faixa_id: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'criterios_exame_modelo_faixa',
  indexes: [{ unique: true, fields: ['criterio_modelo_id', 'faixa_id'] }],
});

module.exports = CriterioExameModeloFaixa;
