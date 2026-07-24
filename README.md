# Escola de Artes Marciais — Sistema de Gestão

Sistema de gestão para escolas de artes marciais, substituindo o iDojo. A prioridade
do produto é a **chamada por QR Code**: o aluno faz auto check-in ao escanear o QR
Code fixado na sala, e o professor valida/fecha a chamada depois. O sistema é
multi-escola, com isolamento total de dados por `escola_id`.

## Stack

| Camada    | Tecnologia                                      |
|-----------|--------------------------------------------------|
| Backend   | Node.js + Express + Sequelize (ORM) + JWT        |
| Frontend  | React 18 (Create React App) + axios              |
| Banco     | MySQL 8                                          |
| Proxy     | Nginx (alias `/escola-am`, ver `nginx.conf`)      |
| Ambiente  | Docker Compose                                    |

## Estrutura do repositório

```
escola-artes-marciais/
├── backend/                  # API REST (Node/Express/Sequelize)
│   ├── src/
│   │   ├── app.js            # montagem das rotas + middlewares globais
│   │   ├── server.js         # bootstrap (conexão DB + listen)
│   │   ├── config/           # configuração do Sequelize/DB
│   │   ├── models/           # entidades Sequelize + associações (models/index.js)
│   │   ├── controllers/      # regras de negócio por recurso
│   │   ├── routes/           # definição de rotas Express por recurso
│   │   └── middleware/       # autenticação (JWT) e autorização (roles)
│   └── Dockerfile
├── frontend/                  # SPA React (CRA)
│   └── src/
│       ├── App.js            # layout, sidebar, roteamento simples por estado
│       └── pages/            # uma página por tela (Dashboard, Turmas, Chamadas...)
├── docker-compose.yml         # orquestra mysql + backend + frontend + nginx
├── nginx.conf                 # proxy reverso (alias /escola-am, /api, /ws)
├── CLAUDE.md                  # instruções e boundaries para agentes de IA
├── PRD.md                     # requisitos, user stories (US-01..US-06) e tarefas (T-01..T-15)
└── Progress.txt                # tracker de progresso das tarefas do PRD
```

## Como rodar

Pré-requisito: Docker + Docker Compose.

```bash
docker compose up              # sobe mysql + backend + frontend + nginx
docker compose up mysql        # só o banco
docker compose ps               # status dos serviços
docker compose logs -f backend  # logs do backend
docker compose exec backend sh  # shell no container do backend
```

Verificar se subiu corretamente:

```bash
curl http://localhost:5000/api/health
# {"status":"✅ Servidor rodando"}
```

Verificar se os models Sequelize carregam sem erro:

```bash
docker compose exec backend node -e "require('./src/models/index')"
```

Login de desenvolvimento (seed): `admin@escola.com` / `123456`.

### Mapa de portas

| Serviço  | Porta local | Observação                              |
|----------|-------------|------------------------------------------|
| mysql    | 3307        | mapeada para não colidir com MySQL local |
| backend  | 5000        | API REST                                 |
| frontend | 3000        | dev server do CRA                        |
| nginx    | 8080        | proxy reverso, alias `/escola-am/`        |

### Variáveis de ambiente (backend/.env)

Ver `backend/.env.example`. Principais:

| Variável         | Descrição                                    |
|------------------|-----------------------------------------------|
| `PORT`           | porta do Express (padrão 5000)                |
| `DB_HOST/PORT/NAME/USER/PASSWORD` | conexão MySQL (dentro do compose, host é `mysql`) |
| `JWT_SECRET`     | chave de assinatura do token JWT              |
| `JWT_EXPIRES_IN` | validade do token (padrão `7d`)               |

O frontend lê `REACT_APP_API_URL` (padrão `http://localhost:5000/api`), definida no
`docker-compose.yml`.

## Autenticação e papéis (roles)

Login: `POST /api/auth/login` com `{ email, senha }` → retorna `{ token, usuario }`.
O JWT carrega `{ id, role, escola_id }` e deve ser enviado como
`Authorization: Bearer <token>` nas rotas autenticadas.

