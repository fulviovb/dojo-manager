const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Entidade de administração do desporto (federação/associação) a que um
// participante do Incentivo ao Esporte é vinculado — alimenta o combo de
// "Vínculo federativo" e o Anexo XVII ("NOME - CNPJ ..." + cidade sede).
// Soft delete (`ativo`): participante vinculado continua apontando pra ela.
const EntidadeFederativa = sequelize.define('EntidadeFederativa', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  // Sempre gravado formatado (00.000.000/0000-00) — o controller valida.
  cnpj: { type: DataTypes.STRING(18) },
  cidade: { type: DataTypes.STRING },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'entidades_federativas' });

module.exports = EntidadeFederativa;
