// Script one-off: item "Login e senha do Sistema Incentivo online" entrou
// no topo do checklist (constants/incentivoEsporte.js). Participantes já
// criados não recebem itens novos sozinhos (o checklist só é semeado na
// criação), então este script:
//   1. cria a tabela credenciais_incentivo (se ainda não existir);
//   2. adiciona o item de credencial a todo participante que não o tem;
//   3. recalcula `ordem` dos itens de checklist — todos os índices do array
//      andaram +1 com o item novo na posição 0.
// Idempotente. Rodar uma vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-credencial-prefeitura.js
const sequelize = require('../config/database');
const { ParticipanteIncentivo, DocumentoIncentivo, CredencialIncentivo } = require('../models');
const { ITEM_CREDENCIAL, buscarItemChecklist } = require('../constants/incentivoEsporte');

async function main() {
  await sequelize.authenticate();
  await CredencialIncentivo.sync();
  console.log('✓ tabela credenciais_incentivo ok');

  const participantes = await ParticipanteIncentivo.findAll({ attributes: ['id', 'escola_id', 'tipo_pessoa'] });
  let criados = 0;
  for (const p of participantes) {
    const [, novo] = await DocumentoIncentivo.findOrCreate({
      where: { participante_id: p.id, tipo_documento: ITEM_CREDENCIAL.key },
      defaults: {
        escola_id: p.escola_id, participante_id: p.id, tipo_documento: ITEM_CREDENCIAL.key,
        nome_exibicao: ITEM_CREDENCIAL.nome, origem: 'upload', status: 'pendente', ordem: 0,
      },
    });
    if (novo) criados++;
  }
  console.log(`✓ item de credencial adicionado a ${criados} participante(s)`);

  const documentos = await DocumentoIncentivo.findAll({
    include: [{ model: ParticipanteIncentivo, attributes: ['tipo_pessoa'] }],
  });
  let reordenados = 0;
  for (const doc of documentos) {
    const item = buscarItemChecklist(doc.ParticipanteIncentivo.tipo_pessoa, doc.tipo_documento);
    if (!item || doc.ordem === item.ordemCanonica) continue; // extra/gerado ou já certo
    await doc.update({ ordem: item.ordemCanonica });
    reordenados++;
  }
  console.log(`✓ ordem recalculada em ${reordenados} documento(s)`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro:', e);
  process.exit(1);
});
