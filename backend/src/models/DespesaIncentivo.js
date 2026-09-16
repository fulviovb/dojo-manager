const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Lançamento de gasto da verba do edital para um participante. Três status
// independentes (não um único ENUM de ciclo de vida, porque não são
// mutuamente exclusivos nem sequenciais): comprovante_url (existe o
// arquivo? mesmo idioma de Pagamento.recibo_url — nullable = ainda não tem)
// e reportado_prefeitura (já foi lançado no sistema da prefeitura?).
const DespesaIncentivo = sequelize.define('DespesaIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  participante_id: { type: DataTypes.UUID, allowNull: false },

  categoria: { type: DataTypes.STRING, allowNull: false },
  descricao: { type: DataTypes.STRING },
  valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  data_despesa: { type: DataTypes.DATEONLY, allowNull: false },

  comprovante_url: { type: DataTypes.STRING },
  reportado_prefeitura: { type: DataTypes.BOOLEAN, defaultValue: false },
  data_reportado_prefeitura: { type: DataTypes.DATEONLY },

  observacao: { type: DataTypes.TEXT },
}, { tableName: 'despesas_incentivo' });

module.exports = DespesaIncentivo;
