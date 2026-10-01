const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Cadastro de locais de treino do Incentivo ao Esporte (aba "Locais"): o
// participante só escolhe o local e informa dia/horário
// (LocalTreinoIncentivo). `sala_id` liga ao local de origem quando veio de
// uma sala da escola — usado pelo "Importar das turmas" pra não duplicar.
const LocalTreino = sequelize.define('LocalTreino', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  endereco: { type: DataTypes.STRING(500), allowNull: false },
  sala_id: { type: DataTypes.UUID },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'locais_treino' });

module.exports = LocalTreino;
