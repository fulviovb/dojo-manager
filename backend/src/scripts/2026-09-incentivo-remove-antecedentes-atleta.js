// Script one-off: "Certidão negativa de antecedentes criminais" nunca
// deveria ter entrado no checklist de Atleta/Paratleta — a Resolução CIE
// 004/2026 (§17 e §20) obriga isso só de Técnico (Pessoa Física) e Pessoa
// Jurídica que atuam com menores de 18; atleta nunca é mencionado.
// Corrigido em constants/incentivoEsporte.js (item removido de
// CHECKLIST_ATLETA, continua em CHECKLIST_TECNICO). Este script:
//   1) remove as linhas desse item já semeadas em participantes tipo
//      'atleta' (só remove se ainda pendente e sem arquivo — nunca apaga
//      algo que o usuário já preencheu);
//   2) reaplica `ordem` em todos os documentos de checklist restantes,
//      pra refletir a nova posição do array canônico (comprovantes_
//      resultado passou de índice 8 pra 7 em CHECKLIST_ATLETA).
// Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-remove-antecedentes-atleta.js
const sequelize = require('../config/database');
const { CHECKLIST_ATLETA, CHECKLIST_TECNICO } = require('../constants/incentivoEsporte');

function indiceNoChecklist(tipoPessoa, tipoDocumento) {
  const checklist = tipoPessoa === 'tecnico' ? CHECKLIST_TECNICO : CHECKLIST_ATLETA;
  const idx = checklist.findIndex(item => item.key === tipoDocumento);
  return idx === -1 ? null : idx;
}

async function main() {
  await sequelize.authenticate();

  const [candidatos] = await sequelize.query(
    `SELECT d.id, d.status, d.arquivo_url, p.nome
     FROM documentos_incentivo d
     JOIN participantes_incentivo p ON p.id = d.participante_id
     WHERE d.tipo_documento = 'antecedentes_criminais' AND p.tipo_pessoa = 'atleta'`
  );

  let removidos = 0;
  for (const doc of candidatos) {
    if (doc.status !== 'pendente' || doc.arquivo_url) {
      console.log(`· mantido (já tem status/arquivo) — ${doc.nome}: ${doc.id}`);
      continue;
    }
    await sequelize.query(`DELETE FROM documentos_incentivo WHERE id = ?`, { replacements: [doc.id] });
    console.log(`✓ removido de ${doc.nome}: ${doc.id}`);
    removidos++;
  }
  console.log(`✓ ${removidos} item(ns) indevido(s) removido(s) de checklist de atleta`);

  const [documentos] = await sequelize.query(
    `SELECT d.id, d.tipo_documento, p.tipo_pessoa
     FROM documentos_incentivo d
     JOIN participantes_incentivo p ON p.id = d.participante_id
     WHERE d.origem = 'upload'`
  );

  let reordenados = 0;
  for (const doc of documentos) {
    const ordem = indiceNoChecklist(doc.tipo_pessoa, doc.tipo_documento);
    if (ordem === null) continue;
    await sequelize.query(`UPDATE documentos_incentivo SET ordem = ? WHERE id = ?`, { replacements: [ordem, doc.id] });
    reordenados++;
  }
  console.log(`✓ ordem recalculada em ${reordenados} documento(s)`);

  console.log('✓ Correção aplicada com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar correção:', e);
  process.exit(1);
});
