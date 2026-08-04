require('dotenv').config();
const express = require('express');
const { autenticarSync } = require('./middleware/auth');
const checkinRoutes = require('./routes/checkin');
const syncRoutes = require('./routes/sync');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/checkin', checkinRoutes);           // público — o aluno não tem login
app.use('/sync', autenticarSync, syncRoutes);  // só o sistema local, com API key

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✓ checkin-online rodando em http://localhost:${PORT}`);
  if (!process.env.API_KEY) {
    console.warn('⚠ API_KEY não definida — /sync/* vai rejeitar tudo. Configure no .env.');
  }
});
