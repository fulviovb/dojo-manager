const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Gasto comprovado de uma BolsaIncentivo. `fonte` diz contra qual verba o
// gasto é prestado: 'bolsa' ou 'suplementacao'. Gasto de suplementação só é
// aceito com data no 2º semestre do ano da bolsa (validado no controller).
const DespesaBolsaIncentivo = sequelize.define('DespesaBolsaIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  bolsa_id: { type: DataTypes.UUID, allowNull: false },
  fonte: { type: DataTypes.ENUM('bolsa', 'suplementacao'), allowNull: false },

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
