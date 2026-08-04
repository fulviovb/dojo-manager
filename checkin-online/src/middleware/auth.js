// Protege só as rotas /sync/* (chamadas pelo sistema local). O check-in
// público (/checkin/*) continua sem autenticação, igual hoje — o aluno não
// tem login nenhum.
function autenticarSync(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || token !== process.env.API_KEY) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  next();
}

module.exports = { autenticarSync };
