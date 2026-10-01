const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Competição futura que o participante vai disputar (campo "COMPETIÇÕES
// PREVISTAS" do formulário). Aponta pra Competicao (mesmo cadastro das
// Conquistas — o resultado depois cai na mesma competição). As competições
// citadas em objetivos também entram no texto, mesmo sem linha aqui.
const CompeticaoPrevistaIncentivo = sequelize.define('CompeticaoPrevistaIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  participante_id: { type: DataTypes.UUID, allowNull: false },
  competicao_id: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'competicoes_previstas_incentivo',
  indexes: [{ unique: true, fields: ['participante_id', 'competicao_id'] }],
});

module.exports = CompeticaoPrevistaIncentivo;
