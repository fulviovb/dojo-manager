// Middleware de autenticação - protege rotas que exigem login

// Verifica se o usuário está autenticado
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    // Disponibilizar dados do usuário para as views
    res.locals.currentUser = req.session.user;
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

// Verifica se o usuário tem role de admin
function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).render('errors/403', {
    title: 'Acesso Negado',
    layout: false
  });
}

// Verifica se o usuário tem role de admin ou secretaria
function isAdminOrSecretaria(req, res, next) {
  if (req.session && req.session.user &&
    (req.session.user.role === 'admin' || req.session.user.role === 'secretaria')) {
    return next();
  }
  res.status(403).render('errors/403', {
    title: 'Acesso Negado',
    layout: false
  });
}

module.exports = { isAuthenticated, isAdmin, isAdminOrSecretaria };
