// Script one-off: conquistas do Campeonato Paranaense de Equipe 2026 (FTPK,
// Curitiba, 26/09/2026), passadas pelo Fulvio em 30/09/2026. Nomes,
// modalidades e categorias normalizados pro padrão já existente em
// `conquistas` (ver Progress.txt). Faixa = graduação atual (Karatê) de cada
// aluno — competição foi há dias. Competição só guarda o ano, não a data.
//   docker compose exec backend node src/scripts/2026-09-conquistas-paranaense-equipe.js            (simula)
//   docker compose exec backend node src/scripts/2026-09-conquistas-paranaense-equipe.js --commit   (grava)
// Aborta se a competição já tiver conquistas (não duplica).
const sequelize = require('../config/database');
const { Competicao, Conquista, Usuario, ArteMarcial, GraduacaoAluno, Faixa } = require('../models');

const COMMIT = process.argv.includes('--commit');

const COMPETICAO = {
  ano: 2026, nome: 'Campeonato Paranaense de Equipe', nivel: 'estadual',
  entidade: 'Federação Tradicional Paranaense de Karatê', cidade: 'Curitiba', estado: 'PR', pais: 'Brasil',
};

// [aluno (nome exato do cadastro), colocação, modalidade, categoria]
const RESULTADOS = [
  ['Fulvio Vilas Boas', 1, 'Kata Equipe', 'Adulto'],
  ['Fulvio Vilas Boas', 1, 'Kumite Equipe', 'Adulto'],
  ['Fulvio Vilas Boas', 1, 'Enbu Masculino', 'Adulto'],
  ['Fulvio Vilas Boas', 1, 'Enbu Misto', 'Adulto'],

  ['Otávio Augusto Vilas Boas', 1, 'Kata Equipe', '14-15 anos'],
  ['Otávio Augusto Vilas Boas', 1, 'Enbu Misto', 'Até 13 anos'],
  ['Otávio Augusto Vilas Boas', 2, 'Enbu Masculino', 'Até 13 anos'],
  ['Otávio Augusto Vilas Boas', 2, 'Fukugo', '12-13 anos'],

  ['Thyago André Choinski Lazaro', 1, 'Kata Equipe', 'Adulto'],
  ['Thyago André Choinski Lazaro', 1, 'Kumite Equipe', 'Adulto'],
  ['Thyago André Choinski Lazaro', 1, 'Fukugo', 'Adulto - Até vermelha'],

  ['Elisson de Jesus Bomfim', 1, 'Kata Equipe', 'Adulto'],
  ['Elisson de Jesus Bomfim', 1, 'Kumite Equipe', 'Adulto'],
  ['Elisson de Jesus Bomfim', 1, 'Enbu Masculino', 'Adulto'],

  ['Davi Miguel Baptista Santos', 1, 'Kata Equipe', '14-15 anos'],
  ['Davi Miguel Baptista Santos', 2, 'Enbu Masculino', 'Até 13 anos'],

  ['Giovanna Carvalho Lazaro', 1, 'Enbu Misto', '14-15 anos'],
  ['Giovanna Carvalho Lazaro', 1, 'Enbu Feminino', '14-15 anos'],
  ['Giovanna Carvalho Lazaro', 1, 'Kata Equipe', 'Adulto'],
  ['Giovanna Carvalho Lazaro', 1, 'Fukugo', '14-15 anos'],
  ['Giovanna Carvalho Lazaro', 2, 'Kumite Equipe', '14-15 anos'],

  ['Emanuela de Jesus Silvério Iwanechen', 1, 'Kata Equipe', 'Adulto'],
  ['Emanuela de Jesus Silvério Iwanechen', 1, 'Enbu Feminino', '14-15 anos'],
  ['Emanuela de Jesus Silvério Iwanechen', 1, 'Enbu Misto', 'Até 13 anos'],
  ['Emanuela de Jesus Silvério Iwanechen', 2, 'Fukugo', '12-13 anos'],
  ['Emanuela de Jesus Silvério Iwanechen', 2, 'Kumite Equipe', '14-15 anos'],

  ['Arthur Baptista Santos', 1, 'Kata Equipe Masculino', '14-15 anos'],
  ['Arthur Baptista Santos', 1, 'Enbu Misto', '14-15 anos'],
  ['Arthur Baptista Santos', 2, 'Kumite Equipe Masculino', '16-17 anos'],

  ['Melina Higuchi e Lima', 1, 'Fukugo', '8-9 anos'],
  ['Melina Higuchi e Lima', 2, 'Kata Equipe', '8-9 anos'],

  ['Melissa Wantuk Seronato', 2, 'Kata Equipe', '8-9 anos'],
  ['Melissa Wantuk Seronato', 4, 'Fukugo', '8-9 anos'],

  ['Ayumi Tanji Grande', 2, 'Kata Equipe', '8-9 anos'],
  ['Ayumi Tanji Grande', 3, 'Fukugo', '8-9 anos'],
];

