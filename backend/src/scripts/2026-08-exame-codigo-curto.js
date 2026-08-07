// Script one-off: coluna `codigo` em `exames` — código curto (6 caracteres)
// usado na URL pública do avaliador (/exame-avaliador/:codigo) em vez do
// UUID inteiro do exame, bem mais fácil de digitar no celular. Gera e
// preenche o código dos exames que já existem. Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-exame-codigo-curto.js
const sequelize = require('../config/database');

const CODIGO_JA_EXISTE = ['ER_DUP_FIELDNAME'];
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 (ambíguos)

function gerarCodigo() {
  let codigo = '';
  for (let i = 0; i < 6; i++) codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return codigo;
}

async function main() {
  await sequelize.authenticate();
  try {
    await sequelize.query('ALTER TABLE exames ADD COLUMN codigo VARCHAR(8) NULL');
    console.log('✓ coluna codigo criada em exames');
  } catch (e) {
    if (CODIGO_JA_EXISTE.includes(e.original?.code)) {
      console.log('· coluna codigo (já existia, ignorando)');
    } else {
      throw e;
    }
  }

  const [exames] = await sequelize.query('SELECT id FROM exames WHERE codigo IS NULL');
  for (const exame of exames) {
    let codigo;
    let tentativas = 0;
    do {
      codigo = gerarCodigo();
      tentativas += 1;
      const [existentes] = await sequelize.query('SELECT id FROM exames WHERE codigo = ?', { replacements: [codigo] });
      if (existentes.length === 0) break;
    } while (tentativas < 20);
    await sequelize.query('UPDATE exames SET codigo = ? WHERE id = ?', { replacements: [codigo, exame.id] });
    console.log(`✓ exame ${exame.id} -> código ${codigo}`);
  }

  try {
    await sequelize.query('ALTER TABLE exames MODIFY COLUMN codigo VARCHAR(8) NOT NULL, ADD UNIQUE (codigo)');
    console.log('✓ codigo agora obrigatório e único');
  } catch (e) {
    if (e.original?.code === 'ER_DUP_KEYNAME') {
      console.log('· índice único (já existia, ignorando)');
    } else {
      throw e;
    }
  }

  console.log('✓ Migração aplicada com sucesso.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao aplicar migração:', e);
  process.exit(1);
});