| Role        | Acesso                                                                 |
|-------------|--------------------------------------------------------------------------|
| `admin`     | acesso total dentro da própria escola (`escola_id`)                     |
| `professor` | lê/escreve apenas **turmas onde é `professor_id`** (e aulas/chamadas dessas turmas) |
| `aluno`     | nenhum login — usa apenas o endpoint público `/api/checkin/:qr_token`   |

A autorização por dono de turma é verificada com o helper `ehDonoDaTurma` em
`backend/src/middleware/autorizacao.js`, usado em `turmasController`,
`aulasController` e `chamadasController`: admin sempre passa; professor só se
`turma.professor_id === usuario.id`.

Todo dado é isolado por `escola_id` — nenhuma query deve vazar dados entre escolas
diferentes (ver boundaries em `CLAUDE.md`).

## Modelo de dados

Entidades principais (Sequelize, `backend/src/models/`) e como se relacionam:

```
Escola 1―* Usuario (role: admin | professor | aluno)
Escola 1―* ArteMarcial 1―* Faixa
Escola 1―* Sala
Escola 1―* PlanoMensalidade
Escola 1―* CriterioGraduacao (por ArteMarcial + Faixa)

Turma  *―1 Escola, *―1 ArteMarcial, *―1 Usuario (Professor)
Turma  1―* HorarioTurma (dia_semana, hora_inicio, hora_fim, Sala)
Turma  1―* MatriculaAluno *―1 Usuario (Aluno)
Turma  1―* Aula (gerada a partir do HorarioTurma do dia)

Aula   *―1 Turma, *―1 Sala
Aula   1―* Chamada *―1 Usuario (Aluno)

MatriculaAluno → graduacao_atual_faixa_id, aulas_desde_graduacao (contador p/ graduação)
GraduacaoAluno → histórico de faixas por aluno + arte marcial
Ocorrencia     → anotações do professor sobre um aluno

PlanoMensalidade 1―* Mensalidade *―1 Usuario (Aluno)
Mensalidade 1―* Pagamento
```

## Regras de negócio críticas

### Engine de aulas (geração automática)

Não há cron: `gerarAulasPorData(data)` (`backend/src/controllers/aulasController.js`)
roda **sob demanda**, disparada:
- a cada `GET`/`POST` em `/api/checkin/:qr_token` (garante que a Aula do dia existe
  antes de buscar a aula ativa); ou
- manualmente via `POST /api/aulas/gerar-hoje` (admin, aceita `?data=YYYY-MM-DD`).

Ela busca todo `HorarioTurma` cujo `dia_semana` bate com a data pedida e faz
`Aula.findOrCreate` por `turma_id + sala_id + data`.

### Check-in por QR Code

- QR Code = `qr_token` da **Sala**. `GET/POST /api/checkin/:qr_token` são as únicas
  rotas públicas (sem JWT) do sistema.
- A aula é considerada "ativa" numa janela de **±20 minutos** ao redor de
  `hora_inicio`/`hora_fim`.
- Check-in duplicado é idempotente: `Chamada.findOrCreate({ aula_id, aluno_id })` —
  repetir o check-in não cria registro novo (resposta traz `novo: false`).

### Semáforo de ausência

- 🟡 **Amarelo**: 3 aulas consecutivas sem presença
- 🟠 **Laranja**: 2 semanas corridas sem presença
- 🔴 **Vermelho**: `% faltas >= Escola.threshold_falta_vermelho` (padrão 40%)

### Graduação

Aluno é elegível quando `MatriculaAluno.aulas_desde_graduacao >=
CriterioGraduacao.min_aulas` para a combinação escola + arte marcial + faixa atual.
O contador é incrementado em `POST /api/chamadas/fechar/:aula_id` para cada aluno
presente.

## Referência da API

Prefixo base: `/api`. Todas as rotas exigem `Authorization: Bearer <token>` exceto
`/auth/login` e `/checkin/*` (públicas).

