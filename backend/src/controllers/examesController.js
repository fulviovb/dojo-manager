const crypto = require('crypto');
const {
  Exame, FaseExame, CriterioExame, CriterioExameFaixa,
  FaseExameModelo, CriterioExameModelo, CriterioExameModeloFaixa,
  ExameParticipante, AvaliadorExame, AvaliacaoAluno, RespostaCriterio,
  ArteMarcial, Faixa, Usuario,
} = require('../models');
const { calcularNotaFinal } = require('../utils/notaExame');

const listar = async (req, res) => {
  try {
    const exames = await Exame.findAll({
      where: { escola_id: req.usuario.escola_id },
      include: [{ model: ArteMarcial, attributes: ['id', 'nome'] }],
      order: [['data', 'DESC']],
    });
    res.json(exames);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// Monta { id, nome, ordem, criterios: [{ id, nome, ordem, faixa_ids }] }
// a partir das FaseExame/CriterioExame já criadas (instância do exame).
const buscarFasesDoExame = async (exameId) => {
  const fases = await FaseExame.findAll({
    where: { exame_id: exameId },
    include: [{ model: CriterioExame, include: [{ model: CriterioExameFaixa, attributes: ['faixa_id'] }] }],
    order: [['ordem', 'ASC'], [CriterioExame, 'ordem', 'ASC']],
  });
  return fases.map((fase) => ({
    id: fase.id,
    nome: fase.nome,
    ordem: fase.ordem,
    criterios: fase.CriterioExames.map((c) => ({
      id: c.id,
      nome: c.nome,
      ordem: c.ordem,
      faixa_ids: c.CriterioExameFaixas.map((f) => f.faixa_id),
    })),
  }));
};

const detalhar = async (req, res) => {
  try {
    const exame = await Exame.findOne({
      where: { id: req.params.id, escola_id: req.usuario.escola_id },
      include: [{ model: ArteMarcial, attributes: ['id', 'nome'] }],
    });
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const fases = await buscarFasesDoExame(exame.id);

    const participantes = await ExameParticipante.findAll({
      where: { exame_id: exame.id },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor'] },
        { model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor'] },
      ],
    });

    const avaliadores = await AvaliadorExame.findAll({ where: { exame_id: exame.id } });

    const avaliacoes = await AvaliacaoAluno.findAll({
      where: { exame_id: exame.id },
      include: [
        { model: AvaliadorExame, as: 'Avaliador', attributes: ['id', 'nome'] },
      ],
    });

    res.json({
      ...exame.toJSON(),
      fases,
      participantes,
      avaliadores,
      avaliacoes,
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/exames — cria o exame e tira uma cópia (snapshot) do template
// ativo da arte marcial, pra editar o template depois não afetar exames em
// andamento.
const criar = async (req, res) => {
  try {
    const { arte_marcial_id, nome, data } = req.body;
    const arte = await ArteMarcial.findOne({ where: { id: arte_marcial_id, escola_id: req.usuario.escola_id } });
    if (!arte) return res.status(404).json({ erro: 'Arte marcial não encontrada' });

    const exame = await Exame.create({
      escola_id: req.usuario.escola_id, arte_marcial_id, nome, data, status: 'planejamento',
    });

    const fasesModelo = await FaseExameModelo.findAll({
      where: { arte_marcial_id, escola_id: req.usuario.escola_id },
      include: [{ model: CriterioExameModelo, include: [CriterioExameModeloFaixa] }],
      order: [['ordem', 'ASC'], [CriterioExameModelo, 'ordem', 'ASC']],
    });

    for (const faseModelo of fasesModelo) {
      const fase = await FaseExame.create({ exame_id: exame.id, nome: faseModelo.nome, ordem: faseModelo.ordem });
      for (const criterioModelo of faseModelo.CriterioExameModelos) {
        const criterio = await CriterioExame.create({
          fase_exame_id: fase.id, nome: criterioModelo.nome, ordem: criterioModelo.ordem,
        });
        const faixaIds = criterioModelo.CriterioExameModeloFaixas.map((f) => f.faixa_id);
        if (faixaIds.length > 0) {
          await CriterioExameFaixa.bulkCreate(
            faixaIds.map((faixa_id) => ({ criterio_exame_id: criterio.id, faixa_id }))
          );
        }
      }
    }

    const completo = await Exame.findByPk(exame.id, { include: [{ model: ArteMarcial, attributes: ['id', 'nome'] }] });
    res.status(201).json({ ...completo.toJSON(), fases: await buscarFasesDoExame(exame.id) });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizarStatus = async (req, res) => {
  try {
    const exame = await Exame.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const { status } = req.body;
    if (!['planejamento', 'em_andamento', 'finalizado'].includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' });
    }
    await exame.update({ status });
    res.json(exame);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const buscarExameDaEscola = (id, escolaId) => Exame.findOne({ where: { id, escola_id: escolaId } });

const adicionarParticipante = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const { aluno_id, faixa_atual_id, faixa_pretendida_id } = req.body;
    const [participante, criado] = await ExameParticipante.findOrCreate({
      where: { exame_id: exame.id, aluno_id },
      defaults: { faixa_atual_id, faixa_pretendida_id },
    });
    res.status(criado ? 201 : 200).json(participante);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const removerParticipante = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const participante = await ExameParticipante.findOne({ where: { id: req.params.participante_id, exame_id: exame.id } });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });

    const avaliacoes = await AvaliacaoAluno.findAll({ where: { exame_participante_id: participante.id }, attributes: ['id'] });
    await RespostaCriterio.destroy({ where: { avaliacao_id: avaliacoes.map((a) => a.id) } });
    await AvaliacaoAluno.destroy({ where: { exame_participante_id: participante.id } });
    await participante.destroy();

    res.json({ mensagem: 'Participante removido' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const gerarPinUnico = async (exameId) => {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const pin = String(crypto.randomInt(100000, 1000000));
    const existe = await AvaliadorExame.findOne({ where: { exame_id: exameId, pin } });
    if (!existe) return pin;
  }
  throw new Error('Não foi possível gerar um PIN único');
};

const adicionarAvaliador = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const { nome } = req.body;
    const pin = await gerarPinUnico(exame.id);
    const avaliador = await AvaliadorExame.create({
      escola_id: req.usuario.escola_id, exame_id: exame.id, nome, pin,
    });
    res.status(201).json(avaliador);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// Revoga o acesso do avaliador (soft-delete) em vez de apagar — avaliações
// já feitas por ele continuam íntegras no histórico do exame.
const revogarAvaliador = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const avaliador = await AvaliadorExame.findOne({ where: { id: req.params.avaliador_id, exame_id: exame.id } });
    if (!avaliador) return res.status(404).json({ erro: 'Avaliador não encontrado' });

    await avaliador.update({ ativo: false });
    res.json({ mensagem: 'Avaliador revogado' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/exames/:id/sorteio — sorteia um avaliador pra cada aluno na
// fase informada, evitando repetir avaliador que já avaliou aquele aluno em
// QUALQUER fase deste exame (regra 3.4).
const sortear = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const { fase_exame_id, participante_ids } = req.body;
    const fase = await FaseExame.findOne({ where: { id: fase_exame_id, exame_id: exame.id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada neste exame' });

    const avaliadoresAtivos = await AvaliadorExame.findAll({ where: { exame_id: exame.id, ativo: true } });

    const resultado = [];
    // Loop sequencial (não Promise.all) — evita deadlock no MySQL em
    // escritas concorrentes na mesma tabela, mesmo padrão usado em
    // chamadasController.fecharAula.
    for (const participanteId of participante_ids) {
      const jaAvaliaramEsseAluno = await AvaliacaoAluno.findAll({
        where: { exame_participante_id: participanteId },
        attributes: ['avaliador_id'],
      });
      const usados = new Set(jaAvaliaramEsseAluno.map((a) => a.avaliador_id));
      const elegiveis = avaliadoresAtivos.filter((a) => !usados.has(a.id));

      if (elegiveis.length === 0) {
        resultado.push({ participante_id: participanteId, erro: 'Nenhum avaliador disponível para este aluno' });
        continue;
      }

      const escolhido = elegiveis[crypto.randomInt(elegiveis.length)];
      const [avaliacao, criada] = await AvaliacaoAluno.findOrCreate({
        where: { fase_exame_id, exame_participante_id: participanteId },
        defaults: { exame_id: exame.id, avaliador_id: escolhido.id, status: 'pendente' },
      });

      resultado.push({
        participante_id: participanteId,
        avaliacao_id: avaliacao.id,
        avaliador: { id: escolhido.id, nome: escolhido.nome },
        novo: criada,
      });
    }

    res.json(resultado);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// Regra 3.7 — permite corrigir uma avaliação já finalizada
const reabrirAvaliacao = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const avaliacao = await AvaliacaoAluno.findOne({ where: { id: req.params.avaliacao_id, exame_id: exame.id } });
    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada' });

    await avaliacao.update({ status: 'em_andamento', nota: null, finalizada_em: null });
    res.json(avaliacao);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/exames/:id/participantes/:participante_id/ficha — regra 3.8
const fichaParticipante = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const participante = await ExameParticipante.findOne({
      where: { id: req.params.participante_id, exame_id: exame.id },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor'] },
        { model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor'] },
      ],
    });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });

    const fases = await buscarFasesDoExame(exame.id);
    const avaliacoes = await AvaliacaoAluno.findAll({
      where: { exame_participante_id: participante.id },
      include: [
        { model: AvaliadorExame, as: 'Avaliador', attributes: ['id', 'nome'] },
        { model: RespostaCriterio },
      ],
    });
    const avaliacaoPorFase = Object.fromEntries(avaliacoes.map((a) => [a.fase_exame_id, a]));

    const fasesDetalhadas = fases.map((fase) => {
      const avaliacao = avaliacaoPorFase[fase.id];
      const respostasPorCriterio = Object.fromEntries(
        (avaliacao?.RespostaCriterios || []).map((r) => [r.criterio_exame_id, r.conceito])
      );
      return {
        fase_id: fase.id,
        fase_nome: fase.nome,
        avaliador_nome: avaliacao?.Avaliador?.nome || null,
        status: avaliacao?.status || 'nao_sorteado',
        nota: avaliacao?.nota ?? null,
        criterios: fase.criterios.map((c) => ({
          nome: c.nome,
          aplicavel: c.faixa_ids.includes(participante.faixa_pretendida_id),
          conceito: c.faixa_ids.includes(participante.faixa_pretendida_id) ? (respostasPorCriterio[c.id] || null) : 'N/A',
        })),
      };
    });

    const notasFinalizadas = fasesDetalhadas.filter((f) => f.status === 'finalizada').map((f) => f.nota);
    const notaFinal = notasFinalizadas.length === fases.length && fases.length > 0
      ? calcularNotaFinal(notasFinalizadas)
      : null;

    res.json({
      participante: {
        id: participante.id,
        aluno: participante.Aluno,
        faixa_atual: participante.FaixaAtual,
        faixa_pretendida: participante.FaixaPretendida,
      },
      exame: { id: exame.id, nome: exame.nome, data: exame.data },
      fases: fasesDetalhadas,
      nota_final: notaFinal,
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/exames/:id/relatorio — regra 3.9
const relatorio = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const totalFases = await FaseExame.count({ where: { exame_id: exame.id } });

    const participantes = await ExameParticipante.findAll({
      where: { exame_id: exame.id },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor'] },
        { model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor'] },
      ],
    });

    const linhas = [];
    for (const participante of participantes) {
      const avaliacoesFinalizadas = await AvaliacaoAluno.findAll({
        where: { exame_participante_id: participante.id, status: 'finalizada' },
        attributes: ['nota'],
      });
      const completo = avaliacoesFinalizadas.length === totalFases && totalFases > 0;
      linhas.push({
        participante_id: participante.id,
        aluno: participante.Aluno,
        faixa_atual: participante.FaixaAtual,
        faixa_pretendida: participante.FaixaPretendida,
        fases_finalizadas: avaliacoesFinalizadas.length,
        fases_total: totalFases,
        completo,
        nota_final: completo ? calcularNotaFinal(avaliacoesFinalizadas.map((a) => Number(a.nota))) : null,
      });
    }

    res.json({ exame: { id: exame.id, nome: exame.nome, data: exame.data }, participantes: linhas });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = {
  listar, detalhar, criar, atualizarStatus,
  adicionarParticipante, removerParticipante,
  adicionarAvaliador, revogarAvaliador,
  sortear, reabrirAvaliacao, fichaParticipante, relatorio,
};
