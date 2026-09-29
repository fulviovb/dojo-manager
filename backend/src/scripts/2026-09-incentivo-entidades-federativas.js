// Script one-off: cadastro de entidades federativas.
//   1. cria a tabela entidades_federativas e a coluna
//      participantes_incentivo.entidade_federativa_id (coluna nova em tabela
//      existente não aparece sozinha com sync({alter:false}));
//   2. monta o cadastro a partir do texto já digitado nos participantes
//      ("Nome - CNPJ 00.000.000/0000-00"), uma entidade por CNPJ por escola;
//   3. vincula cada participante "possui" à entidade: pelo CNPJ do texto
//      ou, sem CNPJ, quando todas as palavras do nome da entidade aparecem
//      no texto (ex: "Karatê-dô Shotokan" ⊇ "Karatê Shotokan"). O que não
//      casar é listado pra ajuste manual na tela.
// Idempotente. Rodar uma vez:
//   docker compose exec backend node src/scripts/2026-09-incentivo-entidades-federativas.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { ParticipanteIncentivo, EntidadeFederativa } = require('../models');
const { normalizarCnpj, textoEntidade } = require('../controllers/entidadesFederativasController');

const palavras = (t) => new Set(String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));

async function main() {
  await sequelize.authenticate();
  await EntidadeFederativa.sync();
  const colunas = await sequelize.getQueryInterface().describeTable('participantes_incentivo');
  if (!colunas.entidade_federativa_id) {
    await sequelize.getQueryInterface().addColumn('participantes_incentivo', 'entidade_federativa_id', { type: DataTypes.UUID, allowNull: true });
    console.log('✓ coluna entidade_federativa_id adicionada');
  } else console.log('· coluna já existe');

  const participantes = await ParticipanteIncentivo.findAll({ where: { vinculo_federativo: 'possui', entidade_federativa_id: null } });

  // 2. entidades a partir dos textos com CNPJ
  for (const p of participantes) {
    const m = /^(.*?)\s*-\s*CNPJ\s*([\d./-]+)\s*$/i.exec(p.vinculo_federativo_entidade || '');
    if (!m) continue;
    let cnpj;
    try { cnpj = normalizarCnpj(m[2]); } catch { console.log(`! CNPJ inválido em "${p.vinculo_federativo_entidade}" (${p.nome})`); continue; }
    const [entidade, nova] = await EntidadeFederativa.findOrCreate({
      where: { escola_id: p.escola_id, cnpj },
      defaults: { escola_id: p.escola_id, nome: m[1].trim(), cnpj, cidade: 'Curitiba' },
    });
    if (nova) console.log(`✓ entidade criada: ${textoEntidade(entidade)}`);
  }

  // 3. vínculo
  const entidades = await EntidadeFederativa.findAll();
  let vinculados = 0;
  for (const p of participantes) {
    const texto = p.vinculo_federativo_entidade || '';
    const doEscola = entidades.filter(e => e.escola_id === p.escola_id);
    const m = /CNPJ\s*([\d./-]+)/i.exec(texto);
    let alvo = null;
    if (m) { try { const c = normalizarCnpj(m[1]); alvo = doEscola.find(e => e.cnpj === c); } catch { /* inválido */ } }
    if (!alvo) {
      const pt = palavras(texto);
      const candidatas = doEscola.filter(e => [...palavras(e.nome)].every(w => pt.has(w)));
      if (candidatas.length === 1) alvo = candidatas[0];
    }
    if (!alvo) { console.log(`! sem entidade correspondente: ${p.nome} — "${texto}" (ajustar na tela)`); continue; }
    await p.update({ entidade_federativa_id: alvo.id, vinculo_federativo_entidade: textoEntidade(alvo), vinculo_federativo_cidade: alvo.cidade });
    console.log(`  ${p.nome}: "${texto}" / "${p.previous('vinculo_federativo_cidade') ?? ''}" → ${alvo.nome}`);
    vinculados++;
  }
  console.log(`✓ ${vinculados} participante(s) vinculado(s)`);
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
