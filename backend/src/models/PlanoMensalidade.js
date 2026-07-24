const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlanoMensalidade = sequelize.define('PlanoMensalidade', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  descricao: { type: DataTypes.TEXT },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'planos_mensalidade' });

module.exports = PlanoMensalidade;
