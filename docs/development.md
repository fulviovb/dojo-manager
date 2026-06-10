# Guia de Desenvolvimento — DojoManager

## Ambiente de Desenvolvimento

### Requisitos

- **Node.js** 18+
- **MySQL** 8+ (ou MariaDB 10.6+)
- **npm** 9+

### Setup rápido

```bash
# 1. Instalar dependências
npm install

# 2. Copiar e configurar .env
cp .env.example .env
# Edite .env com suas credenciais MySQL

# 3. Criar tabelas
npm run migrate

# 4. Popular dados demo
npm run seed

# 5. Iniciar em modo desenvolvimento
npm run dev
```

Acesse: http://localhost:3000  
Login: `admin@dojo.com` / `admin123`

---

## Estrutura de Arquivos

### Convenção por módulo

Cada módulo segue a mesma estrutura de 3 camadas:

```
routes/moduloRoutes.js          → define URLs e chama controller
controllers/moduloController.js → lógica de negócio, validação
models/moduloModel.js           → queries SQL
views/modulo/
  ├── index.ejs                 → listagem
  ├── show.ejs                  → detalhes
  ├── form.ejs                  → criar/editar (formulário único)
  └── _partial.ejs              → fragmentos reutilizáveis
```

### Layouts e partials

```
views/
├── layouts/
│   └── main.ejs               → layout principal (sidebar + header)
└── partials/
    ├── sidebar.ejs            → menu lateral
    ├── header.ejs             → cabeçalho
    ├── flash.ejs              → mensagens de sucesso/erro
    └── pagination.ejs         → paginação genérica
```

---

## Padrões de Código

### Routes (`routes/`)

```js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const controller = require('../controllers/moduloController');

router.use(isAuthenticated);

router.get('/', controller.index);
router.get('/novo', controller.novo);
router.post('/', controller.criar);
router.get('/:id', controller.show);
router.get('/:id/editar', controller.editar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.deletar);

module.exports = router;
```

### Controllers (`controllers/`)

```js
const Model = require('../models/Modulo');

exports.index = async (req, res) => {
  try {
    const dados = await Model.findAll(req.query);
    res.render('modulo/index', { title: 'Módulo', dados });
  } catch (err) {
    next(err);
  }
};

exports.criar = async (req, res) => {
  try {
    await Model.create(req.body);
    req.flash('success', 'Registro criado com sucesso!');
    res.redirect('/modulo');
  } catch (err) {
    req.flash('error', 'Erro ao criar registro.');
    res.redirect('/modulo/novo');
  }
};
```

### Models (`models/`)

```js
const db = require('../config/database');

exports.findAll = async (filters = {}) => {
  const [rows] = await db.query('SELECT * FROM tabela WHERE ativo = TRUE');
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM tabela WHERE id = ?', [id]);
  return rows[0];
};

exports.create = async (data) => {
  const [result] = await db.query('INSERT INTO tabela SET ?', [data]);
  return result.insertId;
};

exports.update = async (id, data) => {
  await db.query('UPDATE tabela SET ? WHERE id = ?', [data, id]);
};

exports.delete = async (id) => {
  await db.query('DELETE FROM tabela WHERE id = ?', [id]);
};
```

### Views (EJS)

```ejs
<%- include('../layouts/main', { body: __body }) %>
```

Variáveis disponíveis em todas as views (via `res.locals`):
- `currentUser` — usuário autenticado (`{ id, nome, email, role }`)
- `academia` — dados da academia (`{ nome, logo_path, ... }`)
- `success_msg` — array de mensagens de sucesso (flash)
- `error_msg` — array de mensagens de erro (flash)
- `warning_msg` — array de mensagens de aviso (flash)

---

## Middleware

### `isAuthenticated`

Redireciona para `/login` se não houver sessão ativa.

```js
module.exports = (req, res, next) => {
  if (req.session && req.session.user) return next();
  req.flash('error', 'Faça login para continuar.');
  res.redirect('/login');
};
```

### `isAdmin`

Bloqueia acesso a rotas exclusivas de admin.

```js
module.exports = (req, res, next) => {
  if (req.session.user?.role === 'admin') return next();
  req.flash('error', 'Acesso restrito.');
  res.redirect('/dashboard');
};
```

---

## Upload de Arquivos

Arquivos enviados são salvos em `public/uploads/` e servidos como assets estáticos.

- **Fotos de alunos:** `public/uploads/alunos/<id>_<timestamp>.jpg`
- **Logo da academia:** `public/uploads/logo/<timestamp>.jpg`

Configuração do Multer está em `middleware/upload.js`.

---

## Formatação de Dados

Helpers disponíveis em `utils/formatters.js`:

```js
formatarMoeda(1500)           // → "R$ 1.500,00"
formatarData('2025-01-15')    // → "15/01/2025"
calcularIdade('1995-03-15')   // → 30
```

---

## Segurança

- Senhas armazenadas com bcrypt (salt rounds: 10)
- Sessões com `express-session` + cookie `httpOnly`
- IDs validados com `express-validator` antes de queries
- Queries parametrizadas (sem concatenação de string SQL)
- Upload limitado a tipos MIME de imagem

---

## Banco de Dados

### Resetar e repopular

```bash
# Recria todas as tabelas (DROP + CREATE)
npm run migrate

# Popula com dados demo
npm run seed
```

### Conexão manual

```bash
mysql -u root -p dojo_manager
```
