const bcrypt = require('bcryptjs');
const { Usuario, MatriculaAluno, Turma, ArteMarcial, Faixa,
        GraduacaoAluno, Ocorrencia, Chamada, Aula,
        Mensalidade, PlanoMensalidade, AssinaturaAluno, CriterioGraduacao } = require('../models');
const { gerarFaturasPendentes } = require('../services/faturaService');

const listar = async (req, res) => {
  try {
    const { role, ativo } = req.query;
    const where = { escola_id: req.usuario.escola_id };
    if (ativo !== 'todos') where.ativo = ativo === 'false' ? false : true;
    if (role) where.role = role;
    const usuarios = await Usuario.findAll({
      where,
      attributes: { exclude: ['senha_hash'] },
      order: [['nome', 'ASC']],
    });
    res.json(usuarios);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      where: { id: req.params.id, escola_id: req.usuario.escola_id },
      attributes: { exclude: ['senha_hash'] },
    });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(usuario);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const CAMPOS_ALUNO = [
  'nome', 'email', 'role', 'data_nascimento', 'telefone',
  'apelido', 'cpf', 'rg', 'data_ingresso', 'endereco', 'bairro',
  'cep', 'cidade', 'estado', 'mae', 'pai', 'observacoes',
  'genero', 'naturalidade', 'profissao', 'matricula',
];

const criar = async (req, res) => {
  try {
    const { senha, ...campos } = req.body;
    if (!senha) return res.status(400).json({ erro: 'Senha é obrigatória' });
    const senha_hash = await bcrypt.hash(senha, 10);
    const payload = { escola_id: req.usuario.escola_id, senha_hash };
    for (const k of CAMPOS_ALUNO) if (campos[k] !== undefined) payload[k] = campos[k];
    const usuario = await Usuario.create(payload);
    const { senha_hash: _, ...dados } = usuario.toJSON();
    res.status(201).json(dados);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ erro: 'E-mail já cadastrado' });
    res.status(500).json({ erro: 'Erro interno' });
  }
};

const atualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    const { senha, ...resto } = req.body;
    if (senha) resto.senha_hash = await bcrypt.hash(senha, 10);
    await usuario.update(resto);
    const { senha_hash: _, ...dados } = usuario.toJSON();
    res.json(dados);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const desativar = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    await usuario.update({ ativo: false });
    res.json({ mensagem: 'Usuário desativado' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const perfil = async (req, res) => {
  try {
    const aluno = await Usuario.findOne({
      where: { id: req.params.id, escola_id: req.usuario.escola_id },
      attributes: { exclude: ['senha_hash'] },
    });
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    await gerarFaturasPendentes(req.usuario.escola_id);

    const [artes, matriculas, graduacoes, chamadas, mensalidades, ocorrencias, criterios, assinaturas] = await Promise.all([
      ArteMarcial.findAll({ where: { escola_id: req.usuario.escola_id }, order: [['nome', 'ASC']] }),

      MatriculaAluno.findAll({
        where: { aluno_id: aluno.id, ativa: true },
        include: [
          { model: Turma, include: [{ model: ArteMarcial, attributes: ['id', 'nome'] }] },
          { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor', 'ordem'] },
        ],
      }),

      GraduacaoAluno.findAll({
        where: { aluno_id: aluno.id },
        include: [
          { model: Faixa, attributes: ['id', 'nome', 'cor', 'ordem'] },
          { model: ArteMarcial, attributes: ['id', 'nome'] },
        ],
        order: [['data_inicio', 'ASC']],
      }),

      Chamada.findAll({
        where: { aluno_id: aluno.id },
        include: [{
          model: Aula,
          attributes: ['id', 'data', 'hora_inicio', 'turma_id'],
          include: [{ model: Turma, attributes: ['id', 'nome', 'arte_marcial_id'] }],
        }],
        order: [[{ model: Aula }, 'data', 'DESC']],
      }),

      Mensalidade.findAll({
        where: { aluno_id: aluno.id },
        include: [{ model: PlanoMensalidade, as: 'Plano', attributes: ['id', 'nome', 'valor'] }],
        order: [['mes_referencia', 'DESC']],
      }),

      Ocorrencia.findAll({
        where: { aluno_id: aluno.id, escola_id: req.usuario.escola_id },
        include: [{ model: Usuario, as: 'Professor', attributes: ['id', 'nome'] }],
        order: [['created_at', 'DESC']],
      }),

      CriterioGraduacao.findAll({ where: { escola_id: req.usuario.escola_id } }),

      AssinaturaAluno.findAll({
        where: { aluno_id: aluno.id },
        include: [{ model: PlanoMensalidade, as: 'Plano', attributes: ['id', 'nome', 'valor', 'periodicidade'] }],
        order: [['status', 'ASC'], ['created_at', 'DESC']],
      }),
    ]);

    // Agrupa graduações por arte marcial. Cada item do histórico (incluindo a
    // atual) traz `aulas_presentes` = quantas chamadas o aluno tem NAQUELA
    // graduação especificamente (entre data_inicio e data_fim, ou até hoje
    // se ainda for a atual), `min_aulas` = carência cadastrada pra faixa (se
    // houver) e `percentual_carencia` = quanto disso já foi cumprido — é
    // isso que embasa a decisão de deixar o aluno prestar exame ou não.
    const dadosGraduacao = artes.map(arte => {
      const historico = graduacoes.filter(g => g.arte_marcial_id === arte.id);

      const historicoComPresencas = historico.map(h => {
        const presentes = h.data_inicio
          ? chamadas.filter(c =>
              c.Aula?.Turma?.arte_marcial_id === arte.id &&
              c.Aula?.data >= h.data_inicio &&
              (!h.data_fim || c.Aula?.data <= h.data_fim)
            ).length
          : 0;

        const criterio = criterios.find(c => c.arte_marcial_id === arte.id && c.faixa_id === h.faixa_id);
        const minAulas = criterio ? criterio.min_aulas : null;
        const percentualCarencia = minAulas ? Math.min(100, Math.round((presentes / minAulas) * 100)) : null;

        return { ...h.toJSON(), aulas_presentes: presentes, min_aulas: minAulas, percentual_carencia: percentualCarencia };
      });

      const atual = historicoComPresencas.find(h => h.atual) || null;
      const aulasDesdeGraduacao = atual ? atual.aulas_presentes : 0;

      return { arte: arte.toJSON(), atual, historico: historicoComPresencas, aulasDesdeGraduacao };
    });

    res.json({
      aluno: aluno.toJSON(),
      graduacoes: dadosGraduacao,
      matriculas: matriculas.map(m => m.toJSON()),
      chamadas: chamadas.map(c => c.toJSON()),
      mensalidades: mensalidades.map(m => m.toJSON()),
      ocorrencias: ocorrencias.map(o => o.toJSON()),
      assinaturas: assinaturas.map(a => a.toJSON()),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, buscar, criar, atualizar, desativar, perfil };
