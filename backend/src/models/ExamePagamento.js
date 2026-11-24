const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExamePagamento = sequelize.define('ExamePagamento', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  exame_participante_id: { type: DataTypes.UUID, allowNull: false },
  referente: { type: DataTypes.ENUM('taxa', 'faixa'), allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  forma: { type: DataTypes.ENUM('pix', 'dinheiro', 'cartao', 'transferencia'), allowNull: false },
  comprovante_url: { type: DataTypes.STRING(500) },
  observacao: { type: DataTypes.STRING },
  registrado_por: { type: DataTypes.UUID, allowNull: false },
  // Lançamento nunca é apagado (RN-11): estornar preenche estes campos e ele
  // deixa de contar nos totais, mas continua visível.
  estornado_em: { type: DataTypes.DATE },
  estornado_por: { type: DataTypes.UUID },
  motivo_estorno: { type: DataTypes.STRING },
}, {
  tableName: 'exame_pagamentos',
  indexes: [{ fields: ['exame_participante_id'] }],
});

module.exports = ExamePagamento;
