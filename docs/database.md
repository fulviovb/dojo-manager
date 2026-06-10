# Database Schema — DojoManager

Banco de dados MySQL (`dojo_manager`), charset `utf8mb4`.

## Diagrama de Relacionamentos

```
academia
usuarios

alunos ──────────────── aluno_graduacao ──── graduacoes ──── modalidades
  │                                                │
  ├──── turma_alunos ──── turmas ────────────────────────── locais_treino
  │           │               │
  │         aulas ──────── frequencia
  │
  ├──── assinaturas ──── planos
  │           │
  │         faturas
  │
  ├──── contas_receber
  │
  ├──── exame_faixa_candidatos ──── exames_faixa ──── locais_treino
  │
  └──── campeonato_participantes ──── campeonatos
```

---

## Tabelas

### `academia`
Dados da academia (configurações globais). Sempre terá exatamente 1 registro.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| nome | VARCHAR(200) | Nome da academia |
| cnpj | VARCHAR(20) | CNPJ |
| endereco | VARCHAR(300) | Endereço completo |
| telefone | VARCHAR(20) | Telefone |
| email | VARCHAR(150) | E-mail de contato |
| logo_path | VARCHAR(500) | Caminho da logo (public/uploads) |
| created_at | TIMESTAMP | — |
| updated_at | TIMESTAMP | Atualizado automaticamente |

---

### `usuarios`
Usuários do sistema com autenticação por e-mail e senha.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| nome | VARCHAR(200) | Nome completo |
| email | VARCHAR(150) UNIQUE | Login |
| senha_hash | VARCHAR(255) | bcrypt hash |
| role | ENUM | `admin` / `secretaria` / `instrutor` |
| ativo | BOOLEAN | Habilita/desabilita acesso |
| created_at | TIMESTAMP | — |

---

### `alunos`
Cadastro completo de alunos.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| nome | VARCHAR(200) | Nome completo |
| data_nascimento | DATE | Data de nascimento |
| sexo | ENUM | `M` / `F` / `Outro` |
| cpf | VARCHAR(14) UNIQUE | CPF formatado |
| rg | VARCHAR(20) | RG |
| email | VARCHAR(150) | E-mail |
| telefone / celular | VARCHAR(20) | Contatos |
| endereco / bairro / cidade / estado / cep | — | Endereço |
| foto_path | VARCHAR(500) | Foto (public/uploads) |
| data_matricula | DATE | Data de ingresso |
| status | ENUM | `ativo` / `inativo` / `trancado` |
| observacoes | TEXT | Notas livres |
| responsavel_nome / telefone / cpf | — | Responsável (menores) |

---

### `modalidades`
Artes marciais/modalidades oferecidas pela academia.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| nome | VARCHAR(100) | Ex: Jiu-Jitsu, Karatê |
| descricao | TEXT | Descrição da modalidade |
| ativo | BOOLEAN | Visível no sistema |

---