async function main() {
  await sequelize.authenticate();

  const nomes = [...new Set(RESULTADOS.map(r => r[0]))];
  const alunos = await Usuario.findAll({ where: { nome: nomes } });
  const porNome = new Map(alunos.map(a => [a.nome, a]));
  const faltando = nomes.filter(n => !porNome.has(n));
  const repetidos = nomes.filter(n => alunos.filter(a => a.nome === n).length > 1);
  if (faltando.length || repetidos.length) throw new Error(`Alunos não encontrados: ${faltando.join(', ') || '—'} | nomes duplicados: ${repetidos.join(', ') || '—'}`);

  const escolaId = alunos[0].escola_id;
  if (alunos.some(a => a.escola_id !== escolaId)) throw new Error('Alunos de escolas diferentes');
  const karate = await ArteMarcial.findOne({ where: { escola_id: escolaId, nome: 'Karatê Shotokan' } });
  if (!karate) throw new Error('Arte marcial Karatê Shotokan não encontrada');

  const existente = await Competicao.findOne({ where: { escola_id: escolaId, ano: COMPETICAO.ano, nome: COMPETICAO.nome } });
  if (existente && await Conquista.count({ where: { competicao_id: existente.id } })) {
    throw new Error(`Competição "${COMPETICAO.nome}" ${COMPETICAO.ano} já tem conquistas — nada feito (não duplica)`);
  }

  const graduacoes = await GraduacaoAluno.findAll({
    where: { aluno_id: alunos.map(a => a.id), arte_marcial_id: karate.id, atual: true },
    include: [{ model: Faixa, attributes: ['nome'] }],
  });
  const faixaPorAluno = new Map(graduacoes.map(g => [g.aluno_id, { faixa_id: g.faixa_id, nome: g.Faixa?.nome, origem: 'graduação atual' }]));
  // Sem graduação atual cadastrada (ex: Fulvio): usa a faixa da conquista
  // mais recente dele que tenha faixa.
  for (const a of alunos.filter(x => !faixaPorAluno.has(x.id))) {
    const ultima = await Conquista.findOne({
      where: { aluno_id: a.id, faixa_id: { [require('sequelize').Op.ne]: null } },
      include: [{ model: Faixa, attributes: ['nome'] }, { model: Competicao, attributes: ['ano'] }],
      order: [[Competicao, 'ano', 'DESC'], ['created_at', 'DESC']],
    });
    if (ultima) faixaPorAluno.set(a.id, { faixa_id: ultima.faixa_id, nome: ultima.Faixa?.nome, origem: `última conquista (${ultima.Competicao.ano})` });
  }

  await sequelize.transaction(async (t) => {
    const competicao = existente || await Competicao.create({ ...COMPETICAO, escola_id: escolaId }, { transaction: t });
    console.log(`${existente ? '· competição já existia (sem conquistas)' : '✓ competição'}: ${COMPETICAO.nome} ${COMPETICAO.ano} — ${COMPETICAO.entidade}, ${COMPETICAO.cidade}/${COMPETICAO.estado}\n`);
    for (const [nome, colocacao, modalidade, categoria] of RESULTADOS) {
      const aluno = porNome.get(nome);
      const grad = faixaPorAluno.get(aluno.id);
      await Conquista.create({
        escola_id: escolaId, competicao_id: competicao.id, aluno_id: aluno.id, nome_atleta: aluno.nome,
        arte_marcial_id: karate.id, faixa_id: grad?.faixa_id || null, colocacao, modalidade, categoria,
      }, { transaction: t });
      console.log(`  ${colocacao}º  ${nome.padEnd(38)} ${modalidade.padEnd(24)} ${categoria.padEnd(22)} faixa: ${grad ? `${grad.nome} (${grad.origem})` : '(sem faixa)'}`);
    }
    console.log(`\n${RESULTADOS.length} conquista(s).`);
    if (!COMMIT) throw new Error('SIMULACAO');
  }).catch(e => { if (e.message !== 'SIMULACAO') throw e; });

  console.log(COMMIT ? '✓ Gravado.' : 'Simulação — nada gravado. Rode com --commit para gravar.');
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
