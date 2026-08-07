# Escola de Artes Marciais — Sistema de Gestão

Sistema de gestão para escolas de artes marciais, substituindo o iDojo. A prioridade
do produto é a **chamada por QR Code**: o aluno faz auto check-in ao escanear o QR
Code fixado na sala, e o professor valida/fecha a chamada depois. O sistema é
multi-escola, com isolamento total de dados por `escola_id`.

Repositório: [github.com/fulviovb/dojo-manager](https://github.com/fulviovb/dojo-manager)
(branch padrão `master`).

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
│   │   ├── middleware/       # autenticação (JWT) e autorização (roles)
│   │   ├── services/         # lógica reaproveitada por vários controllers (ex: faturaService.js)
│   │   ├── scripts/          # migrações one-off (projeto não usa migration tool, ver nota abaixo)
│   │   └── utils/            # helpers puros (ex: data.js — datas em fuso local)
│   ├── uploads/fotos/         # fotos de aluno enviadas via upload (fora do versionamento)
│   └── Dockerfile
├── frontend/                  # SPA React (CRA)
│   └── src/
│       ├── App.js            # layout, sidebar, roteamento simples por estado
│       ├── pages/            # uma página por tela (Dashboard, Turmas, Chamadas...)
│       ├── components/       # componentes compartilhados entre páginas (Avatar, GraficoArea)
│       └── utils/            # helpers puros de UI (ex: faixaCores.js)
├── checkin-online/             # módulo satélite (deploy separado, sem banco — ver abaixo)
│   └── src/                   # Node/Express standalone, storage em arquivo
├── docker-compose.yml         # orquestra mysql + backend + frontend + nginx
├── nginx.conf                 # proxy reverso (alias /escola-am, /api, /ws)
├── CLAUDE.md                  # instruções e boundaries para agentes de IA
├── PRD.md                     # requisitos, user stories (US-01..US-06) e tarefas (T-01..T-15)
├── Progress.txt               # tracker de progresso das tarefas do PRD
└── prints/                    # referências visuais (ex: telas do iDojo legado)
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
| `CHECKIN_ONLINE_URL` | URL do módulo satélite `checkin-online/` (opcional — ver seção própria abaixo) |
| `CHECKIN_ONLINE_API_KEY` | segredo compartilhado com o `checkin-online/` (mesmo valor do `.env` de lá) |

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
`aulasController`, `chamadasController` e `matriculasController`: admin sempre
passa; professor só se `turma.professor_id === usuario.id`.

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
GraduacaoAluno → histórico de faixas por aluno + arte marcial (+ exame_participante_id/
                 nota_exame opcionais, quando confirmada a partir de um Exame de Faixa)
Ocorrencia     → anotações do professor sobre um aluno

Exame  *―1 ArteMarcial, 1―* FaseExame 1―* CriterioExame *―* Faixa (via CriterioExameFaixa)
            [roteiro editado direto no Exame enquanto em planejamento; ao criar
            um exame novo, copia o roteiro do exame mais recente da mesma arte
            marcial, se existir — só ponto de partida, não template compartilhado]
Exame  1―* ExameParticipante *―1 Usuario (Aluno)
Exame  1―* AvaliadorExame (login por PIN, sem Usuario/bcrypt)
Exame  1―* AvaliacaoAluno *―1 FaseExame, *―1 ExameParticipante, *―1 AvaliadorExame
AvaliacaoAluno 1―* RespostaCriterio *―1 CriterioExame  (conceito: + | +- | -)

PlanoMensalidade 1―* AssinaturaAluno *―1 Usuario (Aluno)   [vínculo recorrente: dia de
                 vencimento + status ativa/pausada/finalizada]
AssinaturaAluno  1―* Mensalidade  ("Fatura" na UI — geradas automaticamente, ver abaixo)
PlanoMensalidade 1―* Mensalidade  (fatura também pode ser avulsa, sem assinatura)
Mensalidade 1―* Pagamento
```

`Usuario.email` **não é único** (ver "Unicidade de cadastro" abaixo); `Usuario.cpf`
é o identificador único de fato, quando preenchido. `Usuario.foto_url` guarda o
caminho relativo da foto enviada (`/uploads/fotos/<arquivo>`), servido estático a
partir de `backend/uploads/`.

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
- Tocar o nome não registra na hora — mostra uma tela de confirmação ("Confirma o
  check-in de {nome}?") antes. Mesma UX nas duas telas de check-in (local e a do
  módulo satélite).
- Turma inativa não gera aula nova nem recebe check-in (mesmo que uma `Aula`
  antiga dela ainda exista no banco de quando estava ativa). Quando duas turmas
  consecutivas dividem a mesma sala (ex: 19h e 20h — janelas de ±20min se
  sobrepõem), o sistema prioriza a aula cujo horário "de verdade" contém o
  instante, não a primeira encontrada no banco.

### Semáforo de ausência

- 🟡 **Amarelo**: 3 aulas consecutivas sem presença
- 🟠 **Laranja**: 2 semanas corridas sem presença
- 🔴 **Vermelho**: `% faltas >= Escola.threshold_falta_vermelho` (padrão 40%)

Lista ordenada por `% de faltas` decrescente — como vermelho só ocorre acima do
threshold e laranja/amarelo só abaixo dele, os vermelhos ficam naturalmente no
topo, com ordenação real dentro de cada grupo.

### Graduação

Aluno é elegível quando `MatriculaAluno.aulas_desde_graduacao >=
CriterioGraduacao.min_aulas` para a combinação escola + arte marcial + faixa atual.
O contador é incrementado em `POST /api/chamadas/fechar/:aula_id` para cada aluno
presente. `GET /api/dashboard/graduacao` (aceita `?arte_marcial_id=` opcional) lista
os elegíveis, agrupando por (aluno, arte marcial) pra não contar dobrado quem está
matriculado em mais de uma turma da mesma arte.

**Faixas e critérios são editáveis em Configurações**: clicar numa faixa da
lista abre edição inline (nome, cor, ordem); `Faixa.cor_secundaria` (opcional)
permite marcar uma faixa com duas cores (ex: Cinza-Branca), mostradas como um
círculo dividido ao meio. Critérios de Graduação têm botão "Editar" por linha
pra atualizar o Min. aulas.

### Semáforo de Graduação

Complementar ao Semáforo de Ausência (lado a lado no Dashboard, grid de 2
colunas) — em vez de olhar só a frequência já realizada, faz uma prospecção:
quantas aulas de verdade ainda restam entre hoje e o próximo exame de faixa
(`ArteMarcial.data_proximo_exame`, editável em Configurações → Artes
Marciais) versus quantas presenças ainda faltam pro aluno fechar a carência
da faixa atual. O indicador é o **% dessas aulas restantes que ele precisa
comparecer daqui pra frente**.

`GET /api/dashboard/semaforo-graduacao` (aceita `?arte_marcial_id=` opcional)
cruza `HorarioTurma` das turmas **ativas** em que o aluno está matriculado com
o calendário até a data do exame, descontando feriados nacionais
(`backend/src/utils/feriados.js` — datas fixas + Sexta-feira Santa via
cálculo de Páscoa; não cobre feriados municipais nem pontos facultativos tipo
Carnaval/Corpus Christi). Cores: 🔴 impossível bater a tempo (ou não sobra
mais nenhuma aula antes do exame), 🟠 precisa de 80%+ das aulas restantes,
🟡 precisa de 50%+. Cada linha mostra a arte marcial (um aluno pode ter
alertas de mais de uma, com dias da semana e data de exame diferentes — daí
números de "aulas restantes" bem diferentes entre alunos mesmo se parecerem
estar "na mesma turma"); o card tem um filtro pra ver só uma arte específica.

### Módulo de Exame de Faixa

Módulo **opcional** (especificação original em `modulo-exame-faixa.txt`) pra
apoiar a avaliação no dia do exame — quem não usar continua graduando aluno
do jeito manual de sempre.

**Roteiro (fases/provas + critérios de avaliação)** é montado direto na tela
do Exame (seção "Roteiro do Exame" em `ExameDetalhe.js`), editável só
enquanto `Exame.status === 'planejamento'` — trava ao clicar "Iniciar
exame". Ao criar um `Exame` (`POST /api/exames`), o sistema copia o roteiro
do exame mais recente da mesma arte marcial, se existir, como ponto de
partida (não é um template compartilhado — cada exame tem sua própria cópia
editável, sem afetar exames passados ou futuros). Cada critério tem duas
listas de faixas ("Avalia este critério" / "Não avalia") com clique único
pra mover uma faixa de uma lista pra outra — mesmo padrão visual de
Presentes/Ausentes da tela de Chamadas, sem checkbox e sempre editável (sem
modo "Editar" separado).

**Roteiro Padrão** (`Exame.tipo = 'roteiro_padrao'`): um exame pode ser
marcado como o roteiro padrão da sua arte marcial (botão em
`ExameDetalhe.js`, só um por arte — marcar um novo rebaixa o anterior pra
`'normal'` automaticamente) para servir de fonte fixa e nunca precisa
"rodar" de verdade (fica parado em planejamento). O botão "🌟 Começar com
base em roteiro padrão" em `Exames.js` cria um exame novo copiando
especificamente dele (`POST /api/exames/comecar-com-roteiro-padrao`, 404 se
a arte ainda não tiver um definido) — diferente do "+ Novo Exame" comum,
que copia do exame mais recente por data. Roteiro Padrão é protegido contra
exclusão (`DELETE /api/exames/:id` rejeita com 400; precisa desmarcar
primeiro).

**Nota**: cada fase converge pra 100, dividido igualmente entre seus
critérios; um critério sem a faixa pretendida do aluno marcada como
aplicável recebe nota cheia automática (não faz sentido cobrar, por
exemplo, um conceito avançado de quem presta exame pra faixa branca).
Nota final do aluno = média simples entre as fases finalizadas (lógica em
`backend/src/utils/notaExame.js`).

**Sorteio de avaliadores** (`POST /api/exames/:id/sorteio`): o professor
seleciona a fase em andamento e os alunos sendo avaliados naquele momento;
o sistema sorteia um avaliador por aluno, excluindo quem já avaliou aquele
aluno em **qualquer** fase do exame, e **distribuindo a carga igualmente**
— cada aluno vai pro avaliador elegível com menos avaliações no exame até
agora (empate quebrado por sorteio), então com N alunos e N avaliadores
disponíveis cada um fecha com exatamente 1. Avaliadores são login descartável por
**PIN numérico** (`AvaliadorExame`, sem `Usuario`/bcrypt) — acessam
`/exame-avaliador/:exame_id` (página pública) com um JWT de escopo restrito
(`middleware/autenticacaoAvaliador.js`, `tipo: 'avaliador'`, não aceito nas
rotas de staff). Cada critério é avaliado como `+` (apresenta o conceito),
`+-` (parcial) ou `-` (não apresenta); finalizar uma avaliação exige
resposta em todo critério aplicável. Avaliação finalizada só pode ser
corrigida via reabertura pelo staff (`PATCH
/api/exames/:id/avaliacoes/:avid/reabrir`).

O relatório final do exame (`GET /api/exames/:id/relatorio`) tem um botão
**"Confirmar graduação"** por aluno que grava direto em `GraduacaoAluno`
(com `nota_exame` preenchida) — sem isso, o exame não altera a graduação
de ninguém automaticamente.

### Histórico de frequência (presenças **e** ausências)

`GET /api/usuarios/:id/perfil` monta o campo `frequencia`: para cada turma em que o
aluno tem matrícula ativa, cruza todas as `Aula`s **fechadas** dessa turma com as
`Chamada`s do aluno — o que não tem chamada correspondente vira "ausente". Presenças
reais aparecem sempre, mesmo anteriores à `data_matricula` atual (uma matrícula pode
ser recriada depois de uma pausa sem apagar o histórico); só a marcação de *ausência*
respeita esse corte, pra não inventar falta antes do aluno estar matriculado.

### Geração de faturas (sem cron)

Mesmo espírito do motor de aulas: `faturaService.gerarFaturasPendentes(escola_id)`
roda **sob demanda** (disparada pelos endpoints financeiros e pelo perfil do aluno),
gerando toda `Mensalidade` ("Fatura") de ciclos que já entraram na janela de
**5 dias de antecedência do vencimento** (`ANTECEDENCIA_GERACAO_DIAS`) de cada
`AssinaturaAluno` ativa, com clamp de fim de mês (dia de vencimento 31 num
fevereiro cai no dia 28/29) — a `data_vencimento` continua sendo a real, só a
geração antecipa, dando tempo do aluno pagar antes da data. Pausar uma assinatura
não gera cobrança retroativa do período pausado. Existe também geração antecipada
manual (`POST /api/assinaturas/:id/gerar-fatura`, idempotente) pra quem quer pagar
ainda mais cedo, fora da janela automática.

### Unicidade de cadastro: CPF, não e-mail

`Usuario.email` não é único no banco — alunos menores costumam usar o e-mail dos
pais, e é comum dois irmãos (dois alunos) compartilharem o mesmo endereço. Só
precisa ser único quem realmente faz login (`admin`/`professor`); isso é validado na
aplicação (`usuariosController.js`), não no schema. O identificador único de fato do
aluno é o `cpf` (índice único no banco, `NULL` quando ainda não cadastrado — nunca
`''`, pra não colidir entre alunos sem CPF preenchido).

### Datas e fuso horário

**Nunca use `Date.prototype.toISOString()` para calcular "hoje"** — ela converte
para UTC, e no horário de Brasília (UTC-3) qualquer momento entre 21h e 23h59
já é o dia seguinte em UTC. Isso já causou um bug real: o check-in parava de
achar a aula ativa das turmas noturnas nesse intervalo, porque o motor de
geração de aulas comparava o `dia_semana` de amanhã contra o horário de hoje.

Use sempre `dataLocalISO()` (`backend/src/utils/data.js`), que monta o
`YYYY-MM-DD` a partir de `getFullYear/getMonth/getDate` (fuso local do
processo). Já aplicado em `checkinController`, `aulasController`
(`gerarAulasPorData`), `dashboardController` (período de 30 dias e mês
atual) e `graduacoesController` (fechamento de graduação anterior).

## Módulo satélite: check-in online (`checkin-online/`)

O sistema principal roda só localmente (`docker compose`), então alunos não
conseguem escanear o QR Code de fora da rede local. Em vez de colocar a
stack inteira (MySQL + disco de fotos) numa hospedagem paga, existe um
módulo **satélite**, mínimo e com deploy separado, em `checkin-online/`:
Node/Express puro (sem Sequelize/MySQL), armazenamento em arquivo — sem
banco de dados. Ele só faz duas coisas: mostra a lista de alunos da sala
pro aluno escanear o QR Code, e grava os check-ins num arquivo de texto
(`data/checkins-AAAA-MM-DD.txt`, JSON-lines). Por escrever em disco local,
só funciona num host com processo único e disco persistente (ex.: Oracle
Cloud Always Free) — não em serverless/edge onde o disco é efêmero.

Sincronização é manual, sob demanda: o botão **"Sincronizar Check-in
Online"** na tela Chamadas (`frontend/src/pages/Chamadas.js`) chama
`POST /api/checkin-online/sincronizar` (admin), que:

1. Empurra a lista de hoje (salas, turmas do dia, alunos matriculados) pro
   `checkin-online/` (`checkinOnlineService.sincronizarRoster`).
2. Busca os check-ins pendentes de lá e reconcilia cada um como `Chamada`
   real (`checkinOnlineService.buscarEReconciliarCheckins`), criando
   automaticamente a `Aula` do dia se ainda não existir (mesma geração
   preguiçosa do motor de aulas — **não é preciso abrir a turma
   manualmente antes de sincronizar**).

Autenticação entre os dois sistemas é um segredo simples compartilhado
(`Authorization: Bearer <CHECKIN_ONLINE_API_KEY>`), não JWT — nível de
exposição baixo, o módulo só guarda nomes e horários de check-in, nenhum
dado financeiro ou cadastral completo. Detalhes de rotas e formato de
arquivo em `checkin-online/` (README próprio, se existir) ou no plano
salvo em `/home/fulviovb/.claude/plans/zesty-splashing-babbage.md`.

`GET /checkin/:qr_token` faz negociação de conteúdo: um navegador (o
celular do aluno, escaneando o QR) recebe uma página HTML autocontida
(`checkin-online/src/paginaCheckin.js`, sem build step — mesmo espírito
minimalista do módulo) que busca os dados via fetch e deixa o aluno tocar
o nome; uma chamada explícita com `Accept: application/json` continua
recebendo só os dados (usado nos testes e por integrações). A lista só
mostra quem **ainda não** fez check-in — quem já confirmou some da tela
(mesmo filtro aplicado na versão local, `CheckinPublico.js`).

**Em produção**: VM `e2-micro` (Always Free) no Google Cloud, atrás de um
domínio grátis DuckDNS com HTTPS automático via Caddy (Let's Encrypt) — ver
`checkin-online/deploy/` (compose próprio da VM) e detalhes em
`Progress.txt`, FASE 7. Importante: a VM roda em UTC por padrão — o
serviço `checkin-online` do compose de deploy define `TZ=America/Sao_Paulo`
explicitamente, senão a janela de ±20min do check-in fica 3h fora do
horário real (mesma classe de bug do fuso descrita acima). A tela
**Configurações → Salas e QR Codes** mostra a URL pública de produção
(`REACT_APP_CHECKIN_ONLINE_PUBLIC_URL`) com QR Code gerado no navegador
(`qrcode`, client-side) pronto pra abrir em tamanho grande e imprimir —
só lista sala com pelo menos uma turma ativa. Testado com alunos reais em
04/08/2026 (turma de Jiu Jitsu KM3, COPEL) — funcionando ponta a ponta.

## Referência da API

Prefixo base: `/api`. Todas as rotas exigem `Authorization: Bearer <token>` exceto
`/auth/login` e `/checkin/*` (públicas).

| Recurso              | Rotas (método + path)                                                                 | Roles                  |
|-----------------------|---------------------------------------------------------------------------------------|-------------------------|
| Auth                  | `POST /auth/login`, `GET /auth/me`                                                    | público / autenticado   |
| Escolas               | `GET,POST /escolas`, `GET,PUT /escolas/:id`, `POST /escolas/:id/assinatura` (multipart, campo `assinatura`, PNG) | autenticado / admin |
| Usuários              | `GET /usuarios` (`?role=`, `?ativo=false\|todos` — padrão só ativos), `GET /usuarios/:id`, `GET /usuarios/:id/perfil` (inclui `frequencia`, `assinaturas`), `POST,PUT,DELETE /usuarios/:id` (`DELETE` = desativar; reativar é `PUT {ativo:true}`), `POST /usuarios/:id/foto` (multipart, campo `foto`) | autenticado / admin |
| Artes marciais        | `GET /artes-marciais`, `GET/:id`, `POST,PUT,DELETE`                                   | autenticado / admin     |
| Faixas                | `GET /faixas`, `POST,PUT,DELETE`                                                       | autenticado / admin     |
| Critérios de graduação| `GET /criterios-graduacao`, `POST,PUT,DELETE`                                         | autenticado / admin     |
| Turmas                | `GET /turmas` (`?ativa=false\|todas`), `GET /turmas/:id`, `POST /turmas` (admin), `PUT /turmas/:id` (admin ou professor dono) | ver `ehDonoDaTurma` |
| Salas                 | `GET /salas`, `GET/:id`, `POST,PUT,DELETE`                                            | autenticado / admin     |
| Horários (HorarioTurma)| `GET /horarios`, `POST,PUT,DELETE`                                                    | autenticado / admin     |
| Aulas                 | `GET /aulas` (`?turma_id=` traz `presentes`/`ausentes` por aula), `GET/:id`, `POST /aulas/gerar-hoje` (admin), `POST,PUT` (admin/professor dono), `DELETE` (admin) | ver `ehDonoDaTurma` |
| Check-in              | `GET,POST /checkin/:qr_token`                                                          | público (sem JWT)       |
| Chamadas              | `GET,POST /chamadas`, `PUT /chamadas/:id/validar`, `POST /chamadas/fechar/:aula_id`, `DELETE /chamadas/:id` (admin) | admin/professor dono |
| Matrículas            | `GET /matriculas`, `POST,PUT` (admin/professor), `DELETE` (admin)                     | autenticado             |
| Planos                | `GET /planos` (`?todos=true` inclui inativos), `POST,PUT,DELETE`                       | autenticado / admin     |
| Assinaturas           | `GET /assinaturas` (`?status=`, `?aluno_id=`), `POST`, `PUT /:id`, `PUT /:id/pausar\|reativar\|finalizar`, `POST /:id/gerar-fatura` | autenticado / admin |
| Mensalidades ("Faturas")| `GET /mensalidades` (`?aluno_id=`, `?status=`, `?ano=`, `?vencida=`), `POST,PUT`, `PUT /:id/cancelar`, `GET /:id/recibo` | autenticado / admin |
| Pagamentos            | `GET /pagamentos` (`?mensalidade_id=`, `?aluno_id=`), `POST`, `DELETE /:id` (desfazer)| autenticado / admin     |
| Financeiro            | `GET /financeiro/painel` (`?ano=` — indicadores + série mensal ganhos vs a receber)   | autenticado              |
| Relatórios            | `GET /relatorios/alunos-por-graduacao`, `/alunos-por-turma`, `/ficha-cadastral`, `/frequencia-turma`, `/frequencia-aluno`, `/aniversariantes` | autenticado |
| Graduações            | `GET,POST,DELETE /graduacoes` (`POST` aceita `exame_participante_id`/`nota_exame` opcionais) | autenticado |
| Exame de Faixa — exames | `GET,POST /exames`, `POST /exames/comecar-com-roteiro-padrao`, `GET,DELETE /exames/:id`, `PATCH /exames/:id/status`, `PATCH /exames/:id/tipo`, `POST,PUT,DELETE /exames/:id/fases(/:id)`, `POST,PUT,DELETE .../criterios(/:id)`, `PUT .../criterios/:id/faixas` (roteiro, só com exame em planejamento), `POST,DELETE /exames/:id/participantes(/:id)`, `GET /exames/:id/participantes/:id/ficha`, `POST,DELETE /exames/:id/avaliadores(/:id)`, `POST /exames/:id/sorteio`, `PATCH /exames/:id/avaliacoes/:id/reabrir`, `GET /exames/:id/relatorio` | autenticado / admin+professor |
| Exame de Faixa — avaliador | `POST /avaliacao-publica/exames/:exame_id/login` (PIN), `GET /avaliacao-publica/minhas-avaliacoes`, `GET /avaliacao-publica/avaliacoes/:id`, `PUT .../criterios/:id`, `POST .../finalizar` | público (login) / JWT de avaliador |
| Ocorrências           | `GET,POST,DELETE /ocorrencias`                                                         | autenticado             |
| Dashboard             | `GET /dashboard`, `GET /dashboard/semaforo`, `GET /dashboard/graduacao` (`?arte_marcial_id=`), `GET /dashboard/semaforo-graduacao` (`?arte_marcial_id=`) | autenticado |
| Check-in online       | `POST /checkin-online/sincronizar` (sincroniza roster + reconcilia check-ins do módulo satélite, ver seção própria acima) | admin |
| Health check          | `GET /health`                                                                          | público                 |
| Uploads (estático)    | `GET /uploads/fotos/:arquivo`                                                          | público (sem JWT)       |

## Frontend

SPA de página única (`frontend/src/App.js`) sem router: a navegação principal troca
componentes por estado local (sidebar). Três rotas são detectadas por
`window.location.pathname` e renderizadas **fora** do app autenticado (sem sidebar):

| Path                | Página              | Uso |
|---------------------|----------------------|-----|
| `/checkin/:qr_token`| `CheckinPublico`     | pública, sem JWT — auto check-in do aluno |
| `/recibo/:id`       | `ReciboPage`         | aberta em nova aba a partir de Financeiro → Faturas; imprimível |
| `/relatorio/:tipo`  | `RelatorioPage`      | aberta em nova aba a partir de Relatórios; imprimível |
| `/exame-avaliador/:exame_id` | `AvaliadorExame` | pública de verdade — login por PIN, JWT próprio (ver Exame de Faixa) |
| `/exame/:exame_id/ficha/:participante_id` | `ExameFichaPage` | aberta em nova aba a partir de Exames; imprimível |
| `/exame/:exame_id/relatorio-impressao` | `ExameRelatorioPage` | aberta em nova aba a partir de Exames; imprimível |

`ReciboPage`/`RelatorioPage`/`ExameFichaPage`/`ExameRelatorioPage` reaproveitam o
token já salvo no `localStorage` (mesma origem/aba do navegador) — não são páginas
públicas de verdade, só não têm sidebar. `AvaliadorExame` é a exceção: usa uma
instância própria do axios com o token do avaliador guardado numa chave separada
do localStorage, pra não ser sobrescrito pelo interceptor global do `token` de
staff se os dois convivessem no mesmo navegador.

Páginas (`frontend/src/pages/`): `Login`, `Dashboard`, `Alunos` / `AlunoDetalhe`,
`Turmas` / `TurmaDetalhe`, `Chamadas`, `Financeiro`, `Exames` / `ExameDetalhe`,
`Relatorios` / `RelatorioPage`, `Configuracoes`, `CheckinPublico`, `ReciboPage`,
`AvaliadorExame`, `ExameFichaPage`, `ExameRelatorioPage`.

Componentes compartilhados (`frontend/src/components/`): `Avatar` (foto do aluno com
fallback de iniciais), `GraficoArea` (gráfico de área em SVG puro, sem dependência
externa, usado no painel financeiro) e `AssinaturaPad` (assinatura desenhada à mão
em `<canvas>`, salva por escola — ver "Financeiro" abaixo).

O token JWT é guardado em `localStorage` e injetado em toda requisição via
interceptor do axios (`App.js`).

### Alunos

- Lista alterna entre **Ativos / Inativos / Todos** (botão de filtro); por padrão
  mostra só ativos, inclusive no dashboard (contagens e relatórios já filtram
  `ativo: true`).
- Desativar/ativar um aluno é uma ação imediata, sem diálogo de confirmação —
  reativar é trivial pela aba "Inativos", então não há necessidade de fricção.
- Cabeçalhos da tabela (Nome, Apelido, Matrícula, Artes Marciais) são clicáveis
  para ordenar. A coluna **Artes Marciais** concatena os nomes distintos das
  artes em que o aluno tem algum registro em `GraduacaoAluno`.
- Avatar (foto ou iniciais) do lado esquerdo de cada linha; upload de foto direto
  no formulário de edição (`Escolher arquivo` → sobe na hora, sem precisar salvar
  o resto do formulário).
- Histórico de frequência no perfil (`AlunoDetalhe`) mostra presenças **e**
  ausências, não só presenças.

### Turmas

Clicar no nome de uma turma abre `TurmaDetalhe`, com:
- **Alunos matriculados**: avatar, nome + badge da graduação atual (`FaixaAtual`),
  botão "Desmatricular" e um modal "+ Novo" para matricular um aluno ativo
  ainda não matriculado (com seleção opcional da faixa atual, filtrada por
  `arte_marcial_id` da turma).
- **Informações gerais**: dias/horário, professor, sala e arte marcial.
- **Aulas**: histórico com presentes/ausentes por aula (via `GET /aulas?turma_id=`).

Matricular um aluno numa turma é o que habilita a chamada/check-in daquela
turma a contar presença para ele.

### Chamadas

Detalhe de uma aula mostra presentes, ausentes e check-ins por QR Code ainda
não validados, cada um com avatar (foto ou iniciais, mesmo componente
`Avatar`) ao lado do nome — inclusive na busca de "aluno de outra turma".
Botão "Sincronizar Check-in Online" puxa os check-ins do módulo satélite
(ver seção própria acima). Botão "Validar Todos" no card de pendentes QR
valida todos de uma vez (mesmo padrão do "Marcar todos presentes" dos
ausentes) sem remover a validação individual por aluno.

### Financeiro

Abas **Painel** (indicadores + gráfico de ganhos vs a receber) / **Planos** /
**Assinaturas** / **Faturas**. Uma Assinatura vincula aluno + plano + dia de
vencimento; faturas são geradas automaticamente (ver "Geração de faturas" acima).
Pagamento aceita juros/desconto com total recalculado ao vivo; recibo abre em
nova aba, imprimível. A assinatura que aparece no recibo é **por escola**
(`Escola.assinatura_url`), desenhada em Configurações → "Assinatura para
Recibos" (`AssinaturaPad`, canvas) e salva no servidor — sem isso, o recibo
simplesmente não mostra assinatura (sem quebrar o resto). Cabeçalho da tabela
de Faturas é clicável e ordenável (mesmo padrão de `Alunos.js`), com avatar
do aluno na coluna Nome. Ordenação padrão é por **Status** — Vencida primeiro,
depois Pendente (em aberto), por último Paga —, com nome do aluno como
critério de desempate dentro do mesmo status.

### Exames

Lista de exames (`Exames.js`) com status (Planejamento / Em andamento /
Finalizado). Dois jeitos de criar: "+ Novo Exame" copia o roteiro do exame
mais recente da arte marcial, se existir; "🌟 Começar com base em roteiro
padrão" copia especificamente do exame marcado como **Roteiro Padrão**
daquela arte (`Exame.tipo = 'roteiro_padrao'`, só um por arte marcial —
marcar um novo rebaixa o anterior automaticamente). `ExameDetalhe.js` reúne
o "Roteiro do Exame" (fases/critérios, editável só em planejamento),
participantes, avaliadores (com PIN visível pra repassar), sorteio por
fase, uma grade de progresso (status/nota por aluno × fase, com botão
"reabrir" nas finalizadas), o relatório final com "Confirmar graduação"
por aluno, e botões pra marcar/desmarcar o exame como Roteiro Padrão e
excluí-lo — **Roteiro Padrão nunca pode ser excluído** direto, precisa ser
desmarcado primeiro. Ver "Módulo de Exame de Faixa" acima pras regras
completas.

### Relatórios

Grid de cards com filtro próprio por relatório (campo de busca no topo pra achar
um específico). "Gerar Relatório" abre o resultado em nova aba, página imprimível
— mesmo padrão do recibo. 8 relatórios: Alunos por Graduação, Alunos por
Turma-Horário, Ficha Cadastral Resumida, Aulas & Frequências (Turma, com modos
Relação/Quantitativo), Aulas & Frequências (Aluno), Aniversariantes por Mês,
Frequência: Presença Mínima, e **Frequência: % de Presença** (todo aluno ativo
e o % de carência cumprida em relação à faixa atual — aulas presentes desde o
início da graduação atual ÷ `CriterioGraduacao.min_aulas` da faixa; filtro por
Programa Marcial e por Turma; ordena por Nome, Graduação ou Percentual). Ambos
os relatórios de carência contam presença em qualquer turma da mesma arte
marcial desde o início da graduação — não só nas turmas matriculadas hoje,
pra não subcontar quem trocou de turma/horário no meio do caminho.

## Documentos do projeto

- [`PRD.md`](./PRD.md) — requisitos completos, user stories (US-01 a US-06) e
  detalhamento das tarefas T-01 a T-15
- [`Progress.txt`](./Progress.txt) — tracker de progresso das tarefas
- [`CLAUDE.md`](./CLAUDE.md) — instruções, boundaries e fluxo de trabalho para
  agentes de IA que colaboram neste repositório

## Status

Todas as 15 tarefas do MVP (T-01 a T-15) descritas no PRD estão concluídas.
Trabalho atual é refinamento pós-MVP — ver `Progress.txt` (FASE 2 a FASE 10):
reescrita da tela de Chamadas, módulo de Gestão Financeira completo (planos,
assinaturas recorrentes, faturas com geração automática, recibo imprimível),
módulo de Relatórios (8 relatórios básicos inspirados no iDojo), foto do aluno,
histórico de frequência com ausências, correções de cadastro (CPF como
identificador único do aluno, e-mail deixou de ser único pra permitir irmãos
compartilhando o e-mail dos pais), módulo satélite de check-in online
(`checkin-online/`, ver seção própria acima) — já em produção no Google
Cloud, faltando só a reimpressão física dos QR Codes das salas — e
assinatura do recibo passando a ser desenhada e salva por escola (sem mais
depender de um arquivo local no repositório), essencial pra outras escolas
usarem o sistema, ajustes pós-lançamento (fatura gerada com 5 dias de
antecedência do vencimento, tabela de Faturas ordenável por status,
avatar do aluno em Chamadas e Faturas, cabeçalho ordenável em Critérios
de Graduação, botão "Validar Todos" nos check-ins QR pendentes, relatório
novo "Frequência: % de Presença", faixas com edição e duas cores,
critérios de graduação editáveis, confirmação antes do check-in, correção
de turma inativa aparecendo em aula), e o novo **Semáforo de Graduação**
(ver seção própria acima) — indicador de risco pra bater a carência da
faixa a tempo do próximo exame, com data de exame configurável por arte
marcial e cálculo de feriados nacionais, e o novo **Módulo de Exame de
Faixa** (ver seção própria acima) — ferramenta opcional pra apoiar a
avaliação no dia do exame, com roteiro customizável de fases/critérios por
arte marcial, sorteio de avaliadores (login descartável por PIN), cálculo
automático de nota, ficha e relatório imprimíveis, e confirmação de
graduação integrada ao histórico do aluno.

Fora de escopo do MVP: gateway de pagamento, app mobile nativo, portal do aluno
com login, comunicação automática (WhatsApp/e-mail) e gestão de campeonatos.
