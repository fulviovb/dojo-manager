// Script one-off: documentos_incentivo.ordem foi adicionado ao model depois
// que a tabela já existia — coluna nova em tabela EXISTENTE não aparece
// sozinha com sync({alter:false}). Além de criar a coluna, faz o backfill
// dos documentos de checklist já semeados (bulkCreate original não gravava
// ordem, então a exibição ficava na ordem arbitrária de created_at
// empatado). Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-documento-ordem.js
const sequelize = require('../config/database');
const { CHECKLIST_ATLETA, CHECKLIST_TECNICO } = require('../constants/incentivoEsporte');

const COLUNA_JA_EXISTE = 'ER_DUP_FIELDNAME';

function indiceNoChecklist(tipoPessoa, tipoDocumento) {
  const checklist = tipoPessoa === 'tecnico' ? CHECKLIST_TECNICO : CHECKLIST_ATLETA;
  const idx = checklist.findIndex(item => item.key === tipoDocumento);
  return idx === -1 ? null : idx;
}

async function main() {
  await sequelize.authenticate();

  try {
    await sequelize.query(`ALTER TABLE documentos_incentivo ADD COLUMN ordem INT NOT NULL DEFAULT 1000`);
    console.log('✓ coluna ordem adicionada');
  } catch (e) {
    if (e.original?.code === COLUNA_JA_EXISTE) console.log('· (coluna já existe, ignorando)');
    else throw e;
  }

  const [documentos] = await sequelize.query(
    `SELECT d.id, d.tipo_documento, p.tipo_pessoa
     FROM documentos_incentivo d
     JOIN participantes_incentivo p ON p.id = d.participante_id
     WHERE d.origem = 'upload'`
  );

  let atualizados = 0;
  for (const doc of documentos) {
    const ordem = indiceNoChecklist(doc.tipo_pessoa, doc.tipo_documento);
    if (ordem === null) continue; // documento extra, fica no default (1000)
    await sequelize.query(`UPDATE documentos_incentivo SET ordem = ? WHERE id = ?`, { replacements: [ordem, doc.id] });
    atualizados++;
  }
  console.log(`✓ backfill de ordem: ${atualizados} documento(s) de checklist atualizado(s)`);

  console.log('✓ Schema aplicado com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar schema:', e);
  process.exit(1);
});
