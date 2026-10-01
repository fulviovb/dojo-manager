const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Objetivo do projeto de um participante (campo "OBJETIVOS" do formulário
// da prefeitura — cada objetivo é uma linha lá). Estruturado (competição
// futura + modalidade + categoria + meta) ou livre (`meta: 'livre'` +
// texto_livre). O texto final sai de utils/textoProjeto.js.
const ObjetivoIncentivo = sequelize.define('ObjetivoIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  participante_id: { type: DataTypes.UUID, allowNull: false },
  competicao_id: { type: DataTypes.UUID },
  modalidade: { type: DataTypes.STRING },
  categoria: { type: DataTypes.STRING },
  meta: { type: DataTypes.ENUM('campeao', 'podio', 'top5', 'participar', 'livre'), allowNull: false },
  texto_livre: { type: DataTypes.TEXT },
  ordem: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'objetivos_incentivo' });

module.exports = ObjetivoIncentivo;
