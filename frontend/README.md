# Frontend — Escola de Artes Marciais

SPA em React 18 (Create React App) + axios. Para visão geral do produto e
referência da API consumida, ver o [README na raiz do projeto](../README.md).

## Rodando localmente (fora do Docker)

```bash
npm install
REACT_APP_API_URL=http://localhost:5000/api npm start   # porta 3000
```

Recomendado rodar via `docker compose up` na raiz do repositório, que já injeta
`REACT_APP_API_URL` apontando para o backend do compose.

## Estrutura

```
src/
├── App.js       # layout (sidebar + header), autenticação via localStorage,
│                 # roteamento simples por estado (sem react-router)
├── index.js
└── pages/        # uma tela por arquivo
    ├── Login.js
    ├── Dashboard.js
    ├── Alunos.js / AlunoDetalhe.js
    ├── Turmas.js
    ├── Chamadas.js
    ├── Financeiro.js
    ├── Configuracoes.js
    └── CheckinPublico.js   # única página pública, sem AuthGuard — ver App.js
```

## Roteamento

Não há `react-router`. `App.js` inspeciona `window.location.pathname`:
- `/checkin/:qr_token` → renderiza `CheckinPublico` isoladamente, sem sidebar/login
  (é a página que o aluno acessa ao escanear o QR Code da sala).
- Qualquer outra rota → app autenticado; a página ativa é controlada por estado
  local (`paginaAtiva`) trocado pelos botões da sidebar, não pela URL.

## Autenticação

Token JWT e dados do usuário ficam em `localStorage` (`token`, `usuario`). Um
interceptor do axios em `App.js` injeta `Authorization: Bearer <token>` em toda
requisição automaticamente.
