const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AvaliacaoAluno = sequelize.define('AvaliacaoAluno', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  exame_id: { type: DataTypes.UUID, allowNull: false },
  fase_exame_id: { type: DataTypes.UUID, allowNull: false },
  exame_participante_id: { type: DataTypes.UUID, allowNull: false },
  avaliador_id: { type: DataTypes.UUID, allowNull: false },
  status: {
    type: DataTypes.ENUM('pendente', 'em_andamento', 'finalizada'),
    allowNull: false,
    defaultValue: 'pendente',
  },
  nota: { type: DataTypes.DECIMAL(5, 2) },
  finalizada_em: { type: DataTypes.DATE },
}, {
  tableName: 'avaliacoes_aluno',
  // Só um avaliador sorteado por fase+participante (regra 3.3).
  indexes: [{ unique: true, fields: ['fase_exame_id', 'exame_participante_id'] }],
});

module.exports = AvaliacaoAluno;
