const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chamada = sequelize.define('Chamada', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  aula_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  origem: { type: DataTypes.ENUM('qrcode', 'professor'), defaultValue: 'professor' },
  validado_por: { type: DataTypes.UUID },
}, {
  tableName: 'chamadas',
  indexes: [{ unique: true, fields: ['aula_id', 'aluno_id'] }],
});

module.exports = Chamada;
