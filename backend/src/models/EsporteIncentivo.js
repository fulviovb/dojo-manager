const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Esporte/modalidade de um participante do Incentivo ao Esporte. Cadastro
// próprio do módulo (não usa ArteMarcial): consultoria atende qualquer
// esporte (natação, atletismo...) e ArteMarcial alimenta turmas/graduação
// da escola, que não devem ganhar essas opções.
// `olimpico`: está no programa de Los Angeles 2028 (Resolução Art. 3º §1º)
// — decide Anexo I (olímpicas) x Anexo II (não olímpicas) na classificação
// de PF. Só informativo; null = não informado.
const EsporteIncentivo = sequelize.define('EsporteIncentivo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  olimpico: { type: DataTypes.BOOLEAN },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'esportes_incentivo' });

module.exports = EsporteIncentivo;
