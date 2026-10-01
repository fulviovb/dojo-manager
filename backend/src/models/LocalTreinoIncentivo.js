const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Local/horário de treino do participante (campo "LOCAIS DE TREINAMENTO" do
// formulário: endereço, dia da semana, hora inicial e final). Aluno da
// escola pode importar das turmas em que está matriculado.
const LocalTreinoIncentivo = sequelize.define('LocalTreinoIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  participante_id: { type: DataTypes.UUID, allowNull: false },
  endereco: { type: DataTypes.STRING(500), allowNull: false },
  dia_semana: { type: DataTypes.INTEGER, allowNull: false }, // 0 = domingo … 6 = sábado
  hora_inicio: { type: DataTypes.TIME, allowNull: false },
  hora_fim: { type: DataTypes.TIME, allowNull: false },
}, { tableName: 'locais_treino_incentivo' });

module.exports = LocalTreinoIncentivo;
