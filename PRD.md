# PRD — Sistema de Gestão de Escola de Artes Marciais

## Visão Geral

Sistema web completo para substituir o iDojo, resolvendo suas principais deficiências de usabilidade. O foco principal do MVP é o módulo de chamada com QR Code — professores hoje selecionam aluno por aluno manualmente após cada aula. A solução permite que alunos façam auto check-in escaneando um QR Code fixo na sala, e o professor valida rapidamente num segundo momento.

O sistema é construído com isolamento multi-escola desde o início, começando com uso interno de uma escola e preparado para escalar como produto SaaS. Usuários: Administrador (acesso total), Professor (apenas suas turmas), Aluno (apenas check-in público via QR Code).

## Arquitetura

```
escola-artes-marciais/
├── backend/          Node.js + Express + MySQL + Sequelize + JWT (porta 5000)
├── frontend/         React 18 CRA + axios (porta 3000)
└── docker-compose.yml
```

**Entidades principais:**
```
Escola → Usuario, ArteMarcial, Sala, PlanoMensalidade, CriterioGraduacao
ArteMarcial → Faixa → CriterioGraduacao
Turma → HorarioTurma (grade semanal) → Aula (instâncias) → Chamada
Turma → MatriculaAluno → Usuario (aluno)
Usuario (aluno) → Mensalidade → Pagamento
Sala (qr_token único) → Aula (detectada por horário)
```

## User Stories

### US-01: Check-in via QR Code
Como aluno, quero escanear o QR Code da sala com meu celular e tocar no meu nome para registrar minha presença, para que não precise falar com o professor individualmente.

**Critérios de aceite:**
- Página pública abre sem login ao escanear o QR Code
- Exibe lista de alunos matriculados na turma ativa no momento
- Aluno toca no próprio nome e vê confirmação visual
- Check-in duplicado é ignorado (idempotente)
- Fora da janela de ±20 min da aula → mensagem "Nenhuma aula em andamento"

### US-02: Validação de chamada pelo professor
Como professor, quero ver a lista de quem fez check-in pelo QR Code e adicionar quem esqueceu de escanear, para que a chamada esteja completa e precisa.

**Critérios de aceite:**
- Tela protegida por login com role professor ou admin
- Lista distingue origem: qrcode vs professor
- Professor pode adicionar alunos não presentes na lista de check-in
- Professor pode fechar a chamada (status da aula → fechada)

### US-03: Dashboard de indicadores
Como administrador, quero ver num painel único: frequência, elegíveis para graduação, financeiro, aniversariantes e alertas de ausência, para que eu possa agir proativamente.

**Critérios de aceite:**
- Semáforo de ausência: 🟡 3 aulas consecutivas, 🟠 2 semanas seguidas, 🔴 % faltas ≥ threshold da escola
- Alunos elegíveis para graduação listados por turma
- Aniversariantes da semana/mês em destaque
- Quantitativo de alunos por faixa

### US-04: Configuração de critérios de graduação
Como administrador, quero definir quantas aulas mínimas cada faixa requer por arte marcial, para que o sistema calcule automaticamente quem está elegível.

**Critérios de aceite:**
- CRUD de critérios por escola + arte marcial + faixa
- Campo min_aulas configurável
- Dashboard reflete os critérios configurados

### US-05: Gestão financeira
Como administrador, quero criar planos de mensalidade, associar alunos, registrar pagamentos e aplicar descontos, para que eu tenha controle financeiro da escola.

**Critérios de aceite:**
- CRUD de planos de mensalidade
- Associação de aluno a plano
- Registro de pagamento com forma de pagamento
- Aplicação de desconto por mensalidade
- Status: pendente / pago / cancelado
- Indicador de inadimplência no dashboard

### US-06: Cadastros base
Como administrador, quero cadastrar turmas, horários, salas e professores para que o sistema possa detectar aulas automaticamente.

**Critérios de aceite:**
- CRUD completo de: Turma, HorarioTurma, Sala, Usuario
- Sala gera QR Code imprimível automaticamente
- HorarioTurma define dia_semana + hora_inicio + hora_fim

## Regras de Negócio

- SE `now >= aula.hora_inicio - 20min` E `now <= aula.hora_fim + 20min` ENTÃO check-in via QR é válido
- SE check-in duplicado (mesma aula + mesmo aluno) ENTÃO ignorar silenciosamente
- SE nenhuma aula ativa encontrada para a sala ENTÃO retornar `aula_ativa: false`
- SE `chamadas_confirmadas_desde_ultima_graduacao >= criterio.min_aulas` ENTÃO `elegivel = true`
- SE aluno faltou 3 aulas consecutivas na mesma turma ENTÃO status = AMARELO
- SE aluno não apareceu por 2 semanas corridas ENTÃO status = LARANJA
- SE `% faltas no mês >= escola.threshold_falta_vermelho` (default 40%) ENTÃO status = VERMELHO
- SE role = professor ENTÃO acesso restrito às próprias turmas (filtro por escola_id + professor_id)
- SE role = aluno ENTÃO acesso apenas ao endpoint público de check-in (sem JWT)
- NUNCA compartilhar dados entre escola_id diferentes

