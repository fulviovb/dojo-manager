const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Um item do checklist de documentação de um participante — cobre tanto um
// documento comprobatório enviado por upload (origem='upload') quanto um
// formulário/anexo padrão preenchido pelo próprio sistema (origem='gerado').
const DocumentoIncentivo = sequelize.define('DocumentoIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  participante_id: { type: DataTypes.UUID, allowNull: false },

  // Chave do checklist (ver constants/incentivoEsporte.js) ou nome livre
  // quando é um documento extra não previsto no checklist padrão.
  tipo_documento: { type: DataTypes.STRING, allowNull: false },
  nome_exibicao: { type: DataTypes.STRING, allowNull: false },

  origem: { type: DataTypes.ENUM('upload', 'gerado'), defaultValue: 'upload' },
  arquivo_url: { type: DataTypes.STRING },

  // Só quando origem='gerado': qual anexo (ex: 'IX', 'XVII') e os valores
  // usados no preenchimento, pra permitir reabrir/editar/regerar depois.
  tipo_anexo: { type: DataTypes.STRING },
  dados_preenchidos: { type: DataTypes.JSON },

  status: { type: DataTypes.ENUM('pendente', 'recebido', 'aprovado', 'rejeitado'), defaultValue: 'pendente' },
  // Certidões negativas e outros documentos com prazo de validade.
  data_validade: { type: DataTypes.DATEONLY },
  observacao: { type: DataTypes.TEXT },
  // Posição na lista do checklist (0,1,2... = ordem do array em
  // constants/incentivoEsporte.js) — sem isso, itens semeados juntos via
  // bulkCreate têm o mesmo created_at e a ordem de exibição fica
  // arbitrária. Documentos extras/gerados (fora do checklist padrão) ficam
  // com o default alto, sempre depois dos itens do checklist.
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
}, { tableName: 'documentos_incentivo' });

module.exports = DocumentoIncentivo;
