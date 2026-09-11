// Importa o histórico de conquistas (2017-2026) da planilha externa do
// Fulvio para as tabelas competicoes/conquistas. Os registros brutos foram
// extraídos previamente da planilha (uma linha por atleta+modalidade,
// agrupados por bloco de competição) e salvos em data/conquistas-planilha-2026-09.json.
//
// Uso:
//   docker compose exec backend node src/scripts/2026-09-import-conquistas.js            (simulação — não grava nada)
//   docker compose exec backend node src/scripts/2026-09-import-conquistas.js --commit    (grava de verdade)
//
// Idempotente: pode rodar de novo (findOrCreate por chave natural), não duplica.

const path = require('path');
const fs = require('fs');
const sequelize = require('../config/database');
const { Escola, ArteMarcial, Faixa, Usuario, Competicao, Conquista } = require('../models');

const COMMIT = process.argv.includes('--commit');

// --- Mapeamento manual dos 24 blocos de competição distintos encontrados na planilha ---
// nivel: municipal | estadual | nacional | panamericano | mundial
// confianca 'baixa' = decisão que vale revisar com o Fulvio depois de importado
const MAPA_COMPETICOES = {
  '1ª ETAPA - CAMPEONATO PARANAENSE DE KARATÊ - FAZENDA RIO GRANDE': { nome: 'Campeonato Paranaense de Karatê', etapa: '1ª Etapa', nivel: 'estadual', entidade: 'Federação Paranaense de Karatê', cidade: 'Fazenda Rio Grande', estado: 'PR', pais: 'Brasil' },
  '2º ETAPA - CAMPEONATO PARANAENSE DE KARATÊ - IBAITI': { nome: 'Campeonato Paranaense de Karatê', etapa: '2ª Etapa', nivel: 'estadual', entidade: 'Federação Paranaense de Karatê', cidade: 'Ibaiti', estado: 'PR', pais: 'Brasil' },
  '1ª ETAPA - CAMPEONATO PARANAENSE DE KARATÊ - CASCAVEL': { nome: 'Campeonato Paranaense de Karatê', etapa: '1ª Etapa', nivel: 'estadual', entidade: 'Federação Paranaense de Karatê', cidade: 'Cascavel', estado: 'PR', pais: 'Brasil' },
  '2ª ETAPA - CAMPEONATO PARANAENSE DE KARATÊ - ROLÂNDIA': { nome: 'Campeonato Paranaense de Karatê', etapa: '2ª Etapa', nivel: 'estadual', entidade: 'Federação Paranaense de Karatê', cidade: 'Rolândia', estado: 'PR', pais: 'Brasil' },
  'CAMPEONATO BRASILEIRO DE KARATÊ - CUIABÁ': { nome: 'Campeonato Brasileiro de Karatê', nivel: 'nacional', entidade: 'Confederação Brasileira de Karatê', cidade: 'Cuiabá', estado: 'MT', pais: 'Brasil' },
  'CAMPEONATO MUNDIAL DE KARATÊ - NATAL (CHILDREN)': { nome: 'Campeonato Mundial de Karatê - Children', nivel: 'mundial', entidade: 'World Karate Federation', cidade: 'Natal', estado: 'RN', pais: 'Brasil' },
  'CAMPEONATO MUNDIAL DE KARATÊ - NATAL (OPEN)': { nome: 'Campeonato Mundial de Karatê - Open', nivel: 'mundial', entidade: 'World Karate Federation', cidade: 'Natal', estado: 'RN', pais: 'Brasil' },
  'CAMPEONATO PARANAENSE DE KARATÊ - FAZENDA RIO GRANDE': { nome: 'Campeonato Paranaense de Karatê', nivel: 'estadual', entidade: 'Federação Paranaense de Karatê', cidade: 'Fazenda Rio Grande', estado: 'PR', pais: 'Brasil' },
  'CAMPEONATO BRASILEIRO DE KARATÊ - SALVADOR': { nome: 'Campeonato Brasileiro de Karatê', nivel: 'nacional', entidade: 'Confederação Brasileira de Karatê', cidade: 'Salvador', estado: 'BA', pais: 'Brasil' },
  'CAMPEONATO PANAMERICANO DE KARATÊ - BUENOS AIRES (CHILDREN)': { nome: 'Campeonato Panamericano de Karatê - Children', nivel: 'panamericano', entidade: 'Panamerican Karate Federation', cidade: 'Buenos Aires', estado: null, pais: 'Argentina' },
  'CAMPEONATO PANAMERICANO DE KARATÊ - BUENOS AIRES (OPEN)': { nome: 'Campeonato Panamericano de Karatê - Open', nivel: 'panamericano', entidade: 'Panamerican Karate Federation', cidade: 'Buenos Aires', estado: null, pais: 'Argentina' },
  'CAMPEONATO PARANAENSE DE KARATÊ - CASCAVEL': { nome: 'Campeonato Paranaense de Karatê', nivel: 'estadual', entidade: 'Federação Paranaense de Karatê', cidade: 'Cascavel', estado: 'PR', pais: 'Brasil' },
  'COPA OPEN INTERNACIONAL DE KARATÊ - SALVADOR': { nome: 'Copa Open Internacional de Karatê', nivel: 'mundial', entidade: null, cidade: 'Salvador', estado: 'BA', pais: 'Brasil' },
  'CAMPEONATO BRASILEIRO DE KARATÊ - CASCAVEL': { nome: 'Campeonato Brasileiro de Karatê', nivel: 'nacional', entidade: 'Confederação Brasileira de Karatê', cidade: 'Cascavel', estado: 'PR', pais: 'Brasil' },
  'CAMPEONATO MUNDIAL DE KARATÊ - LIMA (CHILDREN)': { nome: 'Campeonato Mundial de Karatê - Children', nivel: 'mundial', entidade: 'World Karate Federation', cidade: 'Lima', estado: null, pais: 'Peru' },
  'CAMPEONATO MUNDIAL DE KARATÊ - LIMA (OPEN)': { nome: 'Campeonato Mundial de Karatê - Open', nivel: 'mundial', entidade: 'World Karate Federation', cidade: 'Lima', estado: null, pais: 'Peru' },
  'CAMPEONATO PARANAENSE DE KARATÊ - FIGUEIRA': { nome: 'Campeonato Paranaense de Karatê', nivel: 'estadual', entidade: 'Federação Paranaense de Karatê', cidade: 'Figueira', estado: 'PR', pais: 'Brasil' },
  'CAMPEONATO BRASILEIRO DE KARATÊ - NATAL': { nome: 'Campeonato Brasileiro de Karatê', nivel: 'nacional', entidade: 'Confederação Brasileira de Karatê', cidade: 'Natal', estado: 'RN', pais: 'Brasil' },
  'CAMPEONATO PANAMERICANO DE KARATÊ - NATAL (CHILDREM)': { nome: 'Campeonato Panamericano de Karatê - Children', nivel: 'panamericano', entidade: 'Panamerican Karate Federation', cidade: 'Natal', estado: 'RN', pais: 'Brasil' },
  'CAMPEONATO PANAMERICANO DE KARATÊ - NATAL (OPEN)': { nome: 'Campeonato Panamericano de Karatê - Open', nivel: 'panamericano', entidade: 'Panamerican Karate Federation', cidade: 'Natal', estado: 'RN', pais: 'Brasil' },
  'CAMPEONATO PARANAENSE DE KARATÊ - Rolândia': { nome: 'Campeonato Paranaense de Karatê', nivel: 'estadual', entidade: 'Federação Paranaense de Karatê', cidade: 'Rolândia', estado: 'PR', pais: 'Brasil' },
  'CAMPEONATO BRASILEIRO DE KARATÊ - João Pessoa/PB': { nome: 'Campeonato Brasileiro de Karatê', nivel: 'nacional', entidade: 'Confederação Brasileira de Karatê', cidade: 'João Pessoa', estado: 'PB', pais: 'Brasil' },
  'CAMPEONATO PARANAENSE DE KARATÊ - Figueira': { nome: 'Campeonato Paranaense de Karatê', nivel: 'estadual', entidade: 'Federação Paranaense de Karatê', cidade: 'Figueira', estado: 'PR', pais: 'Brasil' },
  'COPA OPEN INTERNACIONAL DE KARATÊ - João Pessoa/PB': { nome: 'Copa Open Internacional de Karatê', nivel: 'mundial', entidade: null, cidade: 'João Pessoa', estado: 'PB', pais: 'Brasil' },
};

