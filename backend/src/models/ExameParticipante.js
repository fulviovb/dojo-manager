const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExameParticipante = sequelize.define('ExameParticipante', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  exame_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  faixa_atual_id: { type: DataTypes.UUID },
  faixa_pretendida_id: { type: DataTypes.UUID, allowNull: false },
  // Gestão do Exame: o participante é o candidato.
  indicacao_exame_id: { type: DataTypes.UUID },
  turma_id: { type: DataTypes.UUID },
  // null = herda Exame.taxa_padrao (mudar a taxa do exame vale pra todos)
  valor_taxa: { type: DataTypes.DECIMAL(10, 2) },
  desconto: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  motivo_desconto: { type: DataTypes.STRING },
  isento: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  status_inscricao: { type: DataTypes.ENUM('indicado', 'confirmado', 'desistiu'), allowNull: false, defaultValue: 'indicado' },
  presenca: { type: DataTypes.ENUM('presente', 'ausente') },
  resultado: { type: DataTypes.ENUM('aprovado', 'nao_aprovado') },
  // Preenchido ao graduar — é o que impede graduar duas vezes (RN-14)
  graduacao_aluno_id: { type: DataTypes.UUID },
  observacoes: { type: DataTypes.TEXT },
}, {
  tableName: 'exame_participantes',
  indexes: [{ unique: true, fields: ['exame_id', 'aluno_id'] }],
});

module.exports = ExameParticipante;
