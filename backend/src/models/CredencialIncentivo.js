const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Login e senha do participante no Sistema Incentivo online da prefeitura
// (acesso via e-Cidadão — Resolução CIE 004/2026, Art. 13/14). Tabela
// própria (não colunas em participantes_incentivo) para a senha nunca
// vazar nas rotas de participante (listar/buscar devolvem o registro
// inteiro, e atualizar faz update(req.body)). Só é lida/escrita pelas rotas
// /participantes/:id/credencial. A senha fica cifrada (utils/cifra.js,
// AES-256-GCM com o id do participante como AAD) — nunca em texto claro.
const CredencialIncentivo = sequelize.define('CredencialIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  participante_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  login: { type: DataTypes.STRING, allowNull: false },
  senha_cifrada: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'credenciais_incentivo' });

module.exports = CredencialIncentivo;
