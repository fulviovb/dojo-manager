// Script one-off: checklist do técnico corrigido conforme o Quadro de
// Normas da Resolução CIE 004/2026 —
//   - entra "Declarações de vínculo atleta/técnico (Anexo XII)" (múltiplo,
//     uma por atleta; Art. 8º §1º II);
//   - sai "Declaração de responsável técnico (Anexo XXI)" — só exigida de
//     Pessoa Jurídica. Remove o item apenas se ainda estiver vazio
//     (pendente e sem arquivo); Anexo XXI já GERADO (tipo anexo_xxi) não é
//     tocado — o usuário apaga pelo ✕ se quiser.
//   - recalcula `ordem` (índices do array mudaram).
// Idempotente. Rodar uma vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-tecnico-anexo-xii.js
const sequelize = require('../config/database');
const { ParticipanteIncentivo, DocumentoIncentivo } = require('../models');
const { buscarItemChecklist } = require('../constants/incentivoEsporte');

async function main() {
  await sequelize.authenticate();

  // Só técnicos — Pessoa Jurídica usa a mesma chave e precisa do item.
  const idsTecnicos = (await ParticipanteIncentivo.findAll({ where: { tipo_pessoa: 'tecnico' }, attributes: ['id'] })).map(t => t.id);
  const removidos = await DocumentoIncentivo.destroy({
    where: { tipo_documento: 'responsavel_tecnico', status: 'pendente', arquivo_url: null, participante_id: idsTecnicos },
  });
  console.log(`✓ item Anexo XXI vazio removido de ${removidos} técnico(s)`);
  const restantes = await DocumentoIncentivo.count({ where: { tipo_documento: 'responsavel_tecnico', participante_id: idsTecnicos } });
  if (restantes) console.log(`· ${restantes} item(ns) Anexo XXI preenchido(s) mantido(s) — remover manualmente se quiser`);

  const item = buscarItemChecklist('tecnico', 'vinculo_atleta_tecnico');
  const tecnicos = await ParticipanteIncentivo.findAll({ where: { tipo_pessoa: 'tecnico' }, attributes: ['id', 'escola_id'] });
  let criados = 0;
  for (const t of tecnicos) {
    const [, novo] = await DocumentoIncentivo.findOrCreate({
      where: { participante_id: t.id, tipo_documento: item.key },
      defaults: {
        escola_id: t.escola_id, participante_id: t.id, tipo_documento: item.key,
        nome_exibicao: item.nome, origem: 'upload', status: 'pendente', ordem: item.ordemCanonica,
      },
    });
    if (novo) criados++;
  }
  console.log(`✓ item Anexo XII adicionado a ${criados} técnico(s)`);

  const documentos = await DocumentoIncentivo.findAll({ include: [{ model: ParticipanteIncentivo, attributes: ['tipo_pessoa'] }] });
  let reordenados = 0;
  for (const doc of documentos) {
    const def = buscarItemChecklist(doc.ParticipanteIncentivo.tipo_pessoa, doc.tipo_documento);
    if (!def || doc.ordem === def.ordemCanonica) continue;
    await doc.update({ ordem: def.ordemCanonica });
    reordenados++;
  }
  console.log(`✓ ordem recalculada em ${reordenados} documento(s)`);
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
