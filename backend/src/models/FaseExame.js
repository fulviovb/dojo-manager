const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Cópia (snapshot) de FaseExameModelo no momento em que o Exame foi criado —
// editar o modelo depois não deve afetar exames já em andamento.
const FaseExame = sequelize.define('FaseExame', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  exame_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'fases_exame' });

module.exports = FaseExame;