// --- Normalização de modalidade (variações de digitação da planilha) ---
const MAPA_MODALIDADE = {
  'kata individual': 'Kata Individual',
  'kumite individual': 'Kumite Individual',
  'enbu misto': 'Enbu Misto', 'embu misto': 'Enbu Misto',
  'enbu masculino': 'Enbu Masculino', 'embu masculino': 'Enbu Masculino',
  'enbu feminino': 'Enbu Feminino', 'embu feminino': 'Enbu Feminino',
  'kata equipe': 'Kata Equipe',
  'kata equipe fem': 'Kata Equipe Feminino', 'kata equipe feminino': 'Kata Equipe Feminino',
  'kata equipe mas': 'Kata Equipe Masculino', 'kata equipe masculino': 'Kata Equipe Masculino',
  'kata equipe misto': 'Kata Equipe Misto',
  'kumite equipe': 'Kumite Equipe', 'kumite em equipe': 'Kumite Equipe',
  'kumite equipe feminino': 'Kumite Equipe Feminino',
  'fukugo': 'Fukugo', 'fukugo individual': 'Fukugo',
  'kata/kumite individual': 'Kata/Kumite Individual', // ambíguo na planilha original — mantido literal
};

function normalizarModalidade(raw) {
  const chave = raw.trim().toLowerCase();
  return MAPA_MODALIDADE[chave] || raw.trim();
}

