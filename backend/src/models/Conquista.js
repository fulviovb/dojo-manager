const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conquista = sequelize.define('Conquista', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  competicao_id: { type: DataTypes.UUID, allowNull: false },
  // Nullable: nem todo atleta histórico da planilha tem cadastro de Aluno
  // ativo no sistema (afastados). nome_atleta é sempre preenchido, mesmo
  // quando aluno_id casa com um cadastro, pra preservar o nome original.
  aluno_id: { type: DataTypes.UUID },
  nome_atleta: { type: DataTypes.STRING, allowNull: false },
  arte_marcial_id: { type: DataTypes.UUID },
  // Graduação do atleta na época da competição — histórica, independente
  // da faixa atual dele. faixa_id quando bate no catálogo da escola;
  // faixa_nome_livre como fallback quando não bate (faixa antiga/renomeada).
  faixa_id: { type: DataTypes.UUID },
  faixa_nome_livre: { type: DataTypes.STRING },
  colocacao: { type: DataTypes.INTEGER },
  modalidade: { type: DataTypes.STRING, allowNull: false },
  categoria: { type: DataTypes.STRING },
}, { tableName: 'conquistas' });

module.exports = Conquista;
