const jwt = require('jsonwebtoken');
const {
  AvaliadorExame, AvaliacaoAluno, RespostaCriterio,
  FaseExame, CriterioExame, CriterioExameFaixa,
  ExameParticipante, Usuario, Faixa, Exame,
} = require('../models');
const { calcularNotaFase } = require('../utils/notaExame');

// POST /api/avaliacao-publica/exames/:exame_id/login
const login = async (req, res) => {
  try {
    const { pin } = req.body;
    const avaliador = await AvaliadorExame.findOne({
      where: { exame_id: req.params.exame_id, pin, ativo: true },
    });
    if (!avaliador) return res.status(401).json({ erro: 'PIN inválido' });

    const exame = await Exame.findByPk(avaliador.exame_id);

    const token = jwt.sign(
      { tipo: 'avaliador', avaliador_id: avaliador.id, exame_id: avaliador.exame_id, escola_id: avaliador.escola_id },
      process.env.JWT_SECRET || 'seu_secret_key',
      { expiresIn: '12h' }
    );

    res.json({
      token,
      avaliador: { id: avaliador.id, nome: avaliador.nome },
      exame: { id: exame.id, nome: exame.nome, data: exame.data, status: exame.status },
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/avaliacao-publica/minhas-avaliacoes
const minhasAvaliacoes = async (req, res) => {
  try {
    const avaliacoes = await AvaliacaoAluno.findAll({
      where: { avaliador_id: req.avaliador.id },
      include: [
        { model: FaseExame, attributes: ['id', 'nome', 'ordem'] },
        {
          model: ExameParticipante,
          include: [
            { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
            { model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor'] },
          ],
        },
      ],
      order: [[FaseExame, 'ordem', 'ASC']],
    });

    res.json(avaliacoes.map((a) => ({
      id: a.id,
      status: a.status,
      nota: a.nota,
      fase: a.FaseExame,
      aluno: a.ExameParticipante.Aluno,
      faixa_pretendida: a.ExameParticipante.FaixaPretendida,
    })));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const buscarAvaliacaoDoAvaliador = (avaliacaoId, avaliadorId) => AvaliacaoAluno.findOne({
  where: { id: avaliacaoId, avaliador_id: avaliadorId },
  include: [
    { model: FaseExame, include: [{ model: CriterioExame, include: [CriterioExameFaixa] }] },
    { model: ExameParticipante, include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] }, { model: Faixa, as: 'FaixaPretendida' }] },
    { model: RespostaCriterio },
  ],
});

// GET /api/avaliacao-publica/avaliacoes/:id
const detalharAvaliacao = async (req, res) => {
  try {
    const avaliacao = await buscarAvaliacaoDoAvaliador(req.params.id, req.avaliador.id);
    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada' });

    if (avaliacao.status === 'pendente') await avaliacao.update({ status: 'em_andamento' });

    const faixaPretendidaId = avaliacao.ExameParticipante.faixa_pretendida_id;
    const respostasPorCriterio = Object.fromEntries(
      avaliacao.RespostaCriterios.map((r) => [r.criterio_exame_id, r.conceito])
    );

    res.json({
      id: avaliacao.id,
      status: avaliacao.status,
      fase: { id: avaliacao.FaseExame.id, nome: avaliacao.FaseExame.nome },
      aluno: avaliacao.ExameParticipante.Aluno,
      faixa_pretendida: avaliacao.ExameParticipante.FaixaPretendida,
      criterios: avaliacao.FaseExame.CriterioExames
        .sort((a, b) => a.ordem - b.ordem)
        .map((c) => {
          const aplicavel = c.CriterioExameFaixas.map((f) => f.faixa_id).includes(faixaPretendidaId);
          return {
            id: c.id,
            nome: c.nome,
            aplicavel,
            conceito: aplicavel ? (respostasPorCriterio[c.id] || null) : null,
          };
        }),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// PUT /api/avaliacao-publica/avaliacoes/:id/criterios/:criterio_id
const responderCriterio = async (req, res) => {
  try {
    const avaliacao = await AvaliacaoAluno.findOne({ where: { id: req.params.id, avaliador_id: req.avaliador.id } });
    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    if (avaliacao.status === 'finalizada') return res.status(400).json({ erro: 'Avaliação já finalizada — peça pro professor reabrir' });

    const { conceito } = req.body;
    if (!['+', '+-', '-'].includes(conceito)) return res.status(400).json({ erro: 'Conceito inválido' });

    const criterio = await CriterioExame.findOne({ where: { id: req.params.criterio_id, fase_exame_id: avaliacao.fase_exame_id } });
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado nesta fase' });

    const [resposta] = await RespostaCriterio.findOrCreate({
      where: { avaliacao_id: avaliacao.id, criterio_exame_id: criterio.id },
      defaults: { conceito },
    });
    if (resposta.conceito !== conceito) await resposta.update({ conceito });

    if (avaliacao.status === 'pendente') await avaliacao.update({ status: 'em_andamento' });

    res.json(resposta);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/avaliacao-publica/avaliacoes/:id/finalizar
const finalizar = async (req, res) => {
  try {
    const avaliacao = await buscarAvaliacaoDoAvaliador(req.params.id, req.avaliador.id);
    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    if (avaliacao.status === 'finalizada') return res.status(400).json({ erro: 'Avaliação já finalizada' });

    const faixaPretendidaId = avaliacao.ExameParticipante.faixa_pretendida_id;
    const criterios = avaliacao.FaseExame.CriterioExames.map((c) => ({
      id: c.id,
      faixa_ids: c.CriterioExameFaixas.map((f) => f.faixa_id),
    }));
    const respostasPorCriterio = Object.fromEntries(
      avaliacao.RespostaCriterios.map((r) => [r.criterio_exame_id, r.conceito])
    );

    const nota = calcularNotaFase(criterios, respostasPorCriterio, faixaPretendidaId);
    if (nota === null) return res.status(400).json({ erro: 'Responda todos os critérios aplicáveis antes de finalizar' });

    await avaliacao.update({ status: 'finalizada', nota, finalizada_em: new Date() });
    res.json({ id: avaliacao.id, status: 'finalizada', nota });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { login, minhasAvaliacoes, detalharAvaliacao, responderCriterio, finalizar };
