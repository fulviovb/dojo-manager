const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Participante do Programa Municipal de Incentivo ao Esporte (Resolução CIE).
// Proponente Pessoa Física (atleta/técnico) ou Pessoa Jurídica (entidade
// sem fins lucrativos). PJ reaproveita `nome` (razão social), endereço
// (sede), telefone/email e `responsavel_legal_*` (presidente/representante
// legal); campos PF (cpf/rg/nascimento/residência/vínculo) ficam vazios.
// aluno_id nullable: pode ser um aluno matriculado OU um atleta/técnico
// avulso (sem cadastro de Usuario) — nesse caso os dados pessoais abaixo são
// a única fonte. Mesmo quando aluno_id existe, os dados pessoais ficam
// duplicados aqui (não lidos de Usuario), pra não depender do cadastro do
// aluno mudar e pra tratar aluno/avulso de forma uniforme no resto do
// módulo (documentos, contrapartidas, despesas).
const ParticipanteIncentivo = sequelize.define('ParticipanteIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  tipo_pessoa: { type: DataTypes.ENUM('atleta', 'tecnico', 'pessoa_juridica'), allowNull: false },
  aluno_id: { type: DataTypes.UUID },

  nome: { type: DataTypes.STRING, allowNull: false },
  cpf: { type: DataTypes.STRING },
  rg: { type: DataTypes.STRING },
  data_nascimento: { type: DataTypes.DATEONLY },
  telefone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  endereco: { type: DataTypes.STRING },
  bairro: { type: DataTypes.STRING },
  cidade: { type: DataTypes.STRING },
  estado: { type: DataTypes.STRING },
  cep: { type: DataTypes.STRING },

  // Só Pessoa Jurídica.
  cnpj: { type: DataTypes.STRING(18) },
  responsavel_financeiro_nome: { type: DataTypes.STRING },
  responsavel_financeiro_rg: { type: DataTypes.STRING },
  responsavel_financeiro_cpf: { type: DataTypes.STRING },
  // Local/endereço de execução do projeto (Anexo X).
  local_execucao: { type: DataTypes.STRING },
  // Nome do projeto — usado nas declarações (Anexos X/XV/XVI/XX/XXI).
  projeto_nome: { type: DataTypes.STRING },

  // PF menor de 18: responsável legal. PJ: presidente/representante legal.
  responsavel_legal_nome: { type: DataTypes.STRING },
  responsavel_legal_rg: { type: DataTypes.STRING },
  responsavel_legal_cpf: { type: DataTypes.STRING },

  arte_marcial_id: { type: DataTypes.UUID },
  // Só atleta: técnico responsável (outro ParticipanteIncentivo, tipo_pessoa
  // 'tecnico') — alimenta a geração dos Anexos XI (relação de atletas do
  // técnico) e XII (vínculo atleta/técnico).
  tecnico_responsavel_id: { type: DataTypes.UUID },
  // Só técnico (Cédula CONFEF/CREF).
  confef_cref: { type: DataTypes.STRING },
  // Letra A-G / Olímpico / Paralímpico / Novos Talentos — só registro
  // informativo, o sistema não recalcula a regra de prioridade orçamentária.
  classificacao: { type: DataTypes.STRING },

  vinculo_federativo: { type: DataTypes.ENUM('nao_possui', 'possui'), defaultValue: 'nao_possui' },
  // Entidade do cadastro (EntidadeFederativa) — fonte principal. Os 2
  // campos de texto abaixo ficam como espelho (preenchidos a partir dela ao
  // salvar) e como legado de quem foi cadastrado antes do cadastro existir.
  entidade_federativa_id: { type: DataTypes.UUID },
  vinculo_federativo_entidade: { type: DataTypes.STRING },
  vinculo_federativo_cidade: { type: DataTypes.STRING },

  // Comprovação de residência (Resolução CIE 004/2026, Art. 17) — define o
  // caminho do checklist: proprietário só apresenta a própria conta; menor
  // nascido a partir de 2009 que mora com o responsável só precisa da conta
  // no nome dele; todo o resto precisa da conta em nome de terceiro +
  // Declaração de Residência (Anexo IX) + comprovação de vínculo com
  // Curitiba. `mora_com_responsavel` só é relevante quando o participante
  // se enquadra na idade do §4 (nascido a partir de 2009).
  proprietario_imovel: { type: DataTypes.BOOLEAN, defaultValue: false },
  mora_com_responsavel: { type: DataTypes.BOOLEAN, defaultValue: true },
  // Define se o checklist pede Certidão de Antecedentes Criminais ou a
  // declaração de não-enquadramento (Anexo XIX/XX) no lugar dela.
  atua_com_menores: { type: DataTypes.BOOLEAN, defaultValue: false },

  status_programa: {
    type: DataTypes.ENUM('inscrito', 'documentacao_pendente', 'habilitado', 'indeferido', 'inabilitado'),
    defaultValue: 'inscrito',
  },

  // Acordo privado entre o gestor do projeto e o participante — sem relação
  // com nenhuma regra do edital.
  taxa_gestao_paga: { type: DataTypes.BOOLEAN, defaultValue: false },
  taxa_gestao_valor: { type: DataTypes.DECIMAL(10, 2) },
  taxa_gestao_data: { type: DataTypes.DATEONLY },

  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  observacoes: { type: DataTypes.TEXT },
}, { tableName: 'participantes_incentivo' });

module.exports = ParticipanteIncentivo;
