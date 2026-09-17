// Script one-off: implementa a regra de comprovação de residência da
// Resolução CIE 004/2026 (Art. 17) — 3 caminhos possíveis (proprietário /
// menor que mora com o responsável / terceiro, esse último exigindo
// Declaração de Residência + comprovação de vínculo com Curitiba). Ver
// `resolverCaminhoResidencia` em participantesIncentivoController.js pra a
// lógica completa (duplicada aqui em JS puro, sem depender do controller).
//
// Este script:
//   1) cria as colunas novas `proprietario_imovel` e `mora_com_responsavel`
//      em participantes_incentivo (default: não-proprietário, mora com
//      responsável — os valores mais comuns);
//   2) para cada participante já existente, resolve o caminho e injeta os
//      itens novos do checklist (`declaracao_residencia_anexo_ix`,
//      `vinculo_curitiba`) quando aplicável, sem duplicar se já existirem;
//   3) atualiza o nome_exibicao do item `comprovante_residencia` já
//      semeado pra refletir o caminho de cada um;
//   4) recalcula `ordem` de todo documento de checklist, já que os itens
//      novos empurraram os que vinham depois.
// Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-comprovante-residencia.js
const sequelize = require('../config/database');
const { CHECKLIST_ATLETA, CHECKLIST_TECNICO } = require('../constants/incentivoEsporte');

const COLUNA_JA_EXISTE = 'ER_DUP_FIELDNAME';

function resolverCaminho(p) {
  if (p.proprietario_imovel) return 'proprietario';
  const nascimento = p.data_nascimento ? new Date(p.data_nascimento + 'T00:00:00') : null;
  const elegivelPorIdade = nascimento && nascimento.getFullYear() >= 2009;
  if (elegivelPorIdade && p.mora_com_responsavel !== 0) return 'menor_com_responsavel';
  return 'terceiro';
}

function nomeComprovante(caminho) {
  if (caminho === 'proprietario') return 'Comprovante de residência em seu nome (água/luz/telefone fixo/internet fixa/TV assinatura/gás — 2º semestre/2026)';
  if (caminho === 'menor_com_responsavel') return 'Comprovante de residência em nome dos pais/responsável legal (água/luz/telefone fixo/internet fixa/TV assinatura/gás — 2º semestre/2026)';
  return 'Comprovante de residência em nome do proprietário/locador/locatário (água/luz/telefone fixo/internet fixa/TV assinatura/gás — 2º semestre/2026)';
}

function indiceNoChecklist(tipoPessoa, tipoDocumento) {
  const checklist = tipoPessoa === 'tecnico' ? CHECKLIST_TECNICO : CHECKLIST_ATLETA;
  const idx = checklist.findIndex(item => item.key === tipoDocumento);
  return idx === -1 ? null : idx;
}

function itemDoChecklist(tipoPessoa, tipoDocumento) {
  const checklist = tipoPessoa === 'tecnico' ? CHECKLIST_TECNICO : CHECKLIST_ATLETA;
  return checklist.find(item => item.key === tipoDocumento) || null;
}

async function main() {
  await sequelize.authenticate();

  try {
    await sequelize.query(`ALTER TABLE participantes_incentivo ADD COLUMN proprietario_imovel TINYINT(1) NOT NULL DEFAULT 0`);
    console.log('✓ coluna proprietario_imovel adicionada');
  } catch (e) {
    if (e.original?.code === COLUNA_JA_EXISTE) console.log('· proprietario_imovel já existe, ignorando');
    else throw e;
  }
  try {
    await sequelize.query(`ALTER TABLE participantes_incentivo ADD COLUMN mora_com_responsavel TINYINT(1) NOT NULL DEFAULT 1`);
    console.log('✓ coluna mora_com_responsavel adicionada');
  } catch (e) {
    if (e.original?.code === COLUNA_JA_EXISTE) console.log('· mora_com_responsavel já existe, ignorando');
    else throw e;
  }

  const [participantes] = await sequelize.query(
    `SELECT id, escola_id, tipo_pessoa, data_nascimento, proprietario_imovel, mora_com_responsavel FROM participantes_incentivo WHERE ativo = 1`
  );

  for (const p of participantes) {
    const caminho = resolverCaminho(p);

    // 1) nome_exibicao do comprovante já semeado
    await sequelize.query(
      `UPDATE documentos_incentivo SET nome_exibicao = ? WHERE participante_id = ? AND tipo_documento = 'comprovante_residencia'`,
      { replacements: [nomeComprovante(caminho), p.id] }
    );

    // 2) injeta os itens novos só se o caminho exigir e ainda não existirem
    if (caminho === 'terceiro') {
      for (const chave of ['declaracao_residencia_anexo_ix', 'vinculo_curitiba']) {
        const [[existente]] = await sequelize.query(
          `SELECT id FROM documentos_incentivo WHERE participante_id = ? AND tipo_documento = ?`,
          { replacements: [p.id, chave] }
        );
        if (existente) continue;
        const item = itemDoChecklist(p.tipo_pessoa, chave);
        const ordem = indiceNoChecklist(p.tipo_pessoa, chave);
        if (!item) continue;
        await sequelize.query(
          `INSERT INTO documentos_incentivo (id, escola_id, participante_id, tipo_documento, nome_exibicao, origem, status, ordem, created_at, updated_at)
           VALUES (UUID(), ?, ?, ?, ?, 'upload', 'pendente', ?, NOW(), NOW())`,
          { replacements: [p.escola_id, p.id, chave, item.nome, ordem] }
        );
        console.log(`✓ item "${chave}" adicionado pro participante ${p.id} (caminho: terceiro)`);
      }
    }
  }

  // 3) recalcula ordem de todo documento de checklist (itens novos
  // empurraram os que vinham depois no array canônico).
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