| Recurso              | Rotas (método + path)                                                                 | Roles                  |
|-----------------------|---------------------------------------------------------------------------------------|-------------------------|
| Auth                  | `POST /auth/login`, `GET /auth/me`                                                    | público / autenticado   |
| Escolas               | `GET,POST /escolas`, `GET,PUT /escolas/:id`                                           | autenticado / admin     |
| Usuários              | `GET /usuarios`, `GET /usuarios/:id`, `GET /usuarios/:id/perfil`, `POST,PUT,DELETE /usuarios/:id` | autenticado / admin |
| Artes marciais        | `GET /artes-marciais`, `GET/:id`, `POST,PUT,DELETE`                                   | autenticado / admin     |
| Faixas                | `GET /faixas`, `POST,PUT,DELETE`                                                       | autenticado / admin     |
| Critérios de graduação| `GET /criterios-graduacao`, `POST,PUT,DELETE`                                         | autenticado / admin     |
| Turmas                | `GET /turmas`, `GET /turmas/:id`, `POST /turmas` (admin), `PUT /turmas/:id` (admin ou professor dono) | ver `ehDonoDaTurma` |
| Salas                 | `GET /salas`, `GET/:id`, `POST,PUT,DELETE`                                            | autenticado / admin     |
| Horários (HorarioTurma)| `GET /horarios`, `POST,PUT,DELETE`                                                    | autenticado / admin     |
| Aulas                 | `GET /aulas`, `GET/:id`, `POST /aulas/gerar-hoje` (admin), `POST,PUT` (admin/professor dono), `DELETE` (admin) | ver `ehDonoDaTurma` |
| Check-in              | `GET,POST /checkin/:qr_token`                                                          | público (sem JWT)       |
| Chamadas              | `GET,POST /chamadas`, `PUT /chamadas/:id/validar`, `POST /chamadas/fechar/:aula_id`, `DELETE /chamadas/:id` (admin) | admin/professor dono |
| Matrículas            | `GET /matriculas`, `POST,PUT` (admin/professor), `DELETE` (admin)                     | autenticado             |
| Planos                | `GET /planos`, `POST,PUT,DELETE`                                                       | autenticado / admin     |
| Mensalidades          | `GET /mensalidades`, `POST,PUT`                                                        | autenticado / admin     |
| Pagamentos            | `GET /pagamentos`, `POST`                                                              | autenticado / admin     |
| Graduações            | `GET,POST,DELETE /graduacoes`                                                          | autenticado             |
| Ocorrências           | `GET,POST,DELETE /ocorrencias`                                                         | autenticado             |
| Dashboard             | `GET /dashboard`, `GET /dashboard/semaforo`, `GET /dashboard/graduacao`               | autenticado             |
| Health check          | `GET /health`                                                                          | público                 |

## Frontend

SPA de página única (`frontend/src/App.js`) sem router: a navegação principal troca
componentes por estado local (sidebar), exceto `/checkin/:qr_token`, que é detectada
por `window.location.pathname` e renderizada **fora** do app autenticado (página
pública, sem `AuthGuard`).

Páginas (`frontend/src/pages/`): `Login`, `Dashboard`, `Alunos` / `AlunoDetalhe`,
`Turmas`, `Chamadas`, `Financeiro`, `Configuracoes`, `CheckinPublico`.

O token JWT é guardado em `localStorage` e injetado em toda requisição via
interceptor do axios (`App.js`).

## Documentos do projeto

- [`PRD.md`](./PRD.md) — requisitos completos, user stories (US-01 a US-06) e
  detalhamento das tarefas T-01 a T-15
- [`Progress.txt`](./Progress.txt) — tracker de progresso das tarefas
- [`CLAUDE.md`](./CLAUDE.md) — instruções, boundaries e fluxo de trabalho para
  agentes de IA que colaboram neste repositório

## Status

Todas as 15 tarefas do MVP (T-01 a T-15) descritas no PRD estão concluídas — ver
`Progress.txt`. Fora de escopo do MVP: gateway de pagamento, app mobile nativo,
portal do aluno com login, comunicação automática (WhatsApp/e-mail) e gestão de
campeonatos.
