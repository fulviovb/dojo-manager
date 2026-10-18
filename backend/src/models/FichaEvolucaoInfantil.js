const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Uma ficha preenchida do módulo Evolução Infantil. O conteúdo de cada
// modelo (itens, campos de texto) vem do catálogo em
// constants/evolucaoInfantil.js — aqui só guardamos as chaves.
const FichaEvolucaoInfantil = sequelize.define('FichaEvolucaoInfantil', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  turma_id: { type: DataTypes.UUID, allowNull: false },
  professor_id: { type: DataTypes.UUID, allowNull: false },
  modelo: { type: DataTypes.STRING(40), allowNull: false },
  // Dia da observação (modelo 'data'), 1º dia do mês ('mes'), 1º dia do
  // 1º mês ('trimestre') ou início do período ('periodo').
  data_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  data_fim: { type: DataTypes.DATEONLY },
  data_revisao: { type: DataTypes.DATEONLY },
  // { chave_do_item: 1..4 } — escala PA/ED/RS/DA
  niveis: { type: DataTypes.JSON },
  // { chave_do_campo: 'texto' } — inclui obs por área no Trimestral (obs_<area>)
  textos: { type: DataTypes.JSON },
  // Metas ([{ desenvolver, como, atividades, progresso, status }]) ou
  // registros do Registro Livre ([{ data, situacao, ... }]).
  blocos: { type: DataTypes.JSON },
}, {
  tableName: 'fichas_evolucao_infantil',
  indexes: [{ fields: ['escola_id', 'aluno_id', 'data_inicio'] }, { fields: ['turma_id', 'modelo', 'data_inicio'] }],
});

module.exports = FichaEvolucaoInfantil;
