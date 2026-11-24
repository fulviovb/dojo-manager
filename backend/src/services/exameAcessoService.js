const { Exame, ExameParticipante, Turma, ExameHistorico } = require('../models');
const { ErroRegra, alunosPermitidos } = require('./indicacaoExameService');

// Artes em que o professor tem turma ativa (null = admin, todas)
const artesPermitidas = async (usuario) => {
  if (usuario.role === 'admin') return null;
  const ts = await Turma.findAll({
    where: { escola_id: usuario.escola_id, professor_id: usuario.id, ativa: true }, attributes: ['arte_marcial_id'],
  });
  return new Set(ts.map((t) => t.arte_marcial_id));
};

// Exame da escola que o usuário pode ver + alunos que ele pode gerenciar nele
// (permitidos: null = todos). Professor só vê exame de arte que ele dá aula.
const carregarExame = async (req, { transaction, lock } = {}) => {
  const exame = await Exame.findOne({
    where: { id: req.params.id, escola_id: req.usuario.escola_id },
    transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!exame) throw new ErroRegra(404, 'Exame não encontrado');
  const artes = await artesPermitidas(req.usuario);
  if (artes && !artes.has(exame.arte_marcial_id)) throw new ErroRegra(404, 'Exame não encontrado');
  return { exame, permitidos: await alunosPermitidos(req.usuario, exame.arte_marcial_id) };
};

// Ações no evento inteiro (taxa, status, excluir): professor só quando todos
// os candidatos são das turmas dele.
const exigirExameInteiro = async (exame, permitidos, { transaction } = {}) => {
  if (!permitidos) return;
  const ps = await ExameParticipante.findAll({ where: { exame_id: exame.id }, attributes: ['aluno_id'], transaction });
  if (ps.some((p) => !permitidos.has(p.aluno_id))) {
    throw new ErroRegra(403, 'Este exame tem alunos de outros professores: só o administrador pode fazer isso');
  }
};

const carregarCandidato = async (exame, permitidos, id, { transaction } = {}) => {
  const p = await ExameParticipante.findOne({
    where: { id, exame_id: exame.id }, transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!p) throw new ErroRegra(404, 'Candidato não encontrado');
  if (permitidos && !permitidos.has(p.aluno_id)) throw new ErroRegra(403, 'Sem permissão para este aluno');
  return p;
};

const historico = (req, exame, participante, tipo, descricao, { transaction } = {}) => ExameHistorico.create({
  escola_id: exame.escola_id, exame_id: exame.id, exame_participante_id: participante?.id || null,
  tipo, descricao: descricao.slice(0, 500), usuario_id: req.usuario.id,
}, { transaction });

module.exports = { artesPermitidas, carregarExame, exigirExameInteiro, carregarCandidato, historico };
