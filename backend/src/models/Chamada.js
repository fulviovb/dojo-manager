const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chamada = sequelize.define('Chamada', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  aula_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  origem: { type: DataTypes.ENUM('qrcode', 'professor'), defaultValue: 'professor' },
  validado_por: { type: DataTypes.UUID },
  // Quantas "aulas" essa presença vale pra carência de graduação — sempre 1
  // pra chamada normal (QR Code ou manual). Só o módulo de Treino Extra usa
  // valor > 1 (ex: professor deu 2 treinos seguidos no mesmo dia e não quer
  // registrar duas vezes). Somado em vez de contado nas 3 rotinas de
  // carência (usuariosController.perfil, dashboardController.
  // presencasDesdeGraduacao, relatoriosController.frequenciaPercentual).
  quantidade: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, {
  tableName: 'chamadas',
  indexes: [{ unique: true, fields: ['aula_id', 'aluno_id'] }],
});

module.exports = Chamada;
