const autorizarRole = (rolesPermitidos) => {
  return (req, res, next) => {
    const usuarioRole = req.usuario?.role;

    if (!usuarioRole || !rolesPermitidos.includes(usuarioRole)) {
      return res.status(403).json({
        erro: 'Acesso negado. Seu papel não tem permissão para esta ação.',
        roleAtual: usuarioRole,
        roleEsperado: rolesPermitidos,
      });
    }

    next();
  };
};

// Garante que o professor só acessa dados da sua própria escola
const autorizarEscola = (req, res, next) => {
  const escolaIdParam = req.params.escola_id || req.body.escola_id;
  if (req.usuario.role !== 'admin' && escolaIdParam && escolaIdParam !== req.usuario.escola_id) {
    return res.status(403).json({ erro: 'Acesso negado a esta escola.' });
  }
  next();
};

// Admin acessa qualquer turma; professor só acessa turmas onde é professor_id
const ehDonoDaTurma = (usuario, turma) => {
  if (!turma) return false;
  return usuario.role === 'admin' || turma.professor_id === usuario.id;
};

module.exports = { autorizarRole, autorizarEscola, ehDonoDaTurma };
