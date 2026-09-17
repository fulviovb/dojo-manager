// Script one-off: corrige um bug do script anterior
// (2026-09-incentivo-comprovante-residencia.js) — a sincronização criada
// pra quando o usuário edita proprietario_imovel/mora_com_responsavel só
// ADICIONAVA itens de residência que passaram a ser exigidos, nunca
// removia os que deixaram de ser (ex: Fulvio marcado depois como
// proprietário continuava com "Declaração de Residência" e "Vínculo
// Curitiba" pendentes no checklist, mesmo não precisando mais deles).
// Corrigido em participantesIncentivoController.js
// (sincronizarChecklistResidencia agora remove os itens obsoletos, mas só
// se ainda estiverem vazios — pendente e sem arquivo, nunca apaga upload
// em andamento). Este script aplica essa reconciliação uma vez em todos os
// participantes ativos, pra quem já tinha ficado com item obsoleto preso.
// Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-residencia-remover-obsoletos.js
const sequelize = require('../config/database');

function resolverCaminho(p) {
  if (p.proprietario_imovel) return 'proprietario';
  const nascimento = p.data_nascimento ? new Date(p.data_nascimento + 'T00:00:00') : null;
  const elegivelPorIdade = nascimento && nascimento.getFullYear() >= 2009;
  if (elegivelPorIdade && p.mora_com_responsavel !== 0) return 'menor_com_responsavel';
  return 'terceiro';
}

async function main() {
  await sequelize.authenticate();

  const [participantes] = await sequelize.query(
    `SELECT id, nome, data_nascimento, proprietario_imovel, mora_com_responsavel FROM participantes_incentivo WHERE ativo = 1`
  );

  let removidos = 0;
  for (const p of participantes) {
    const caminho = resolverCaminho(p);
    if (caminho === 'terceiro') continue; // ainda exige os itens, não mexe

    const [obsoletos] = await sequelize.query(
      `SELECT id, tipo_documento FROM documentos_incentivo
       WHERE participante_id = ? AND tipo_documento IN ('declaracao_residencia_anexo_ix', 'vinculo_curitiba')
         AND status = 'pendente' AND arquivo_url IS NULL`,
      { replacements: [p.id] }
    );
    for (const doc of obsoletos) {
      await sequelize.query(`DELETE FROM documentos_incentivo WHERE id = ?`, { replacements: [doc.id] });
      console.log(`✓ removido "${doc.tipo_documento}" de ${p.nome} (caminho: ${caminho})`);
      removidos++;
    }
  }
  console.log(`✓ ${removidos} item(ns) obsoleto(s) removido(s)`);
  console.log('✓ Correção aplicada com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar correção:', e);
  process.exit(1);
});