## Tasks

### T-01: Setup e infraestrutura
- Iniciar containers Docker Compose (mysql + backend + frontend)
- Verificar `GET /api/health` retorna 200
- **Repo:** backend
- **US relacionada:** todas

### T-02: Auth — login e middleware JWT
- Implementar `POST /api/auth/login` e `GET /api/auth/me`
- Testar login com usuário seed
- Criar script de seed (admin@escola.com / 123456)
- **Repo:** backend
- **US relacionada:** US-02

### T-03: Cadastros base — backend
- CRUD completo: Escola, Usuario, ArteMarcial, Faixa, CriterioGraduacao
- CRUD completo: Turma, HorarioTurma, Sala
- Endpoint: `GET /api/salas/:id/qrcode` — retorna QR Code em base64
- **Repo:** backend
- **US relacionada:** US-04, US-06

### T-04: Engine de aulas — criação automática
- Service que verifica HorarioTurma e cria Aula para o dia atual se ainda não existir
- Pode ser chamado via endpoint ou job agendado simples
- **Repo:** backend
- **US relacionada:** US-01

### T-05: Check-in — backend (prioridade #1)
- `GET /api/checkin/:qr_token` — retorna aula ativa + lista de alunos
- `POST /api/checkin/:qr_token` — registra check-in (origem: qrcode)
- Validação da janela ±20 min
- **Repo:** backend
- **US relacionada:** US-01

### T-06: Chamada — validação pelo professor
- `GET /api/aulas/:id/chamada` — lista chamada da aula
- `POST /api/aulas/:id/chamada` — professor adiciona/valida presença
- `PUT /api/aulas/:id/fechar` — fecha chamada
- **Repo:** backend
- **US relacionada:** US-02

### T-07: Dashboard — endpoints de indicadores
- `GET /api/dashboard/frequencia` — % presença por aluno/turma
- `GET /api/dashboard/graduacao` — elegíveis por turma
- `GET /api/dashboard/financeiro` — receita, inadimplência
- `GET /api/dashboard/aniversariantes` — semana e mês
- `GET /api/dashboard/alertas-ausencia` — semáforo AMARELO/LARANJA/VERMELHO
- **Repo:** backend
- **US relacionada:** US-03

### T-08: Financeiro — backend
- CRUD: PlanoMensalidade, Mensalidade, Pagamento
- Lógica de desconto e status
- **Repo:** backend
- **US relacionada:** US-05

### T-09: Frontend — layout e login
- Login funcional integrado ao `POST /api/auth/login`
- Sidebar com navegação entre módulos
- Token JWT persistido no localStorage
- **Repo:** frontend
- **US relacionada:** US-02

### T-10: Frontend — página pública de check-in
- Rota `/checkin/:qr_token` acessível sem login
- Lista alunos e registra check-in ao tocar o nome
- Feedback visual de confirmação
- **Repo:** frontend
- **US relacionada:** US-01

### T-11: Frontend — tela de chamada (professor)
- Lista aulas do dia por turma do professor
- Abre chamada: vê check-ins do QR Code + pode adicionar/remover
- Botão fechar chamada
- **Repo:** frontend
- **US relacionada:** US-02

### T-12: Frontend — dashboard
- Cards: alunos ativos, receita do mês, inadimplentes
- Tabela de semáforo de ausência com cores
- Tabela de elegíveis para graduação
- Lista de aniversariantes
- **Repo:** frontend
- **US relacionada:** US-03

### T-13: Frontend — cadastros
- Telas CRUD: Turmas, Horários, Salas, Alunos, Professores
- Gerador de QR Code para impressão (por sala)
- **Repo:** frontend
- **US relacionada:** US-06

### T-14: Frontend — financeiro
- Telas: Planos, Mensalidades por aluno, Registro de pagamento
- Filtro por status (pendente/pago/cancelado)
- **Repo:** frontend
- **US relacionada:** US-05

### T-15: Frontend — configurações
- Critérios de graduação por arte marcial + faixa
- Threshold de alerta vermelho
- **Repo:** frontend
- **US relacionada:** US-04

## O que já existe

- Infraestrutura completa em `~/competicao-manager/` (mesmo stack) — usar como referência de padrões
- Scripts de geração em `~/competicao-manager/scripts/` (criar-recurso.sh, criar-pagina-frontend.sh)
- Middleware de auth em `backend/src/middleware/` já implementado

## Fora de Escopo (MVP)

- Integração com gateway de pagamento (PIX, boleto, cartão)
- Aplicativo mobile nativo
- Portal do aluno com login
- Comunicação automática (WhatsApp, email)
- Gestão de campeonatos/torneios

## Referências

- Handoff: `~/escola-manager-discovery/handoffs/2026-05-19-escola-artes-marciais/handoff.md`
- Referência de stack: `~/competicao-manager/`
- Tipo: Produto Novo | Tamanho: G
