// Script one-off: cria bolsas_incentivo + despesas_bolsa_incentivo e importa
// os bolsistas do ciclo 2026 (valor da bolsa + suplementação do 2º semestre).
// Idempotente: tabelas via sync() só se não existirem; bolsas via findOrCreate
// por (escola, ano, nome) — não sobrescreve valores já editados na tela.
//   docker compose exec backend node src/scripts/2026-11-incentivo-bolsas.js
const sequelize = require('../config/database');
const { BolsaIncentivo, DespesaBolsaIncentivo, Usuario, ParticipanteIncentivo } = require('../models');

const ANO = 2026;
// [nome, bolsa, suplementação (null = não recebeu)]
const BOLSISTAS = [
  ['Fulvio Vilas Boas', 5000, 4000],
  ['Otávio Augusto Vilas Boas', 1400, 1120],
  ['Isabele Baptista Santos', 5000, 4000],
  ['Emanuela de Jesus Silvério Iwanechen', 1400, 1120],
  ['Sandra Regina Godoi Alves', 1500, 1200],
  ['Elisson de Jesus Bomfim', 1500, null],
  ['Arthur Baptista Santos', 1400, 1120],
  ['Davi Miguel Baptista Santos', 1400, 1120],
  ['Giovanna Carvalho Lazaro', 1400, 1120],
  ['Thyago André Choinski Lazaro', 3500, 2800],
  ['João Guilherme de Oliveira Leocádio', 1500, 1200],
];

async function main() {
  await sequelize.authenticate();
  await BolsaIncentivo.sync();
  await DespesaBolsaIncentivo.sync();
  console.log('✓ tabelas ok');

  // Escola: a mesma dos participantes do Incentivo já cadastrados.
  const escolas = await ParticipanteIncentivo.findAll({ attributes: ['escola_id'], group: ['escola_id'] });
  if (escolas.length !== 1) throw new Error(`Esperava 1 escola no Incentivo, achei ${escolas.length}`);
  const escola_id = escolas[0].escola_id;

  for (const [nome, bolsa, sup] of BOLSISTAS) {
    const alunos = await Usuario.findAll({ where: { escola_id, nome }, attributes: ['id'] });
    const aluno_id = alunos.length === 1 ? alunos[0].id : null;
    const [, criado] = await BolsaIncentivo.findOrCreate({
      where: { escola_id, ano: ANO, nome },
      defaults: { aluno_id, valor_bolsa: bolsa, valor_suplementacao: sup },
    });
    console.log(`${criado ? '✓ criada ' : '· já existe'} ${nome} — ${bolsa}${sup ? ` + ${sup}` : ''}${aluno_id ? '' : '  (sem vínculo com aluno)'}`);
  }
  const total = await BolsaIncentivo.count({ where: { escola_id, ano: ANO } });
  console.log(`Total ${ANO}: ${total} bolsas`);
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
