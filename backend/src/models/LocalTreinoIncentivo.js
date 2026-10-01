const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Dia/horário de treino do participante num local do cadastro (LocalTreino)
// — campo "LOCAIS DE TREINAMENTO" do formulário: endereço, dia da semana,
// hora inicial e final. Aluno da escola pode importar das turmas.
const LocalTreinoIncentivo = sequelize.define('LocalTreinoIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  participante_id: { type: DataTypes.UUID, allowNull: false },
  local_id: { type: DataTypes.UUID },
  // Legado (antes do cadastro de locais) — não é mais gravado.
  endereco: { type: DataTypes.STRING(500) },
  dia_semana: { type: DataTypes.INTEGER, allowNull: false }, // 0 = domingo … 6 = sábado
  hora_inicio: { type: DataTypes.TIME, allowNull: false },
  hora_fim: { type: DataTypes.TIME, allowNull: false },
}, { tableName: 'locais_treino_incentivo' });

module.exports = LocalTreinoIncentivo;
