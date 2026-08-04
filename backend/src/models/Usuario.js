const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  // Não é único: alunos menores costumam usar o e-mail dos pais, e é comum
  // dois irmãos (nossos alunos) compartilharem o mesmo e-mail de contato.
  // Só importa ser único pra quem realmente faz login (admin/professor) —
  // isso é garantido na aplicação (usuariosController), não aqui no schema.
  email: { type: DataTypes.STRING, allowNull: false },
  senha_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'professor', 'aluno'), allowNull: false },
  data_nascimento: { type: DataTypes.DATEONLY },
  telefone: { type: DataTypes.STRING },
  foto_url: { type: DataTypes.STRING },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  // Campos adicionais do iDojo
  apelido: { type: DataTypes.STRING },
  // Identificador único de fato da pessoa (mesmo entre irmãos que dividem
  // e-mail). Opcional — nem toda família tem o CPF da criança à mão no
  // cadastro; fica NULL até ser preenchido (nunca '', pra não colidir
  // com outros cadastros também em branco no índice único).
  cpf: { type: DataTypes.STRING(14), unique: true },
  rg: { type: DataTypes.STRING(20) },
  data_ingresso: { type: DataTypes.DATEONLY },
  endereco: { type: DataTypes.STRING },
  bairro: { type: DataTypes.STRING },
  cep: { type: DataTypes.STRING(9) },
  cidade: { type: DataTypes.STRING },
  estado: { type: DataTypes.STRING(2) },
  mae: { type: DataTypes.STRING },
  pai: { type: DataTypes.STRING },
  observacoes: { type: DataTypes.TEXT },
  genero: { type: DataTypes.STRING(20) },
  naturalidade: { type: DataTypes.STRING },
  profissao: { type: DataTypes.STRING },
  matricula: { type: DataTypes.STRING },
}, { tableName: 'usuarios' });

module.exports = Usuario;
