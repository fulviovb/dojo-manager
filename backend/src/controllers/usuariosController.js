const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Usuario, MatriculaAluno, Turma, ArteMarcial, Faixa,
        GraduacaoAluno, Ocorrencia, Chamada, Aula,
        Mensalidade, PlanoMensalidade, AssinaturaAluno, CriterioGraduacao } = require('../models');
const { gerarFaturasPendentes } = require('../services/faturaService');

const PASTA_FOTOS = path.join(__dirname, '..', '..', 'uploads', 'fotos');
fs.mkdirSync(PASTA_FOTOS, { recursive: true });

const uploadFotoMiddleware = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PASTA_FOTOS),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Formato de imagem não suportado (use JPEG, PNG ou WEBP)'));
    }
    cb(null, true);
  },
  limits: { fileSize: 3 * 1024 * 1024 },
}).single('foto');

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
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      where: { id: req.params.id, escola_id: req.usuario.escola_id },
      attributes: { exclude: ['senha_hash'] },
    });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(usuario);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const CAMPOS_ALUNO = [
  'nome', 'email', 'role', 'data_nascimento', 'telefone',
  'apelido', 'cpf', 'rg', 'data_ingresso', 'endereco', 'bairro',
  'cep', 'cidade', 'estado', 'mae', 'pai', 'observacoes',
  'genero', 'naturalidade', 'profissao', 'matricula', 'foto_url',
];

// Campos DATEONLY não aceitam string vazia (o formulário manda '' quando o
// campo fica em branco) — o MySQL rejeita com erro genérico. CPF tem o
// mesmo problema por outro motivo: '' colidiria com outros cadastros em
// branco no índice único, então também vira NULL (índice único permite
// vários NULL, mas não várias strings vazias iguais).
const CAMPOS_VAZIO_VIRA_NULL = ['data_nascimento', 'data_ingresso', 'cpf'];
const normalizarCamposVazios = (obj) => {
  for (const campo of CAMPOS_VAZIO_VIRA_NULL) if (obj[campo] === '') obj[campo] = null;
  return obj;
};

// E-mail só precisa ser único entre quem realmente loga no sistema
// (admin/professor) — alunos menores costumam compartilhar o e-mail dos
// pais entre irmãos, e isso não é mais bloqueado no schema (ver model
// Usuario.js e o script de migração 2026-08-cpf-unico.js).
const ROLES_COM_LOGIN = ['admin', 'professor'];
const validarEmailUnicoSeNecessario = async (role, email, escola_id, idExcluir) => {
  if (!ROLES_COM_LOGIN.includes(role)) return null;
  const where = { email, escola_id };
  if (idExcluir) where.id = { [Op.ne]: idExcluir };
  const existente = await Usuario.findOne({ where });
  return existente ? 'E-mail já cadastrado' : null;
};

const MENSAGEM_POR_CAMPO_UNICO = { cpf: 'CPF já cadastrado', email: 'E-mail já cadastrado' };
const mensagemDeErroUnico = (e) => {
  if (e.name !== 'SequelizeUniqueConstraintError') return null;
  const campo = e.fields ? Object.keys(e.fields)[0] : e.errors?.[0]?.path;
  return MENSAGEM_POR_CAMPO_UNICO[campo] || 'Registro duplicado';
};

