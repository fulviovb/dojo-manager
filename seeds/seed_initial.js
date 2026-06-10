// Seed inicial - Popula o banco de dados com dados demonstrativos
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'dojo_manager'
  });

  console.log('🌱 Iniciando seed do banco de dados...\n');

  try {
    // Limpar tabelas na ordem correta (respeitar FKs)
    const tables = [
      'campeonato_participantes', 'campeonatos',
      'exame_faixa_candidatos', 'exames_faixa',
      'contas_receber', 'contas_pagar',
      'faturas', 'assinaturas', 'planos',
      'frequencia', 'aulas',
      'turma_alunos', 'turmas',
      'aluno_graduacao', 'graduacoes', 'modalidades',
      'locais_treino', 'alunos', 'usuarios', 'academia'
    ];

    for (const table of tables) {
      await connection.query(`DELETE FROM ${table}`);
      await connection.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }
    console.log('🗑️  Tabelas limpas');

    // 1. Academia
    await connection.query(`
      INSERT INTO academia (nome, cnpj, endereco, telefone, email) VALUES
      ('DojoManager Academia', '12.345.678/0001-90', 'Rua das Artes Marciais, 100 - Centro', '(11) 3456-7890', 'contato@dojomanager.com.br')
    `);
    console.log('✅ Academia criada');

    // 2. Usuário admin
    const senhaHash = await bcrypt.hash('admin123', 10);
    await connection.query(`
      INSERT INTO usuarios (nome, email, senha_hash, role, ativo) VALUES
      ('Administrador', 'admin@dojo.com', ?, 'admin', TRUE),
      ('Maria Secretária', 'maria@dojo.com', ?, 'secretaria', TRUE),
      ('Sensei Tanaka', 'tanaka@dojo.com', ?, 'instrutor', TRUE)
    `, [senhaHash, senhaHash, senhaHash]);
    console.log('✅ Usuários criados (admin@dojo.com / admin123)');

    // 3. Modalidades
    await connection.query(`
      INSERT INTO modalidades (nome, descricao, ativo) VALUES
      ('Jiu-Jitsu', 'Arte marcial brasileira focada em técnicas de solo e submissão', TRUE),
      ('Karatê', 'Arte marcial japonesa que enfatiza golpes de punhos e chutes', TRUE),
      ('Muay Thai', 'Arte marcial tailandesa conhecida como a arte dos oito membros', TRUE),
      ('Judô', 'Arte marcial japonesa focada em projeções e imobilizações', TRUE)
    `);
    console.log('✅ Modalidades criadas');

    // 4. Graduações - Jiu-Jitsu (modalidade_id = 1)
    await connection.query(`
      INSERT INTO graduacoes (modalidade_id, nome_faixa, cor_faixa, ordem, tempo_minimo_meses, status_praticante, requisitos) VALUES
      (1, 'Faixa Branca', '#FFFFFF', 1, 0, 'aluno', 'Iniciante'),
      (1, 'Faixa Azul', '#1565C0', 2, 24, 'aluno', 'Dominar posições básicas, defesas e duas finalizações de cada posição'),
      (1, 'Faixa Roxa', '#7B1FA2', 3, 36, 'aluno', 'Fluência em transições, jogo de guarda avançado, 5 finalizações por posição'),
      (1, 'Faixa Marrom', '#5D4037', 4, 24, 'instrutor', 'Domínio técnico completo, capacidade de ensinar'),
      (1, 'Faixa Preta', '#000000', 5, 12, 'professor', 'Excelência técnica, contribuição para a arte'),
      (1, 'Faixa Coral', '#FF0000', 6, 84, 'mestre', 'Mestre - 7º grau'),
      (1, 'Faixa Vermelha', '#B71C1C', 7, 120, 'grao_mestre', 'Grão-Mestre - 9º/10º grau')
    `);

    // Graduações - Karatê (modalidade_id = 2)
    await connection.query(`
      INSERT INTO graduacoes (modalidade_id, nome_faixa, cor_faixa, ordem, tempo_minimo_meses, status_praticante, requisitos) VALUES
      (2, 'Faixa Branca', '#FFFFFF', 1, 0, 'aluno', 'Iniciante - 9º Kyu'),
      (2, 'Faixa Amarela', '#FFD600', 2, 6, 'aluno', '8º Kyu - Kihon básico'),
      (2, 'Faixa Vermelha', '#D32F2F', 3, 6, 'aluno', '7º Kyu - Kata Heian Shodan'),
      (2, 'Faixa Laranja', '#EF6C00', 4, 6, 'aluno', '6º Kyu - Kata Heian Nidan'),
      (2, 'Faixa Verde', '#2E7D32', 5, 8, 'aluno', '5º Kyu - Kata Heian Sandan'),
      (2, 'Faixa Roxa', '#7B1FA2', 6, 8, 'aluno', '4º Kyu - Kata Heian Yondan'),
      (2, 'Faixa Marrom', '#5D4037', 7, 12, 'instrutor', '3º-1º Kyu - Kata Heian Godan'),
      (2, 'Faixa Preta', '#000000', 8, 24, 'professor', '1º Dan - Shodan')
    `);

    // Graduações - Muay Thai (modalidade_id = 3)
    await connection.query(`
      INSERT INTO graduacoes (modalidade_id, nome_faixa, cor_faixa, ordem, tempo_minimo_meses, status_praticante, requisitos) VALUES
      (3, 'Braçal Branco', '#FFFFFF', 1, 0, 'aluno', 'Iniciante'),
      (3, 'Braçal Amarelo', '#FFD600', 2, 6, 'aluno', 'Técnicas básicas de soco e chute'),
      (3, 'Braçal Verde', '#2E7D32', 3, 8, 'aluno', 'Combinações e defesas'),
      (3, 'Braçal Azul', '#1565C0', 4, 12, 'aluno', 'Clinch e joelhadas'),
      (3, 'Braçal Vermelho', '#D32F2F', 5, 12, 'instrutor', 'Técnicas avançadas'),
      (3, 'Braçal Dourado', '#FFB300', 6, 24, 'professor', 'Mestre instrutor')
    `);
    console.log('✅ Graduações criadas');

    // 5. Locais de treino
    await connection.query(`
      INSERT INTO locais_treino (nome, endereco, bairro, cidade, estado, capacidade_maxima, telefone, responsavel) VALUES
      ('Sede Principal', 'Rua das Artes Marciais, 100', 'Centro', 'São Paulo', 'SP', 50, '(11) 3456-7890', 'Carlos Silva'),
      ('Filial Norte', 'Av. Brasil, 500', 'Santana', 'São Paulo', 'SP', 30, '(11) 2345-6789', 'Roberto Souza')
    `);
    console.log('✅ Locais de treino criados');

    // 6. Alunos
    await connection.query(`
      INSERT INTO alunos (nome, data_nascimento, sexo, cpf, email, celular, endereco, bairro, cidade, estado, cep, data_matricula, status) VALUES
      ('João Silva Santos', '1995-03-15', 'M', '123.456.789-00', 'joao@email.com', '(11) 99999-0001', 'Rua A, 10', 'Centro', 'São Paulo', 'SP', '01000-000', '2024-01-15', 'ativo'),
      ('Maria Oliveira', '1998-07-22', 'F', '234.567.890-11', 'maria.o@email.com', '(11) 99999-0002', 'Rua B, 20', 'Vila Mariana', 'São Paulo', 'SP', '04000-000', '2024-02-10', 'ativo'),
      ('Carlos Eduardo Souza', '2000-11-08', 'M', '345.678.901-22', 'carlos@email.com', '(11) 99999-0003', 'Rua C, 30', 'Pinheiros', 'São Paulo', 'SP', '05000-000', '2024-03-05', 'ativo'),
      ('Ana Paula Ferreira', '1992-01-30', 'F', '456.789.012-33', 'ana.paula@email.com', '(11) 99999-0004', 'Rua D, 40', 'Moema', 'São Paulo', 'SP', '04500-000', '2023-06-20', 'ativo'),
      ('Pedro Henrique Lima', '2005-05-12', 'M', '567.890.123-44', 'pedro@email.com', '(11) 99999-0005', 'Rua E, 50', 'Butantã', 'São Paulo', 'SP', '05500-000', '2024-01-10', 'ativo'),
      ('Fernanda Costa', '1988-09-18', 'F', '678.901.234-55', 'fernanda@email.com', '(11) 99999-0006', 'Rua F, 60', 'Santana', 'São Paulo', 'SP', '02000-000', '2023-08-15', 'ativo'),
      ('Lucas Mendes', '2010-04-25', 'M', '789.012.345-66', 'lucas.m@email.com', '(11) 99999-0007', 'Rua G, 70', 'Tatuapé', 'São Paulo', 'SP', '03000-000', '2024-04-01', 'ativo'),
      ('Juliana Ribeiro', '1996-12-03', 'F', '890.123.456-77', 'juliana@email.com', '(11) 99999-0008', 'Rua H, 80', 'Consolação', 'São Paulo', 'SP', '01300-000', '2023-11-20', 'inativo')
    `);

    // Responsável para o menor (Pedro Henrique, id=5 e Lucas Mendes, id=7)
    await connection.query(`
      UPDATE alunos SET responsavel_nome = 'Roberto Lima', responsavel_telefone = '(11) 98888-0005', responsavel_cpf = '111.222.333-44' WHERE id = 5
    `);
    await connection.query(`
      UPDATE alunos SET responsavel_nome = 'Claudia Mendes', responsavel_telefone = '(11) 98888-0007', responsavel_cpf = '222.333.444-55' WHERE id = 7
    `);
    console.log('✅ Alunos criados');

    // 7. Graduações dos alunos
    await connection.query(`
      INSERT INTO aluno_graduacao (aluno_id, graduacao_id, modalidade_id, data_graduacao, observacoes) VALUES
      (1, 3, 1, '2025-06-15', 'Aprovado com destaque no exame de faixa roxa'),
      (2, 2, 1, '2025-03-10', 'Boa evolução técnica'),
      (3, 1, 1, '2024-03-05', 'Início no Jiu-Jitsu'),
      (3, 2, 3, '2025-01-20', 'Braçal amarelo de Muay Thai'),
      (4, 4, 1, '2025-08-12', 'Faixa marrom - excelente desempenho'),
      (5, 1, 2, '2024-01-10', 'Início no Karatê'),
      (6, 3, 3, '2025-05-18', 'Braçal verde de Muay Thai'),
      (7, 2, 2, '2025-09-01', 'Faixa amarela de Karatê')
    `);
    console.log('✅ Graduações dos alunos criadas');

    // 8. Turmas
    await connection.query(`
      INSERT INTO turmas (nome, modalidade_id, local_treino_id, instrutor_id, dia_semana, horario_inicio, horario_fim, capacidade_maxima, idade_minima, idade_maxima, status) VALUES
      ('Jiu-Jitsu Adulto Manhã', 1, 1, NULL, '["segunda","quarta","sexta"]', '07:00', '08:30', 25, 16, NULL, 'ativa'),
      ('Jiu-Jitsu Adulto Noite', 1, 1, NULL, '["segunda","quarta","sexta"]', '19:00', '20:30', 30, 16, NULL, 'ativa'),
      ('Karatê Infantil', 2, 1, NULL, '["terca","quinta"]', '15:00', '16:00', 20, 6, 14, 'ativa'),
      ('Muay Thai', 3, 2, NULL, '["terca","quinta","sabado"]', '18:00', '19:30', 20, 14, NULL, 'ativa'),
      ('Judô Adulto', 4, 1, NULL, '["segunda","quarta"]', '20:30', '22:00', 25, 16, NULL, 'ativa')
    `);
    console.log('✅ Turmas criadas');

    // 9. Matricular alunos nas turmas
    await connection.query(`
      INSERT INTO turma_alunos (turma_id, aluno_id, data_matricula, status) VALUES
      (1, 1, '2024-01-15', 'ativo'), (1, 4, '2023-06-20', 'ativo'),
      (2, 2, '2024-02-10', 'ativo'), (2, 3, '2024-03-05', 'ativo'), (2, 6, '2023-08-15', 'ativo'),
      (3, 5, '2024-01-10', 'ativo'), (3, 7, '2024-04-01', 'ativo'),
      (4, 3, '2024-03-05', 'ativo'), (4, 6, '2023-08-15', 'ativo'),
      (5, 1, '2024-06-01', 'ativo')
    `);
    console.log('✅ Alunos matriculados nas turmas');

    // 10. Planos
    await connection.query(`
      INSERT INTO planos (nome, descricao, valor, periodicidade, modalidade_id, ativo) VALUES
      ('Mensal Básico', 'Acesso a uma modalidade', 150.00, 'mensal', NULL, TRUE),
      ('Mensal Completo', 'Acesso a todas as modalidades', 220.00, 'mensal', NULL, TRUE),
      ('Trimestral Básico', 'Acesso a uma modalidade - 3 meses', 400.00, 'trimestral', NULL, TRUE),
      ('Semestral Completo', 'Acesso total - 6 meses', 1100.00, 'semestral', NULL, TRUE),
      ('Anual VIP', 'Acesso total - 12 meses com desconto', 2000.00, 'anual', NULL, TRUE)
    `);
    console.log('✅ Planos criados');

    // 11. Assinaturas
    await connection.query(`
      INSERT INTO assinaturas (aluno_id, plano_id, data_inicio, data_fim, valor_negociado, desconto_percentual, status) VALUES
      (1, 2, '2025-01-01', '2025-12-31', 220.00, 0, 'ativa'),
      (2, 1, '2025-01-01', '2025-12-31', 150.00, 0, 'ativa'),
      (3, 2, '2025-01-01', '2025-06-30', 200.00, 9.09, 'ativa'),
      (4, 4, '2025-01-01', '2025-06-30', 1100.00, 0, 'ativa'),
      (5, 1, '2025-01-01', '2025-12-31', 130.00, 13.33, 'ativa'),
      (6, 2, '2025-01-01', '2025-12-31', 220.00, 0, 'ativa'),
      (7, 1, '2025-01-01', '2025-12-31', 120.00, 20.00, 'ativa')
    `);
    console.log('✅ Assinaturas criadas');

    // 12. Faturas (últimos meses)
    const meses = ['2025-01', '2025-02', '2025-03', '2025-04'];
    const alunosFatura = [
      { id: 1, valor: 220 }, { id: 2, valor: 150 }, { id: 3, valor: 200 },
      { id: 5, valor: 130 }, { id: 6, valor: 220 }, { id: 7, valor: 120 }
    ];

    for (const mes of meses) {
      for (const aluno of alunosFatura) {
        const venc = `${mes}-10`;
        const pago = mes < '2025-04';
        const atrasado = mes === '2025-03' && (aluno.id === 2 || aluno.id === 7);

        await connection.query(`
          INSERT INTO faturas (assinatura_id, aluno_id, valor, data_vencimento, data_pagamento, status, forma_pagamento) VALUES
          (?, ?, ?, ?, ?, ?, ?)
        `, [
          aluno.id,
          aluno.id,
          aluno.valor,
          venc,
          pago && !atrasado ? `${mes}-08` : null,
          atrasado ? 'atrasada' : (pago ? 'paga' : 'pendente'),
          pago && !atrasado ? 'pix' : null
        ]);
      }
    }
    console.log('✅ Faturas criadas');

    // 13. Contas a pagar
    await connection.query(`
      INSERT INTO contas_pagar (descricao, categoria, valor, data_vencimento, data_pagamento, status, forma_pagamento, fornecedor, recorrente) VALUES
      ('Aluguel Sede Principal - Janeiro', 'aluguel', 3500.00, '2025-01-05', '2025-01-04', 'paga', 'transferencia', 'Imobiliária XYZ', TRUE),
      ('Aluguel Sede Principal - Fevereiro', 'aluguel', 3500.00, '2025-02-05', '2025-02-04', 'paga', 'transferencia', 'Imobiliária XYZ', TRUE),
      ('Aluguel Sede Principal - Março', 'aluguel', 3500.00, '2025-03-05', '2025-03-04', 'paga', 'transferencia', 'Imobiliária XYZ', TRUE),
      ('Aluguel Sede Principal - Abril', 'aluguel', 3500.00, '2025-04-05', NULL, 'pendente', NULL, 'Imobiliária XYZ', TRUE),
      ('Conta de Luz - Janeiro', 'luz', 450.00, '2025-01-15', '2025-01-14', 'paga', 'pix', 'ENEL', TRUE),
      ('Conta de Luz - Fevereiro', 'luz', 480.00, '2025-02-15', '2025-02-14', 'paga', 'pix', 'ENEL', TRUE),
      ('Conta de Luz - Março', 'luz', 520.00, '2025-03-15', '2025-03-14', 'paga', 'pix', 'ENEL', TRUE),
      ('Conta de Água - Janeiro', 'agua', 180.00, '2025-01-20', '2025-01-19', 'paga', 'pix', 'SABESP', TRUE),
      ('Tatames novos', 'equipamento', 2800.00, '2025-02-28', '2025-02-25', 'paga', 'cartao_credito', 'Tatames Brasil', FALSE),
      ('Salário Instrutor Tanaka', 'salario', 4000.00, '2025-03-05', '2025-03-05', 'paga', 'transferencia', 'Sensei Tanaka', TRUE),
      ('Material de limpeza', 'material', 250.00, '2025-03-10', NULL, 'pendente', NULL, 'Loja Limpa', FALSE)
    `);
    console.log('✅ Contas a pagar criadas');

    // 14. Contas a receber
    await connection.query(`
      INSERT INTO contas_receber (descricao, categoria, valor, data_vencimento, data_recebimento, status, forma_pagamento, aluno_id) VALUES
      ('Taxa de matrícula - Carlos', 'matricula', 100.00, '2024-03-05', '2024-03-05', 'recebida', 'pix', 3),
      ('Venda de kimono', 'venda', 250.00, '2025-02-15', '2025-02-15', 'recebida', 'dinheiro', 1),
      ('Evento Seminário BJJ', 'evento', 80.00, '2025-03-20', NULL, 'pendente', NULL, NULL),
      ('Taxa de matrícula - Lucas', 'matricula', 100.00, '2024-04-01', '2024-04-01', 'recebida', 'pix', 7)
    `);
    console.log('✅ Contas a receber criadas');

    // 15. Algumas aulas registradas
    await connection.query(`
      INSERT INTO aulas (turma_id, data_aula, horario_inicio, horario_fim, conteudo_ensinado, observacoes, status) VALUES
      (1, '2025-04-07', '07:00', '08:30', 'Guard pass e defesa de guarda', 'Turma cheia, boa participação', 'realizada'),
      (1, '2025-04-09', '07:00', '08:30', 'Raspagens da guarda fechada', NULL, 'realizada'),
      (2, '2025-04-07', '19:00', '20:30', 'Triângulo e variações', 'Revisão de técnicas', 'realizada'),
      (3, '2025-04-08', '15:00', '16:00', 'Kata Heian Shodan', 'Preparação para exame', 'realizada'),
      (4, '2025-04-08', '18:00', '19:30', 'Low kick e defesas', NULL, 'realizada'),
      (1, '2025-04-11', '07:00', '08:30', NULL, NULL, 'agendada'),
      (2, '2025-04-11', '19:00', '20:30', NULL, NULL, 'agendada')
    `);
    console.log('✅ Aulas criadas');

    // 16. Frequência das aulas realizadas
    await connection.query(`
      INSERT INTO frequencia (aula_id, aluno_id, presente, justificativa) VALUES
      (1, 1, TRUE, NULL), (1, 4, TRUE, NULL),
      (2, 1, TRUE, NULL), (2, 4, FALSE, 'Consulta médica'),
      (3, 2, TRUE, NULL), (3, 3, TRUE, NULL), (3, 6, FALSE, 'Viagem'),
      (4, 5, TRUE, NULL), (4, 7, TRUE, NULL),
      (5, 3, TRUE, NULL), (5, 6, TRUE, NULL)
    `);
    console.log('✅ Frequências registradas');

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('📧 Login: admin@dojo.com');
    console.log('🔑 Senha: admin123\n');

  } catch (error) {
    console.error('\n❌ Erro durante o seed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