### `graduacoes`
Faixas/graduações de cada modalidade em ordem crescente.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| modalidade_id | FK → modalidades | — |
| nome_faixa | VARCHAR(100) | Ex: Faixa Azul |
| cor_faixa | VARCHAR(7) | Hex color (#1565C0) |
| ordem | INT | Sequência crescente |
| tempo_minimo_meses | INT | Tempo mínimo para promoção |
| status_praticante | ENUM | `aluno` / `instrutor` / `professor` / `mestre` / `grao_mestre` |
| requisitos | TEXT | Critérios de aprovação |
| ativo | BOOLEAN | — |

---

### `aluno_graduacao`
Histórico de graduações conquistadas por cada aluno.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| aluno_id | FK → alunos | — |
| graduacao_id | FK → graduacoes | Faixa conquistada |
| modalidade_id | FK → modalidades | — |
| data_graduacao | DATE | Data do exame |
| observacoes | TEXT | — |

---

### `locais_treino`
Locais/filiais onde ocorrem os treinos.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| nome | VARCHAR(200) | Ex: Sede Principal |
| endereco / bairro / cidade / estado | — | Endereço |
| capacidade_maxima | INT | Capacidade de alunos |
| telefone | VARCHAR(20) | — |
| responsavel | VARCHAR(200) | Nome do responsável |
| observacoes | TEXT | — |
| ativo | BOOLEAN | — |

---

### `turmas`
Turmas regulares de cada modalidade.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| nome | VARCHAR(200) | Ex: Jiu-Jitsu Adulto Noite |
| modalidade_id | FK → modalidades | — |
| local_treino_id | FK → locais_treino | — |
| instrutor_id | FK → usuarios | Instrutor responsável |
| dia_semana | JSON | Array: `["segunda","quarta","sexta"]` |
| horario_inicio / horario_fim | TIME | Horário da aula |
| capacidade_maxima | INT | Vagas disponíveis |
| idade_minima / idade_maxima | INT | Faixa etária (opcional) |
| graduacao_minima_id / graduacao_maxima_id | FK → graduacoes | Filtro por faixa |
| status | ENUM | `ativa` / `inativa` |

---

### `turma_alunos`
Matrícula de alunos em turmas (N:M com dados extras).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| turma_id | FK → turmas | — |
| aluno_id | FK → alunos | — |
| data_matricula | DATE | Data de ingresso na turma |
| status | ENUM | `ativo` / `inativo` |

Constraint única: `(turma_id, aluno_id)`.

---

### `aulas`
Registros de aulas agendadas ou realizadas.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| turma_id | FK → turmas | — |
| data_aula | DATE | Data da aula |
| horario_inicio / horario_fim | TIME | — |
| conteudo_ensinado | TEXT | O que foi trabalhado |
| observacoes | TEXT | — |
| instrutor_id | FK → usuarios | Pode ser diferente do padrão da turma |
| status | ENUM | `agendada` / `realizada` / `cancelada` |

---

### `frequencia`
Presença de cada aluno por aula.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| aula_id | FK → aulas | — |
| aluno_id | FK → alunos | — |
| presente | BOOLEAN | — |
| justificativa | TEXT | Motivo da falta |

Constraint única: `(aula_id, aluno_id)`.

---

### `planos`
Planos de mensalidade disponíveis.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| nome | VARCHAR(200) | Ex: Mensal Completo |
| descricao | TEXT | — |
| valor | DECIMAL(10,2) | Valor base |
| periodicidade | ENUM | `mensal` / `trimestral` / `semestral` / `anual` |
| modalidade_id | FK → modalidades | NULL = todas as modalidades |
| ativo | BOOLEAN | — |

---

### `assinaturas`
Assinatura ativa de um aluno em um plano.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| aluno_id | FK → alunos | — |
| plano_id | FK → planos | — |
| data_inicio / data_fim | DATE | Vigência |
| valor_negociado | DECIMAL(10,2) | Valor real cobrado |
| desconto_percentual | DECIMAL(5,2) | % de desconto aplicado |
| status | ENUM | `ativa` / `cancelada` / `suspensa` |

---

### `faturas`
Cobranças geradas por assinatura.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| assinatura_id | FK → assinaturas | — |
| aluno_id | FK → alunos | Desnormalizado para facilitar queries |
| valor | DECIMAL(10,2) | — |
| data_vencimento | DATE | — |
| data_pagamento | DATE | NULL = não pago |
| status | ENUM | `pendente` / `paga` / `atrasada` / `cancelada` |
| forma_pagamento | ENUM | `dinheiro` / `pix` / `cartao_credito` / `cartao_debito` / `transferencia` |
| observacoes | TEXT | — |

---

### `contas_pagar`
Despesas da academia (aluguel, luz, salários, etc).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| descricao | VARCHAR(300) | Descrição da despesa |
| categoria | ENUM | `aluguel` / `agua` / `luz` / `material` / `equipamento` / `salario` / `outros` |
| valor | DECIMAL(10,2) | — |
| data_vencimento | DATE | — |
| data_pagamento | DATE | NULL = não pago |
| status | ENUM | `pendente` / `paga` / `atrasada` / `cancelada` |
| forma_pagamento | ENUM | — |
| fornecedor | VARCHAR(200) | — |
| observacoes | TEXT | — |
| recorrente | BOOLEAN | Indica despesa fixa mensal |

---

### `contas_receber`
Receitas avulsas (matrículas, vendas, eventos).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| descricao | VARCHAR(300) | — |
| categoria | ENUM | `mensalidade` / `matricula` / `evento` / `venda` / `outros` |
| valor | DECIMAL(10,2) | — |
| data_vencimento | DATE | — |
| data_recebimento | DATE | NULL = não recebido |
| status | ENUM | `pendente` / `recebida` / `atrasada` / `cancelada` |
| forma_pagamento | ENUM | — |
| aluno_id | FK → alunos | NULL = não vinculado a aluno |
| observacoes | TEXT | — |

---

### `exames_faixa`
Exames de graduação agendados.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| nome | VARCHAR(200) | Ex: Exame Faixa Azul BJJ - Jun/2025 |
| data_exame | DATE | — |
| local_treino_id | FK → locais_treino | — |
| modalidade_id | FK → modalidades | — |
| avaliador | VARCHAR(200) | Nome do avaliador externo |
| observacoes | TEXT | — |
| status | ENUM | `agendado` / `realizado` / `cancelado` |

---

### `exame_faixa_candidatos`
Candidatos inscritos em um exame de faixa.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| exame_faixa_id | FK → exames_faixa | — |
| aluno_id | FK → alunos | — |
| graduacao_atual_id | FK → graduacoes | Faixa atual do aluno |
| graduacao_pretendida_id | FK → graduacoes | Faixa que está disputando |
| resultado | ENUM | `pendente` / `aprovado` / `reprovado` |
| nota | DECIMAL(4,2) | Nota (0–10) |
| observacoes | TEXT | — |

---

### `campeonatos`
Competições externas.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| nome | VARCHAR(200) | Nome do campeonato |
| data_inicio / data_fim | DATE | — |
| local / cidade / estado | — | Localização |
| organizacao | VARCHAR(200) | Entidade organizadora |
| observacoes | TEXT | — |
| status | ENUM | `inscricoes_abertas` / `em_andamento` / `finalizado` / `cancelado` |

---

### `campeonato_participantes`
Inscrições e resultados dos alunos nos campeonatos.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INT PK | — |
| campeonato_id | FK → campeonatos | — |
| aluno_id | FK → alunos | — |
| categoria | VARCHAR(100) | Categoria da competição |
| peso | VARCHAR(50) | Categoria de peso |
| modalidade_id | FK → modalidades | — |
| resultado | TEXT | Descrição do resultado |
| colocacao | INT | Posição final (1, 2, 3...) |
| medalha | ENUM | `ouro` / `prata` / `bronze` / `nenhuma` |
| observacoes | TEXT | — |
