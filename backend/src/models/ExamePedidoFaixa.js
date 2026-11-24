const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExamePedidoFaixa = sequelize.define('ExamePedidoFaixa', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  exame_participante_id: { type: DataTypes.UUID, allowNull: false },
  quer_comprar: { type: DataTypes.ENUM('sim', 'nao', 'sem_resposta'), allowNull: false, defaultValue: 'sem_resposta' },
  faixa_id: { type: DataTypes.UUID },
  tamanho: { type: DataTypes.STRING(30) },
  // nome do tipo (Exame.tipos_faixa) no momento do pedido
  tipo: { type: DataTypes.STRING(60) },
  valor: { type: DataTypes.DECIMAL(10, 2) },
  entregue: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  entregue_em: { type: DataTypes.DATEONLY },
}, {
  tableName: 'exame_pedidos_faixa',
  indexes: [{ unique: true, fields: ['exame_participante_id'] }],
});

module.exports = ExamePedidoFaixa;
