const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pagamento = sequelize.define('Pagamento', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mensalidade_id: { type: DataTypes.UUID, allowNull: false },
  valor_pago: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  data_pagamento: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  forma_pagamento: { type: DataTypes.ENUM('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia'), defaultValue: 'dinheiro' },
  recibo_url: { type: DataTypes.STRING },
  observacao: { type: DataTypes.TEXT },
}, { tableName: 'pagamentos' });

module.exports = Pagamento;
