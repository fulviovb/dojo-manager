const app = require('./app');
const sequelize = require('./config/database');
require('./models/index'); // carrega todos os models e associações
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Banco de dados conectado');

    await sequelize.sync({ alter: false });
    console.log('✓ Models sincronizados');

    app.listen(PORT, () => {
      console.log(`✓ Server rodando em http://localhost:${PORT}`);
      console.log(`✓ API Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();
