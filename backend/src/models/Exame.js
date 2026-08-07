const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exame = sequelize.define('Exame', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  arte_marcial_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('planejamento', 'em_andamento', 'finalizado'),
    allowNull: false,
    defaultValue: 'planejamento',
  },
  // 'roteiro_padrao': exame especial que nunca roda de verdade (fica em
  // planejamento) e serve só como fonte pro botão "Começar exame com base
  // em roteiro padrão" — só um por arte marcial, protegido contra exclusão.
  tipo: {
    type: DataTypes.ENUM('normal', 'roteiro_padrao'),
    allowNull: false,
    defaultValue: 'normal',
  },
  // Código curto (6 caracteres, alfabeto sem letras/dígitos ambíguos) pra
  // montar a URL pública do avaliador — bem mais fácil de digitar no
  // celular do que o UUID do exame. Único entre todas as escolas.
  codigo: { type: DataTypes.STRING(8), allowNull: false, unique: true },
}, { tableName: 'exames' });

module.exports = Exame;
