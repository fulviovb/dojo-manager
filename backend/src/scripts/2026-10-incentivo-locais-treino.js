// Script one-off: cadastro de locais de treino do Incentivo ao Esporte.
//   1. cria locais_treino;
//   2. locais_treino_incentivo ganha local_id (FK RESTRICT) e endereco vira
//      opcional (legado);
//   3. semeia o cadastro com as salas da escola ("Nome\nEndereço"), pulando
//      as sem endereço real (sem nenhum número).
// Idempotente. Rodar uma vez:
//   docker compose exec backend node src/scripts/2026-10-incentivo-locais-treino.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { LocalTreino, LocalTreinoIncentivo, Sala } = require('../models');
const { localDaSala } = require('../utils/textoProjeto');

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  await LocalTreino.sync();
  console.log('✓ tabela locais_treino ok');

  const colunas = await qi.describeTable('locais_treino_incentivo');
  if (!colunas.local_id) {
    await qi.addColumn('locais_treino_incentivo', 'local_id', {
      type: DataTypes.UUID, allowNull: true,
      references: { model: 'locais_treino', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    });
    console.log('✓ locais_treino_incentivo.local_id adicionada');
  } else console.log('· local_id já existe');
  if (colunas.endereco && !colunas.endereco.allowNull) {
    await qi.changeColumn('locais_treino_incentivo', 'endereco', { type: DataTypes.STRING(500), allowNull: true });
    console.log('✓ endereco agora opcional');
  }

  for (const sala of await Sala.findAll()) {
    const { nome, endereco } = localDaSala(sala.nome);
    if (!endereco) { console.log(`· sala sem endereço real, pulada: ${nome}`); continue; }
    const [, novo] = await LocalTreino.findOrCreate({
      where: { escola_id: sala.escola_id, sala_id: sala.id },
      defaults: { escola_id: sala.escola_id, sala_id: sala.id, nome, endereco },
    });
    if (novo) console.log(`✓ local: ${nome} — ${endereco}`);
  }
  console.log(`linhas de horário já lançadas: ${await LocalTreinoIncentivo.count()}`);
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