const criar = async (req, res) => {
  try {
    const { senha, ...campos } = req.body;
    if (!senha) return res.status(400).json({ erro: 'Senha é obrigatória' });
    const payload = { escola_id: req.usuario.escola_id };
    for (const k of CAMPOS_ALUNO) if (campos[k] !== undefined) payload[k] = campos[k];
    normalizarCamposVazios(payload);

    const erroEmail = await validarEmailUnicoSeNecessario(payload.role, payload.email, payload.escola_id);
    if (erroEmail) return res.status(409).json({ erro: erroEmail });

    payload.senha_hash = await bcrypt.hash(senha, 10);
    const usuario = await Usuario.create(payload);
    const { senha_hash: _, ...dados } = usuario.toJSON();
    res.status(201).json(dados);
  } catch (e) {
    const msg = mensagemDeErroUnico(e);
    if (msg) return res.status(409).json({ erro: msg });
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
};

const atualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    const { senha, ...resto } = req.body;
    normalizarCamposVazios(resto);

    if (resto.email !== undefined) {
      const roleFinal = resto.role || usuario.role;
      const erroEmail = await validarEmailUnicoSeNecessario(roleFinal, resto.email, req.usuario.escola_id, usuario.id);
      if (erroEmail) return res.status(409).json({ erro: erroEmail });
    }

    if (senha) resto.senha_hash = await bcrypt.hash(senha, 10);
    await usuario.update(resto);
    const { senha_hash: _, ...dados } = usuario.toJSON();
    res.json(dados);
  } catch (e) {
    const msg = mensagemDeErroUnico(e);
    if (msg) return res.status(409).json({ erro: msg });
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
};

const desativar = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    await usuario.update({ ativo: false });
    res.json({ mensagem: 'Usuário desativado' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/usuarios/:id/foto (multipart, campo "foto")
const enviarFoto = async (req, res) => {
  uploadFotoMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload da foto' });
    try {
      const usuario = await Usuario.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
      if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
      if (!req.file) return res.status(400).json({ erro: 'Arquivo de foto é obrigatório' });

      const fotoAnterior = usuario.foto_url;
      const foto_url = `/uploads/fotos/${req.file.filename}`;
      await usuario.update({ foto_url });

      if (fotoAnterior?.startsWith('/uploads/fotos/')) {
        fs.unlink(path.join(PASTA_FOTOS, path.basename(fotoAnterior)), () => {});
      }

      res.json({ foto_url });
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
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

    // Histórico de frequência = presenças (Chamada) + ausências. Ausência é
    // qualquer aula FECHADA das turmas em que o aluno está matriculado, sem
    // chamada dele, a partir da data em que se matriculou naquela turma
    // (aula aberta ainda não teve chamada encerrada pelo professor, não
    // conta como falta — mesmo critério de dashboardController.semaforo).
    const dataMatriculaPorTurma = new Map(matriculas.map((m) => [m.turma_id, m.data_matricula]));
    const turmaIds = [...dataMatriculaPorTurma.keys()];

    const aulasDasTurmas = turmaIds.length
      ? await Aula.findAll({
          where: { turma_id: { [Op.in]: turmaIds }, status: 'fechada' },
          attributes: ['id', 'data', 'hora_inicio', 'turma_id'],
          include: [{ model: Turma, attributes: ['id', 'nome'] }],
          order: [['data', 'DESC']],
        })
      : [];

    const chamadaPorAula = new Map(chamadas.map((c) => [c.aula_id, c]));
    const frequencia = aulasDasTurmas
      .filter((a) => {
        // Presença é fato consumado — mostra sempre, mesmo se a aula for
        // anterior à data_matricula atual (ex: matrícula foi recriada depois
        // de uma pausa). O filtro de data só evita inventar uma FALTA antes
        // do aluno estar matriculado.
        if (chamadaPorAula.has(a.id)) return true;
        return a.data >= dataMatriculaPorTurma.get(a.turma_id);
      })
      .map((a) => {
        const chamada = chamadaPorAula.get(a.id);
        return {
          aula_id: a.id,
          data: a.data,
          hora_inicio: a.hora_inicio,
          turma: a.Turma?.nome,
          presente: !!chamada,
          origem: chamada?.origem || null,
        };
      });

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
      frequencia,
      mensalidades: mensalidades.map(m => m.toJSON()),
      ocorrencias: ocorrencias.map(o => o.toJSON()),
      assinaturas: assinaturas.map(a => a.toJSON()),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, buscar, criar, atualizar, desativar, perfil, enviarFoto };
