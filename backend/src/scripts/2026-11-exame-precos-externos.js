// Script one-off: taxa por faixa, tipos de faixa e candidato externo no exame;
// Branca/Cinza nos critérios do Roteiro Padrão do Karatê em que a Cinza já
// está. Só adiciona (aluno_id passa a aceitar nulo). Idempotente. Rodar ANTES
// de subir o backend novo.
const { DataTypes: T } = require('sequelize');
const sequelize = require('../config/database');

const COLUNAS = {
  exames: { taxas_por_faixa: { type: T.JSON }, tipos_faixa: { type: T.JSON } },
  exame_pedidos_faixa: { tipo: { type: T.STRING(60) } },
  exame_participantes: {
    externo_nome: { type: T.STRING }, externo_nascimento: { type: T.DATEONLY }, externo_responsavel: { type: T.STRING },
    externo_telefone: { type: T.STRING(40) }, externo_origem: { type: T.STRING },
  },
};

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  for (const [tabela, colunas] of Object.entries(COLUNAS)) {
    const atuais = await qi.describeTable(tabela);
    for (const [nome, def] of Object.entries(colunas)) {
      if (atuais[nome]) { console.log(`· ${tabela}.${nome} já existe`); continue; }
      await qi.addColumn(tabela, nome, def);
      console.log(`✓ ${tabela}.${nome}`);
    }
  }
  if (!(await qi.describeTable('exame_participantes')).aluno_id.allowNull) {
    await qi.changeColumn('exame_participantes', 'aluno_id', { type: T.UUID, allowNull: true });
    console.log('✓ exame_participantes.aluno_id aceita nulo (externo)');
  }

  const { Exame, ArteMarcial, Faixa, FaseExame, CriterioExame, CriterioExameFaixa } = require('../models');
  for (const exame of await Exame.findAll({ where: { tipo: 'roteiro_padrao' }, include: [{ model: ArteMarcial, where: { nome: 'Karatê Shotokan' } }] })) {
    const faixa = (nome) => Faixa.findOne({ where: { arte_marcial_id: exame.arte_marcial_id, nome } });
    const [cinza, bc] = [await faixa('Cinza'), await faixa('Branca/Cinza')];
    if (!cinza || !bc) continue;
    const criterios = await CriterioExame.findAll({ include: [{ model: FaseExame, where: { exame_id: exame.id } }, CriterioExameFaixa] });
    let n = 0;
    for (const c of criterios) {
      const ids = c.CriterioExameFaixas.map((f) => f.faixa_id);
      if (!ids.includes(cinza.id) || ids.includes(bc.id)) continue;
      await CriterioExameFaixa.create({ criterio_exame_id: c.id, faixa_id: bc.id });
      n += 1;
    }
    console.log(`✓ ${exame.nome}: Branca/Cinza incluída em ${n} de ${criterios.length} critérios`);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
