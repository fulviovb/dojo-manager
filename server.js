// DojoManager - Servidor Principal
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar EJS como template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Configurar sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'dojo_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000 // 8 horas
  }
}));

// Flash messages
app.use(flash());

// Variáveis globais para as views
app.use(async (req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.warning_msg = req.flash('warning');
  res.locals.currentUser = req.session.user || null;

  // Carregar dados da academia para o layout
  if (req.session.user) {
    try {
      const db = require('./config/database');
      const [rows] = await db.query('SELECT * FROM academia LIMIT 1');
      res.locals.academia = rows[0] || null;
    } catch (e) {
      res.locals.academia = null;
    }
  }
  next();
});

// Importar rotas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const alunosRoutes = require('./routes/alunos');
const modalidadesRoutes = require('./routes/modalidades');
const graduacoesRoutes = require('./routes/graduacoes');
const locaisRoutes = require('./routes/locais');
const turmasRoutes = require('./routes/turmas');
const aulasRoutes = require('./routes/aulas');
const frequenciaRoutes = require('./routes/frequencia');
const planosRoutes = require('./routes/planos');
const faturasRoutes = require('./routes/faturas');
const contasPagarRoutes = require('./routes/contasPagar');
const contasReceberRoutes = require('./routes/contasReceber');
const examesRoutes = require('./routes/exames');
const campeonatosRoutes = require('./routes/campeonatos');
const relatoriosRoutes = require('./routes/relatorios');
const configuracoesRoutes = require('./routes/configuracoes');

// Usar rotas
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/alunos', alunosRoutes);
app.use('/modalidades', modalidadesRoutes);
app.use('/graduacoes', graduacoesRoutes);
app.use('/locais', locaisRoutes);
app.use('/turmas', turmasRoutes);
app.use('/aulas', aulasRoutes);
app.use('/frequencia', frequenciaRoutes);
app.use('/planos', planosRoutes);
app.use('/faturas', faturasRoutes);
app.use('/contas-pagar', contasPagarRoutes);
app.use('/contas-receber', contasReceberRoutes);
app.use('/exames', examesRoutes);
app.use('/campeonatos', campeonatosRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/configuracoes', configuracoesRoutes);

// Rota raiz redireciona para dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Página 404
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: 'Página não encontrada'
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).render('errors/500', {
    title: 'Erro interno',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🥋 DojoManager rodando em http://localhost:${PORT}`);
  console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
