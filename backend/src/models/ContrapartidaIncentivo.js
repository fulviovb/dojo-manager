const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Participação de um atleta/técnico numa contrapartida social exigida pelo
// edital: campanhas de doação promovidas pela Secretaria, divulgação
// obrigatória em rede social, ou exposição de bandeira/banner/patch.
const ContrapartidaIncentivo = sequelize.define('ContrapartidaIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  participante_id: { type: DataTypes.UUID, allowNull: false },

  tipo: {
    type: DataTypes.ENUM('campanha_doacao', 'divulgacao_rede_social', 'exposicao_banner'),
    allowNull: false,
  },
  descricao: { type: DataTypes.STRING },
  data: { type: DataTypes.DATEONLY },
  comprovante_url: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('pendente', 'cumprida'), defaultValue: 'pendente' },
  observacao: { type: DataTypes.TEXT },
}, { tableName: 'contrapartidas_incentivo' });

module.exports = ContrapartidaIncentivo;
