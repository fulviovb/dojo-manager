const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Turma = sequelize.define('Turma', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  arte_marcial_id: { type: DataTypes.UUID, allowNull: false },
  professor_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  descricao: { type: DataTypes.TEXT },
  ativa: { type: DataTypes.BOOLEAN, defaultValue: true },
  // 'treino_extra': turma oculta, uma por (escola, arte_marcial), criada
  // automaticamente pra registrar Treinos Extras (ver treinosExtrasController).
  // Nunca aparece nas telas de Turma nem entra em contagens de "turmas
  // ativas" — mas as Chamadas ligadas a ela contam normalmente pra carência
  // de graduação, porque esse cálculo já soma presença por arte marcial,
  // não por matrícula/turma.
  tipo: { type: DataTypes.ENUM('regular', 'treino_extra'), defaultValue: 'regular' },
  // Cobrança única gerada (se preenchida) toda vez que um aluno é
  // matriculado nesta turma — nem toda turma cobra taxa de matrícula.
  taxa_matricula: { type: DataTypes.DECIMAL(10, 2) },
}, { tableName: 'turmas', indexes: [{ unique: true, fields: ['escola_id', 'nome'] }] });

module.exports = Turma;
