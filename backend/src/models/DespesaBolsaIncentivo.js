const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Gasto comprovado de uma BolsaIncentivo. A verba (bolsa × suplementação)
// NÃO é escolhida: é calculada pela data (ver alocarGastos no controller —
// 2º semestre cobre a suplementação primeiro, o resto cobre a bolsa).
// `fonte` é legado (nov/2026, escolha manual) — ignorado, novos gastos null.
const DespesaBolsaIncentivo = sequelize.define('DespesaBolsaIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  bolsa_id: { type: DataTypes.UUID, allowNull: false },
  fonte: { type: DataTypes.ENUM('bolsa', 'suplementacao'), allowNull: true },

  categoria: { type: DataTypes.STRING, allowNull: false }, // CATEGORIAS_DESPESA
  descricao: { type: DataTypes.STRING },
  valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  data_despesa: { type: DataTypes.DATEONLY, allowNull: false },
  comprovante_url: { type: DataTypes.STRING },
  prestado_contas: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  data_prestado_contas: { type: DataTypes.DATEONLY },
  observacao: { type: DataTypes.TEXT },
}, { tableName: 'despesas_bolsa_incentivo' });

module.exports = DespesaBolsaIncentivo;
