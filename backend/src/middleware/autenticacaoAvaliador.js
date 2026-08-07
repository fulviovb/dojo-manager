const jwt = require('jsonwebtoken');

// Paralelo a middleware/autenticacao.js, mas pro login descartável do
// avaliador do Módulo de Exame de Faixa (PIN, sem Usuario/bcrypt) — token
// de escopo restrito a um único exame, `tipo: 'avaliador'` evita que ele
// seja aceito por engano nas rotas de staff.
const autenticarAvaliador = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ erro: 'Token não fornecido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_secret_key');
    if (decoded.tipo !== 'avaliador') return res.status(401).json({ erro: 'Token inválido' });

    req.avaliador = {
      id: decoded.avaliador_id,
      exame_id: decoded.exame_id,
      escola_id: decoded.escola_id,
    };

    next();
  } catch (erro) {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};

module.exports = { autenticarAvaliador };
