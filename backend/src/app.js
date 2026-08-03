const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/api/health', (req, res) => res.json({ status: '✅ Servidor rodando' }));

// Auth
app.use('/api/auth', require('./routes/autenticacao'));

// Cadastros
app.use('/api/escolas', require('./routes/escolas'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/artes-marciais', require('./routes/artesMarciais'));
app.use('/api/faixas', require('./routes/faixas'));
app.use('/api/criterios-graduacao', require('./routes/criteriosGraduacao'));
app.use('/api/turmas', require('./routes/turmas'));
app.use('/api/salas', require('./routes/salas'));
app.use('/api/horarios', require('./routes/horarios'));

// Operacional
app.use('/api/aulas', require('./routes/aulas'));
app.use('/api/checkin', require('./routes/checkin'));   // público, sem JWT
app.use('/api/chamadas', require('./routes/chamadas'));
app.use('/api/matriculas', require('./routes/matriculas'));

// Financeiro
app.use('/api/planos', require('./routes/planos'));
app.use('/api/assinaturas', require('./routes/assinaturas'));
app.use('/api/mensalidades', require('./routes/mensalidades'));
app.use('/api/pagamentos', require('./routes/pagamentos'));
app.use('/api/financeiro', require('./routes/financeiro'));

// Graduações e Ocorrências
app.use('/api/graduacoes', require('./routes/graduacoes'));
app.use('/api/ocorrencias', require('./routes/ocorrencias'));

// Dashboard
app.use('/api/dashboard', require('./routes/dashboard'));

// Relatórios
app.use('/api/relatorios', require('./routes/relatorios'));

module.exports = app;
