// Configuração de conexão com o banco de dados MySQL
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'dojo_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Testar conexão
pool.getConnection()
  .then(conn => {
    console.log('✅ Conectado ao MySQL com sucesso!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao MySQL:', err.message);
  });

module.exports = pool;
