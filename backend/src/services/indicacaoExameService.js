const { Op } = require('sequelize');
const {
  IndicacaoExame, GraduacaoAluno, Faixa, Usuario, MatriculaAluno, Turma, Exame, ExameParticipante,
} = require('../models');
const { dataLocalISO } = require('../utils/data');

const STATUS_ABERTO = ['planejamento', 'em_andamento'];

// Erro de regra de negócio com status HTTP — os controllers traduzem com
// `responderErro`; qualquer outro erro vira 500.
class ErroRegra extends Error {
  constructor(status, mensagem, extra = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

const responderErro = (res, e) => {
  if (e instanceof ErroRegra) return res.status(e.status).json({ erro: e.message, ...e.extra });
  console.error(e);
  return res.status(500).json({ erro: 'Erro interno' });
};

// Ids dos alunos que o usuário pode gerenciar naquela arte. null = todos
// (admin). professor: matrícula ativa em turma da arte em que é professor_id.
const alunosPermitidos = async (usuario, arte_marcial_id) => {
  if (usuario.role === 'admin') return null;
  if (usuario.role !== 'professor') return new Set();
  const ms = await MatriculaAluno.findAll({
    where: { ativa: true },
    attributes: ['aluno_id'],
    include: [{
      model: Turma, attributes: [],
      where: { escola_id: usuario.escola_id, arte_marcial_id, professor_id: usuario.id },
    }],
  });
  return new Set(ms.map((m) => m.aluno_id));
};

const podeGerenciar = async (usuario, aluno_id, arte_marcial_id) => {
  const ids = await alunosPermitidos(usuario, arte_marcial_id);
  return !ids || ids.has(aluno_id);
};

// Faixas possíveis pra quem está em `ordemAtual` (null = sem graduação):
// a seguinte; se ela for opcional, também as opcionais logo em seguida e a
// primeira não-opcional (Branca → Branca/Cinza, Cinza ou Azul).
const opcoesDeFaixa = (faixasOrdenadas, ordemAtual) => {
  const seguintes = ordemAtual == null ? faixasOrdenadas : faixasOrdenadas.filter((f) => f.ordem > ordemAtual);
  const opcoes = [];
  for (const f of seguintes) {
    opcoes.push(f);
    if (!f.opcional) break;
  }
  return opcoes;
};

const resumoFaixa = (f) => (f ? { id: f.id, nome: f.nome, cor: f.cor, ordem: f.ordem, opcional: f.opcional } : null);

// Devolve a indicação aberta do aluno na arte, criando se não houver.
// Permissão e existência do aluno são checadas por quem chama.
const obterOuCriarIndicacao = async ({
  escola_id, aluno_id, arte_marcial_id, faixa_pretendida_id, indicado_por_id,
}, { transaction } = {}) => {
  // trava a linha do aluno: duas indicações simultâneas não duplicam
  if (transaction) await Usuario.findByPk(aluno_id, { attributes: ['id'], transaction, lock: transaction.LOCK.UPDATE });
  const existente = await IndicacaoExame.findOne({
    where: { escola_id, aluno_id, arte_marcial_id, status: 'indicado' }, transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (existente) return { indicacao: existente, criada: false };

  const atual = await GraduacaoAluno.findOne({
    where: { escola_id, aluno_id, arte_marcial_id, atual: true },
    include: [{ model: Faixa, attributes: ['id', 'ordem'] }], transaction,
  });
  const faixas = await Faixa.findAll({ where: { arte_marcial_id }, order: [['ordem', 'ASC']], transaction });
  const opcoes = opcoesDeFaixa(faixas, atual?.Faixa ? atual.Faixa.ordem : null);
  if (!opcoes.length) throw new ErroRegra(400, 'O aluno já está na última faixa desta arte marcial');

  let pretendida = opcoes[0];
  if (opcoes.length > 1) {
    pretendida = opcoes.find((f) => f.id === faixa_pretendida_id);
    if (!pretendida) {
      throw new ErroRegra(409, 'Escolha a faixa pretendida', { escolher_faixa: true, opcoes: opcoes.map(resumoFaixa) });
    }
  }

  const indicacao = await IndicacaoExame.create({
    escola_id, aluno_id, arte_marcial_id,
    faixa_atual_id: atual?.faixa_id || null,
    faixa_pretendida_id: pretendida.id,
    status: 'indicado',
    data_indicacao: dataLocalISO(),
    indicado_por_id,
  }, { transaction });
  return { indicacao, criada: true };
};

// Candidato (não desistente) de exame ABERTO ligado a essa indicação, ou null.
const candidatoEmExameAberto = (indicacao_exame_id, { exceto_exame_id, transaction } = {}) => ExameParticipante.findOne({
  where: {
    indicacao_exame_id,
    status_inscricao: { [Op.ne]: 'desistiu' },
    ...(exceto_exame_id ? { exame_id: { [Op.ne]: exceto_exame_id } } : {}),
  },
  include: [{ model: Exame, where: { status: STATUS_ABERTO, tipo: 'normal' } }],
  transaction,
});

module.exports = {
  ErroRegra, responderErro, STATUS_ABERTO, alunosPermitidos, podeGerenciar,
  opcoesDeFaixa, resumoFaixa, obterOuCriarIndicacao, candidatoEmExameAberto,
};