function normalizarNome(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

async function main() {
  const dataPath = path.join(__dirname, 'data', 'conquistas-planilha-2026-09.json');
  const { registros, avisos: avisosExtracao } = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const escola = await Escola.findOne();
  if (!escola) throw new Error('Nenhuma escola cadastrada');

  const arteMarcial = await ArteMarcial.findOne({ where: { escola_id: escola.id, nome: 'Karatê Shotokan' } });
  if (!arteMarcial) throw new Error('Arte marcial "Karatê Shotokan" não encontrada');

  const faixas = await Faixa.findAll({ where: { arte_marcial_id: arteMarcial.id } });
  const faixaPorNome = new Map(faixas.map(f => [normalizarNome(f.nome), f]));

  const usuarios = await Usuario.findAll({ where: { escola_id: escola.id } });
  const usuarioPorNome = new Map();
  for (const u of usuarios) {
    const chave = normalizarNome(u.nome);
    if (!usuarioPorNome.has(chave)) usuarioPorNome.set(chave, u);
  }

  const avisos = [...avisosExtracao];
  const titulosNaoMapeados = new Set();
  let competicaoStats = new Map(); // nome bloco -> {criada, ja_existia}
  let conquistasNovas = 0;
  let conquistasJaExistentes = 0;
  let alunosSemMatch = new Set();
  let colocacoesInvalidas = 0;

  await sequelize.transaction(async (t) => {
    const cacheCompeticao = new Map(); // bloco_titulo+ano -> Competicao

    for (const r of registros) {
      const chaveBloco = `${r.ano}::${r.bloco_titulo}`;
      let competicao = cacheCompeticao.get(chaveBloco);

      if (!competicao) {
        const mapa = MAPA_COMPETICOES[r.bloco_titulo];
        if (!mapa) {
          titulosNaoMapeados.add(r.bloco_titulo);
          continue;
        }
        if (mapa.confianca === 'baixa') {
          avisos.push(`Competição de baixa confiança: "${r.bloco_titulo}" (${r.ano}) — ${mapa.obs}`);
        }

        const [comp, criada] = await Competicao.findOrCreate({
          where: { escola_id: escola.id, ano: r.ano, nome: mapa.nome, etapa: mapa.etapa || null },
          defaults: {
            nivel: mapa.nivel,
            entidade: mapa.entidade,
            cidade: mapa.cidade,
            estado: mapa.estado,
            pais: mapa.pais,
          },
          transaction: t,
        });
        competicao = comp;
        cacheCompeticao.set(chaveBloco, competicao);
        const stat = competicaoStats.get(r.bloco_titulo) || { criada: 0, ja_existia: 0 };
        stat[criada ? 'criada' : 'ja_existia']++;
        competicaoStats.set(r.bloco_titulo, stat);
      }

      if (!r.atleta) {
        avisos.push(`${r.ano} / ${r.bloco_titulo}: linha sem atleta associado (modalidade=${r.modalidade}) — pulada`);
        continue;
      }

      let colocacao = null;
      if (typeof r.colocacao_raw === 'number') {
        colocacao = Math.round(r.colocacao_raw);
      } else if (r.colocacao_raw != null) {
        colocacoesInvalidas++;
        avisos.push(`${r.ano} / ${r.bloco_titulo} / ${r.atleta} (${r.modalidade}): colocação inválida na planilha ("${r.colocacao_raw}") — importada como vazia, corrigir manualmente depois`);
      }

      const usuario = usuarioPorNome.get(normalizarNome(r.atleta));
      if (!usuario) alunosSemMatch.add(r.atleta);

      let faixaId = null;
      if (r.faixa) {
        const faixa = faixaPorNome.get(normalizarNome(r.faixa));
        if (faixa) faixaId = faixa.id;
        else avisos.push(`${r.ano} / ${r.bloco_titulo} / ${r.atleta}: faixa "${r.faixa}" não encontrada no catálogo de Karatê Shotokan`);
      }

      const modalidade = normalizarModalidade(r.modalidade || '');

      const [, criada] = await Conquista.findOrCreate({
        where: {
          escola_id: escola.id,
          competicao_id: competicao.id,
          nome_atleta: r.atleta,
          modalidade,
          categoria: r.categoria || null,
        },
        defaults: {
          aluno_id: usuario ? usuario.id : null,
          arte_marcial_id: arteMarcial.id,
          faixa_id: faixaId,
          faixa_nome_livre: faixaId ? null : (r.faixa || null),
          colocacao,
        },
        transaction: t,
      });
      if (criada) conquistasNovas++; else conquistasJaExistentes++;
    }

    if (!COMMIT) {
      // simulação: desfaz tudo que o findOrCreate acabou de gravar
      throw new Error('__DRY_RUN__');
    }
  }).catch((e) => {
    if (e.message !== '__DRY_RUN__') throw e;
  });

  console.log(`\n=== Importação de Conquistas — ${COMMIT ? 'COMMIT (gravado no banco)' : 'SIMULAÇÃO (nada foi gravado)'} ===\n`);
  console.log(`Registros lidos da planilha: ${registros.length}`);
  console.log(`Competições distintas mapeadas: ${competicaoStats.size} de ${Object.keys(MAPA_COMPETICOES).length} no mapa`);
  console.log(`Conquistas ${COMMIT ? 'criadas' : 'que seriam criadas'}: ${conquistasNovas}`);
  console.log(`Conquistas já existentes (idempotência): ${conquistasJaExistentes}`);
  console.log(`Colocações inválidas na planilha original: ${colocacoesInvalidas}`);
  console.log(`Atletas sem cadastro de Aluno correspondente: ${alunosSemMatch.size}`);
  if (alunosSemMatch.size) console.log('  -> ' + [...alunosSemMatch].join(', '));
  if (titulosNaoMapeados.size) {
    console.log(`\n⚠ Títulos de competição SEM mapeamento (${titulosNaoMapeados.size}) — nada foi importado para eles:`);
    for (const t2 of titulosNaoMapeados) console.log('  -', t2);
  }
  if (avisos.length) {
    console.log(`\n⚠ Avisos (${avisos.length}):`);
    for (const a of avisos) console.log('  -', a);
  }
  console.log(`\n${COMMIT ? '✓ Importação concluída.' : 'Rode com --commit para gravar de verdade.'}\n`);

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
