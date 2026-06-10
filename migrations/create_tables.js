// Script de migração - Cria todas as tabelas do sistema DojoManager
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  // Conectar sem especificar database para poder criá-lo
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    multipleStatements: true
  });

  console.log('🔄 Iniciando migração do banco de dados...\n');

  try {
    // Criar database se não existir
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'dojo_manager'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${process.env.DB_NAME || 'dojo_manager'}\``);
    console.log('✅ Database criado/selecionado');

    // Tabela academia
    await connection.query(`
      CREATE TABLE IF NOT EXISTS academia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(200) NOT NULL DEFAULT 'Minha Academia',
        cnpj VARCHAR(20),
        endereco VARCHAR(300),
        telefone VARCHAR(20),
        email VARCHAR(150),
        logo_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela academia criada');

    // Tabela usuarios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'secretaria', 'instrutor') NOT NULL DEFAULT 'secretaria',
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela usuarios criada');

    // Tabela alunos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS alunos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        data_nascimento DATE,
        sexo ENUM('M', 'F', 'Outro'),
        cpf VARCHAR(14) UNIQUE,
        rg VARCHAR(20),
        email VARCHAR(150),
        telefone VARCHAR(20),
        celular VARCHAR(20),
        endereco VARCHAR(300),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(2),
        cep VARCHAR(10),
        foto_path VARCHAR(500),
        data_matricula DATE,
        status ENUM('ativo', 'inativo', 'trancado') DEFAULT 'ativo',
        observacoes TEXT,
        responsavel_nome VARCHAR(200),
        responsavel_telefone VARCHAR(20),
        responsavel_cpf VARCHAR(14),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela alunos criada');

    // Tabela modalidades
    await connection.query(`
      CREATE TABLE IF NOT EXISTS modalidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela modalidades criada');

    // Tabela graduacoes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS graduacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        modalidade_id INT NOT NULL,
        nome_faixa VARCHAR(100) NOT NULL,
        cor_faixa VARCHAR(7) DEFAULT '#FFFFFF',
        ordem INT NOT NULL DEFAULT 0,
        tempo_minimo_meses INT DEFAULT 0,
        status_praticante ENUM('aluno', 'instrutor', 'professor', 'mestre', 'grao_mestre') DEFAULT 'aluno',
        requisitos TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela graduacoes criada');

    // Tabela aluno_graduacao
    await connection.query(`
      CREATE TABLE IF NOT EXISTS aluno_graduacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aluno_id INT NOT NULL,
        graduacao_id INT NOT NULL,
        modalidade_id INT NOT NULL,
        data_graduacao DATE,
        observacoes TEXT,
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        FOREIGN KEY (graduacao_id) REFERENCES graduacoes(id) ON DELETE CASCADE,
        FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela aluno_graduacao criada');

    // Tabela locais_treino
    await connection.query(`
      CREATE TABLE IF NOT EXISTS locais_treino (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        endereco VARCHAR(300),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(2),
        capacidade_maxima INT DEFAULT 0,
        telefone VARCHAR(20),
        responsavel VARCHAR(200),
        observacoes TEXT,
        ativo BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela locais_treino criada');

    // Tabela turmas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS turmas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        modalidade_id INT NOT NULL,
        local_treino_id INT,
        instrutor_id INT,
        dia_semana JSON,
        horario_inicio TIME,
        horario_fim TIME,
        capacidade_maxima INT DEFAULT 30,
        idade_minima INT,
        idade_maxima INT,
        graduacao_minima_id INT,
        graduacao_maxima_id INT,
        status ENUM('ativa', 'inativa') DEFAULT 'ativa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE CASCADE,
        FOREIGN KEY (local_treino_id) REFERENCES locais_treino(id) ON DELETE SET NULL,
        FOREIGN KEY (graduacao_minima_id) REFERENCES graduacoes(id) ON DELETE SET NULL,
        FOREIGN KEY (graduacao_maxima_id) REFERENCES graduacoes(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela turmas criada');

    // Tabela turma_alunos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS turma_alunos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        turma_id INT NOT NULL,
        aluno_id INT NOT NULL,
        data_matricula DATE DEFAULT (CURRENT_DATE),
        status ENUM('ativo', 'inativo') DEFAULT 'ativo',
        FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        UNIQUE KEY unique_turma_aluno (turma_id, aluno_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela turma_alunos criada');

    // Tabela aulas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS aulas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        turma_id INT NOT NULL,
        data_aula DATE NOT NULL,
        horario_inicio TIME,
        horario_fim TIME,
        conteudo_ensinado TEXT,
        observacoes TEXT,
        instrutor_id INT,
        status ENUM('realizada', 'cancelada', 'agendada') DEFAULT 'agendada',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela aulas criada');

    // Tabela frequencia
    await connection.query(`
      CREATE TABLE IF NOT EXISTS frequencia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aula_id INT NOT NULL,
        aluno_id INT NOT NULL,
        presente BOOLEAN DEFAULT FALSE,
        justificativa TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (aula_id) REFERENCES aulas(id) ON DELETE CASCADE,
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        UNIQUE KEY unique_freq (aula_id, aluno_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela frequencia criada');

    // Tabela planos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS planos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        descricao TEXT,
        valor DECIMAL(10,2) NOT NULL,
        periodicidade ENUM('mensal', 'trimestral', 'semestral', 'anual') DEFAULT 'mensal',
        modalidade_id INT,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela planos criada');

    // Tabela assinaturas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS assinaturas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aluno_id INT NOT NULL,
        plano_id INT NOT NULL,
        data_inicio DATE NOT NULL,
        data_fim DATE,
        valor_negociado DECIMAL(10,2),
        desconto_percentual DECIMAL(5,2) DEFAULT 0,
        status ENUM('ativa', 'cancelada', 'suspensa') DEFAULT 'ativa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela assinaturas criada');

    // Tabela faturas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS faturas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assinatura_id INT,
        aluno_id INT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_vencimento DATE NOT NULL,
        data_pagamento DATE,
        status ENUM('pendente', 'paga', 'atrasada', 'cancelada') DEFAULT 'pendente',
        forma_pagamento ENUM('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia'),
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE SET NULL,
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela faturas criada');

    // Tabela contas_pagar
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contas_pagar (
        id INT AUTO_INCREMENT PRIMARY KEY,
        descricao VARCHAR(300) NOT NULL,
        categoria ENUM('aluguel', 'agua', 'luz', 'material', 'equipamento', 'salario', 'outros') DEFAULT 'outros',
        valor DECIMAL(10,2) NOT NULL,
        data_vencimento DATE NOT NULL,
        data_pagamento DATE,
        status ENUM('pendente', 'paga', 'atrasada', 'cancelada') DEFAULT 'pendente',
        forma_pagamento ENUM('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia'),
        fornecedor VARCHAR(200),
        observacoes TEXT,
        recorrente BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela contas_pagar criada');

    // Tabela contas_receber
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contas_receber (
        id INT AUTO_INCREMENT PRIMARY KEY,
        descricao VARCHAR(300) NOT NULL,
        categoria ENUM('mensalidade', 'matricula', 'evento', 'venda', 'outros') DEFAULT 'outros',
        valor DECIMAL(10,2) NOT NULL,
        data_vencimento DATE NOT NULL,
        data_recebimento DATE,
        status ENUM('pendente', 'recebida', 'atrasada', 'cancelada') DEFAULT 'pendente',
        forma_pagamento ENUM('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia'),
        aluno_id INT,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela contas_receber criada');

    // Tabela exames_faixa
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exames_faixa (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        data_exame DATE NOT NULL,
        local_treino_id INT,
        modalidade_id INT NOT NULL,
        avaliador VARCHAR(200),
        observacoes TEXT,
        status ENUM('agendado', 'realizado', 'cancelado') DEFAULT 'agendado',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (local_treino_id) REFERENCES locais_treino(id) ON DELETE SET NULL,
        FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela exames_faixa criada');

    // Tabela exame_faixa_candidatos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exame_faixa_candidatos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exame_faixa_id INT NOT NULL,
        aluno_id INT NOT NULL,
        graduacao_atual_id INT,
        graduacao_pretendida_id INT,
        resultado ENUM('aprovado', 'reprovado', 'pendente') DEFAULT 'pendente',
        nota DECIMAL(4,2),
        observacoes TEXT,
        FOREIGN KEY (exame_faixa_id) REFERENCES exames_faixa(id) ON DELETE CASCADE,
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        FOREIGN KEY (graduacao_atual_id) REFERENCES graduacoes(id) ON DELETE SET NULL,
        FOREIGN KEY (graduacao_pretendida_id) REFERENCES graduacoes(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela exame_faixa_candidatos criada');

    // Tabela campeonatos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS campeonatos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        data_inicio DATE,
        data_fim DATE,
        local VARCHAR(300),
        cidade VARCHAR(100),
        estado VARCHAR(2),
        organizacao VARCHAR(200),
        observacoes TEXT,
        status ENUM('inscricoes_abertas', 'em_andamento', 'finalizado', 'cancelado') DEFAULT 'inscricoes_abertas',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela campeonatos criada');

    // Tabela campeonato_participantes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS campeonato_participantes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campeonato_id INT NOT NULL,
        aluno_id INT NOT NULL,
        categoria VARCHAR(100),
        peso VARCHAR(50),
        modalidade_id INT,
        resultado TEXT,
        colocacao INT,
        medalha ENUM('ouro', 'prata', 'bronze', 'nenhuma') DEFAULT 'nenhuma',
        observacoes TEXT,
        FOREIGN KEY (campeonato_id) REFERENCES campeonatos(id) ON DELETE CASCADE,
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela campeonato_participantes criada');

    console.log('\n🎉 Todas as tabelas foram criadas com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
