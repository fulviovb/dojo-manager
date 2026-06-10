# DojoManager 🥋

Sistema de Gestão para Academias de Artes Marciais — controle completo de alunos, turmas, graduações, frequência e financeiro.

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Alunos** | Cadastro completo com foto, responsável para menores, histórico de graduações |
| **Modalidades & Graduações** | Configuração de artes marciais e sistema de faixas/graduações por modalidade |
| **Turmas & Aulas** | Gerenciamento de turmas, horários, locais de treino e registro de aulas |
| **Frequência** | Controle de presença por aula com justificativas de falta |
| **Planos & Assinaturas** | Planos mensais/trimestrais/semestrais/anuais com descontos individuais |
| **Financeiro** | Faturas, contas a pagar, contas a receber e fluxo de caixa |
| **Exames de Faixa** | Agendamento, candidatos e resultados de exames de graduação |
| **Campeonatos** | Inscrição de alunos e registro de resultados em competições |
| **Relatórios** | Relatórios financeiros, de frequência e desempenho |
| **Configurações** | Dados da academia, logo e preferências do sistema |

## Tecnologias

- **Backend:** Node.js 18+ · Express 5
- **Banco de Dados:** MySQL 8+
- **Templates:** EJS 5
- **Autenticação:** express-session + bcryptjs
- **Upload de arquivos:** Multer
- **Geração de PDF:** PDFKit
- **Validação:** express-validator

## Pré-requisitos

- Node.js 18 ou superior
- MySQL 8 ou superior
- npm 9 ou superior

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/fulviovb/dojo-manager.git
cd dojo-manager
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e ajuste as configurações:

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=dojo_manager

SESSION_SECRET=sua_chave_secreta_longa_e_aleatoria
```

### 4. Execute a migração do banco de dados

```bash
npm run migrate
```

Isso cria o banco `dojo_manager` e todas as tabelas necessárias.

### 5. (Opcional) Popule com dados de demonstração

```bash
npm run seed
```

Cria dados demo incluindo:
- Usuário admin: `admin@dojo.com` / `admin123`
- 4 modalidades (Jiu-Jitsu, Karatê, Muay Thai, Judô)
- 8 alunos, 5 turmas, planos e histórico financeiro

### 6. Inicie o servidor

```bash
# Produção
npm start

# Desenvolvimento (com hot reload)
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## Estrutura do Projeto

```
dojo-manager/
├── config/
│   └── database.js          # Pool de conexão MySQL
├── controllers/             # Lógica de negócio por módulo
├── middleware/              # Auth, validação, upload
├── migrations/
│   └── create_tables.js     # Script de criação das tabelas
├── models/                  # Queries e acesso ao banco
├── public/
│   ├── css/                 # Estilos
│   ├── js/                  # Scripts front-end
│   └── uploads/             # Arquivos enviados pelos usuários
├── routes/                  # Definição de rotas por módulo
├── seeds/
│   └── seed_initial.js      # Dados de demonstração
├── utils/                   # Helpers (formatação, PDF, etc.)
├── views/                   # Templates EJS
│   ├── alunos/
│   ├── aulas/
│   ├── auth/
│   ├── campeonatos/
│   ├── configuracoes/
│   ├── dashboard/
│   ├── errors/
│   ├── exames/
│   ├── financeiro/
│   ├── graduacoes/
│   ├── layouts/
│   ├── locais/
│   ├── partials/
│   ├── relatorios/
│   └── turmas/
├── .env.example
├── .gitignore
├── package.json
└── server.js                # Entry point
```

## Schema do Banco de Dados

```
academia              → dados da academia
usuarios              → usuários do sistema (admin, secretaria, instrutor)
alunos                → cadastro de alunos
modalidades           → artes marciais oferecidas
graduacoes            → faixas/graduações por modalidade
aluno_graduacao       → histórico de graduações do aluno
locais_treino         → locais/filiais de treino
turmas                → turmas por modalidade
turma_alunos          → matrícula de alunos em turmas
aulas                 → aulas agendadas/realizadas
frequencia            → presença por aula/aluno
planos                → planos de mensalidade
assinaturas           → assinaturas ativas por aluno
faturas               → cobranças mensais
contas_pagar          → despesas da academia
contas_receber        → receitas avulsas
exames_faixa          → exames de graduação
exame_faixa_candidatos → candidatos e resultados por exame
campeonatos           → competições
campeonato_participantes → inscrições e resultados
```

## Perfis de Acesso

| Perfil | Permissões |
|---|---|
| `admin` | Acesso total ao sistema |
| `secretaria` | Alunos, financeiro, turmas, frequência |
| `instrutor` | Turmas, aulas, frequência, alunos (leitura) |

## Scripts disponíveis

```bash
npm start         # Inicia em produção
npm run dev       # Inicia com nodemon (hot reload)
npm run migrate   # Cria/atualiza tabelas no banco
npm run seed      # Popula dados de demonstração
```

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta do servidor HTTP |
| `NODE_ENV` | `development` | Ambiente (`development` / `production`) |
| `DB_HOST` | `localhost` | Host do MySQL |
| `DB_PORT` | `3306` | Porta do MySQL |
| `DB_USER` | `root` | Usuário do MySQL |
| `DB_PASSWORD` | `root` | Senha do MySQL |
| `DB_NAME` | `dojo_manager` | Nome do banco de dados |
| `SESSION_SECRET` | — | Chave secreta para sessões (obrigatório em produção) |

## Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: adiciona minha feature'`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

## Licença

ISC — veja [LICENSE](LICENSE) para detalhes.
