# Backend — Escola de Artes Marciais

API REST em Node.js + Express + Sequelize (MySQL) + JWT. Para visão geral do
produto, modelo de dados completo e referência de API, ver o
[README na raiz do projeto](../README.md).

## Rodando localmente (fora do Docker)

```bash
npm install
cp .env.example .env   # ajuste DB_HOST para localhost se não usar Docker
npm run dev             # nodemon src/server.js, porta definida em PORT (padrão 5000)
```

Recomendado, porém, rodar via `docker compose up` na raiz do repositório — o
serviço `mysql` já vem configurado com as credenciais esperadas pelo `.env.example`.

## Estrutura

```
src/
├── app.js          # Express app: middlewares globais + montagem de todas as rotas
├── server.js        # bootstrap: sequelize.authenticate() + sync + app.listen
├── config/          # configuração de conexão do Sequelize
├── models/          # uma entidade por arquivo + associações centralizadas em models/index.js
├── controllers/      # regra de negócio por recurso (um arquivo por recurso, ~espelha routes/)
├── routes/           # Router do Express por recurso, aplica autenticar/autorizarRole
├── middleware/
│   ├── autenticacao.js   # valida JWT, popula req.usuario = { id, role, escola_id }
│   └── autorizacao.js    # autorizarRole (por role), autorizarEscola (por escola_id),
│                          # ehDonoDaTurma (professor só acessa turma onde é professor_id)
└── utils/
    └── data.js       # dataLocalISO() — data de "hoje" em fuso local (nunca toISOString())
```

## Convenções

- **Sempre Sequelize ORM** — nunca raw SQL.
- **Todo query que retorna dado sensível filtra por `escola_id`** — não há isolamento
  automático no nível do ORM, então cada controller precisa aplicar o filtro.
- **Senhas sempre com bcrypt** (`bcryptjs`), nunca texto plano.
- Autorização por dono de turma (`professor_id`) é feita explicitamente nos
  controllers com o helper `ehDonoDaTurma`, não pelo middleware de rota — porque
  a checagem depende do recurso já carregado (aula → turma, chamada → aula → turma).
- **Nunca calcule "hoje" com `toISOString()`** — sempre use `dataLocalISO()`
  (`src/utils/data.js`). `toISOString()` converte para UTC e quebra silenciosamente
  entre 21h e 23h59 no horário de Brasília (ver README raiz, seção "Datas e fuso horário").

## Verificação rápida

```bash
# Models sobem sem erro de associação
docker compose exec backend node -e "require('./src/models/index')"

# Health check
curl http://localhost:5000/api/health
```
