const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Faixa = sequelize.define('Faixa', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  arte_marcial_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  cor: { type: DataTypes.STRING },
  cor_secundaria: { type: DataTypes.STRING },
  ordem: { type: DataTypes.INTEGER, allowNull: false },
  // Faixa que pode ser pulada no exame (ex: Cinza e Marrom 3 no Karatê):
  // ao indicar um aluno pra ela, o sistema pergunta se o exame é pra ela ou
  // pra seguinte. Coluna criada por scripts/2026-11-faixa-opcional.js.
  opcional: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'faixas' });

module.exports = Faixa;
