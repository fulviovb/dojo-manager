const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  Exame, FaseExame, CriterioExame, CriterioExameFaixa,
  ExameParticipante, AvaliadorExame, AvaliacaoAluno, RespostaCriterio,
  ArteMarcial, Faixa, Usuario, GraduacaoAluno,
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

// Copia fases/critérios/faixas-aplicáveis de um exame de origem pra um
// exame de destino recém-criado — usado tanto pelo "+ Novo Exame" (copia
// do mais recente) quanto por "Começar exame com base em roteiro padrão"
// (copia especificamente do exame tipo='roteiro_padrao' da arte).
const copiarRoteiro = async (origemExameId, destinoExameId) => {
  const fasesOrigem = await buscarFasesDoExame(origemExameId);
  for (const faseOrigem of fasesOrigem) {
    const fase = await FaseExame.create({ exame_id: destinoExameId, nome: faseOrigem.nome, ordem: faseOrigem.ordem });
    for (const criterioOrigem of faseOrigem.criterios) {
      const criterio = await CriterioExame.create({
        fase_exame_id: fase.id, nome: criterioOrigem.nome, ordem: criterioOrigem.ordem,
      });
      if (criterioOrigem.faixa_ids.length > 0) {
        await CriterioExameFaixa.bulkCreate(
          criterioOrigem.faixa_ids.map((faixa_id) => ({ criterio_exame_id: criterio.id, faixa_id }))
        );
      }
    }
  }
};

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 (ambíguos)

// Código curto pra URL pública do avaliador (/exame-avaliador/:codigo) —
// bem mais fácil de digitar no celular que o UUID do exame.
const gerarCodigoUnico = async () => {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    let codigo = '';
    for (let i = 0; i < 6; i++) codigo += ALFABETO_CODIGO[crypto.randomInt(ALFABETO_CODIGO.length)];
    const existe = await Exame.findOne({ where: { codigo } });
    if (!existe) return codigo;
  }
  throw new Error('Não foi possível gerar um código único pro exame');
};

// POST /api/exames — cria o exame já copiando o roteiro (fases/critérios)
// do exame mais recente da mesma arte marcial, se existir — só um ponto de
// partida editável, não um template compartilhado: mudar aqui depois não
// afeta o exame de origem nem exames futuros.
const criar = async (req, res) => {
  try {
    const { arte_marcial_id, nome, data } = req.body;
    const arte = await ArteMarcial.findOne({ where: { id: arte_marcial_id, escola_id: req.usuario.escola_id } });
    if (!arte) return res.status(404).json({ erro: 'Arte marcial não encontrada' });

    const codigo = await gerarCodigoUnico();
    const exame = await Exame.create({
      escola_id: req.usuario.escola_id, arte_marcial_id, nome, data, status: 'planejamento', codigo,
    });

    const exameAnterior = await Exame.findOne({
      where: { arte_marcial_id, escola_id: req.usuario.escola_id, id: { [Op.ne]: exame.id } },
      order: [['data', 'DESC']],
    });
    if (exameAnterior) await copiarRoteiro(exameAnterior.id, exame.id);

    const completo = await Exame.findByPk(exame.id, { include: [{ model: ArteMarcial, attributes: ['id', 'nome'] }] });
    res.status(201).json({ ...completo.toJSON(), fases: await buscarFasesDoExame(exame.id) });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/exames/comecar-com-roteiro-padrao — cria o exame copiando
// especificamente do exame marcado como Roteiro Padrão dessa arte marcial
// (ignora qual foi o exame mais recente).
const comecarComRoteiroPadrao = async (req, res) => {
  try {
    const { arte_marcial_id, nome, data } = req.body;
    const arte = await ArteMarcial.findOne({ where: { id: arte_marcial_id, escola_id: req.usuario.escola_id } });
    if (!arte) return res.status(404).json({ erro: 'Arte marcial não encontrada' });

    const roteiroPadrao = await Exame.findOne({
      where: { arte_marcial_id, escola_id: req.usuario.escola_id, tipo: 'roteiro_padrao' },
    });
    if (!roteiroPadrao) return res.status(404).json({ erro: 'Nenhum Roteiro Padrão definido pra essa arte marcial ainda.' });

    const codigo = await gerarCodigoUnico();
    const exame = await Exame.create({
      escola_id: req.usuario.escola_id, arte_marcial_id, nome, data, status: 'planejamento', codigo,
    });
    await copiarRoteiro(roteiroPadrao.id, exame.id);

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

// PATCH /api/exames/:id/tipo — marca/desmarca um exame como Roteiro Padrão
// da arte marcial dele. Só um por arte: marcar um novo rebaixa o anterior
// pra 'normal' automaticamente.
const marcarComoRoteiroPadrao = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const { tipo } = req.body;
    if (!['normal', 'roteiro_padrao'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido' });
    }

    if (tipo === 'roteiro_padrao') {
      await Exame.update(
        { tipo: 'normal' },
        { where: { arte_marcial_id: exame.arte_marcial_id, escola_id: req.usuario.escola_id, tipo: 'roteiro_padrao' } }
      );
    }
    await exame.update({ tipo });
    res.json(exame);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// DELETE /api/exames/:id — Roteiro Padrão nunca pode ser excluído (precisa
// primeiro ser rebaixado pra 'normal' via PATCH .../tipo).
const remover = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });
    if (exame.tipo === 'roteiro_padrao') {
      return res.status(400).json({ erro: 'Não é possível excluir o Roteiro Padrão. Desmarque-o primeiro se realmente quiser apagar.' });
    }

    const participantes = await ExameParticipante.findAll({ where: { exame_id: exame.id }, attributes: ['id'] });
    const participanteIds = participantes.map((p) => p.id);
    const avaliacoes = await AvaliacaoAluno.findAll({ where: { exame_id: exame.id }, attributes: ['id'] });
    const fases = await FaseExame.findAll({ where: { exame_id: exame.id }, attributes: ['id'] });
    const criterios = await CriterioExame.findAll({ where: { fase_exame_id: fases.map((f) => f.id) }, attributes: ['id'] });

    // Graduações já confirmadas a partir desse exame perdem só o rastro
    // (exame_participante_id), a nota_exame já copiada fica intacta.
    await GraduacaoAluno.update({ exame_participante_id: null }, { where: { exame_participante_id: { [Op.in]: participanteIds } } });
    await RespostaCriterio.destroy({ where: { avaliacao_id: avaliacoes.map((a) => a.id) } });
    await AvaliacaoAluno.destroy({ where: { exame_id: exame.id } });
    await AvaliadorExame.destroy({ where: { exame_id: exame.id } });
    await ExameParticipante.destroy({ where: { exame_id: exame.id } });
    await CriterioExameFaixa.destroy({ where: { criterio_exame_id: criterios.map((c) => c.id) } });
    await CriterioExame.destroy({ where: { fase_exame_id: fases.map((f) => f.id) } });
    await FaseExame.destroy({ where: { exame_id: exame.id } });
    await exame.destroy();

    res.json({ mensagem: 'Exame removido' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// Roteiro (fases/critérios/faixas aplicáveis) só é editável enquanto o
// exame está em planejamento — depois de "Iniciar exame" ele trava, pra não
// bagunçar avaliações já em andamento.
const exigirPlanejamento = (exame, res) => {
  if (exame.status !== 'planejamento') {
    res.status(400).json({ erro: 'O roteiro só pode ser editado enquanto o exame está em planejamento' });
    return false;
  }
  return true;
};

const criarFase = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });
    if (!exigirPlanejamento(exame, res)) return;

    const { nome, ordem } = req.body;
    const fase = await FaseExame.create({ exame_id: exame.id, nome, ordem: ordem || 0 });
    res.status(201).json({ ...fase.toJSON(), criterios: [] });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizarFase = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });
    if (!exigirPlanejamento(exame, res)) return;

    const fase = await FaseExame.findOne({ where: { id: req.params.fase_id, exame_id: exame.id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada' });

    const { nome, ordem } = req.body;
    await fase.update({ nome, ordem });
    res.json(fase);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const removerFase = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });
    if (!exigirPlanejamento(exame, res)) return;

    const fase = await FaseExame.findOne({ where: { id: req.params.fase_id, exame_id: exame.id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada' });

    const criterios = await CriterioExame.findAll({ where: { fase_exame_id: fase.id }, attributes: ['id'] });
    await CriterioExameFaixa.destroy({ where: { criterio_exame_id: criterios.map((c) => c.id) } });
    await CriterioExame.destroy({ where: { fase_exame_id: fase.id } });
    await fase.destroy();

    res.json({ mensagem: 'Fase removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criarCriterio = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });
    if (!exigirPlanejamento(exame, res)) return;

    const fase = await FaseExame.findOne({ where: { id: req.params.fase_id, exame_id: exame.id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada' });

    const { nome, ordem } = req.body;
    const criterio = await CriterioExame.create({ fase_exame_id: fase.id, nome, ordem: ordem || 0 });
    res.status(201).json({ ...criterio.toJSON(), faixa_ids: [] });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// Garante que o critério pertence a um exame da escola do usuário logado
const buscarCriterioDoExame = async (criterioId, exameId) => {
  const criterio = await CriterioExame.findByPk(criterioId, { include: [FaseExame] });
  if (!criterio || criterio.FaseExame.exame_id !== exameId) return null;
  return criterio;
};

const atualizarCriterio = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });
    if (!exigirPlanejamento(exame, res)) return;

    const criterio = await buscarCriterioDoExame(req.params.criterio_id, exame.id);
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });

    const { nome, ordem } = req.body;
    await criterio.update({ nome, ordem });
    res.json(criterio);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const removerCriterio = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });
    if (!exigirPlanejamento(exame, res)) return;

    const criterio = await buscarCriterioDoExame(req.params.criterio_id, exame.id);
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });

    await CriterioExameFaixa.destroy({ where: { criterio_exame_id: criterio.id } });
    await criterio.destroy();
    res.json({ mensagem: 'Critério removido' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// PUT /api/exames/:id/criterios/:criterio_id/faixas — substitui o conjunto
// de faixas em que esse critério é aplicável (clique único, sem checkbox —
// ver telas de Chamadas pro mesmo padrão de "duas listas")
const definirFaixasAplicaveis = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });
    if (!exigirPlanejamento(exame, res)) return;

    const criterio = await buscarCriterioDoExame(req.params.criterio_id, exame.id);
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });

    const { faixa_ids } = req.body;
    await CriterioExameFaixa.destroy({ where: { criterio_exame_id: criterio.id } });
    if (Array.isArray(faixa_ids) && faixa_ids.length > 0) {
      await CriterioExameFaixa.bulkCreate(
        faixa_ids.map((faixa_id) => ({ criterio_exame_id: criterio.id, faixa_id }))
      );
    }

    res.json({ faixa_ids: faixa_ids || [] });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

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
// QUALQUER fase deste exame (regra 3.4) e distribuindo a carga igualmente:
// cada aluno vai pro avaliador elegível com MENOS avaliações no exame até
// agora (empate quebrado por sorteio) — com N alunos e N avaliadores
// disponíveis, cada um fecha com exatamente 1.
const sortear = async (req, res) => {
  try {
    const exame = await buscarExameDaEscola(req.params.id, req.usuario.escola_id);
    if (!exame) return res.status(404).json({ erro: 'Exame não encontrado' });

    const { fase_exame_id, participante_ids } = req.body;
    const fase = await FaseExame.findOne({ where: { id: fase_exame_id, exame_id: exame.id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada neste exame' });

    const avaliadoresAtivos = await AvaliadorExame.findAll({ where: { exame_id: exame.id, ativo: true } });

    // Carrega de uma vez só a situação atual do exame inteiro (todas as
    // fases) — carga por avaliador pra balancear, e quem já avaliou quem
    // pra respeitar a regra 3.4.
    const avaliacoesDoExame = await AvaliacaoAluno.findAll({
      where: { exame_id: exame.id },
      attributes: ['avaliador_id', 'exame_participante_id'],
    });
    const cargaPorAvaliador = new Map(avaliadoresAtivos.map((a) => [a.id, 0]));
    const avaliadoresPorParticipante = new Map();
    for (const av of avaliacoesDoExame) {
      cargaPorAvaliador.set(av.avaliador_id, (cargaPorAvaliador.get(av.avaliador_id) || 0) + 1);
      if (!avaliadoresPorParticipante.has(av.exame_participante_id)) {
        avaliadoresPorParticipante.set(av.exame_participante_id, new Set());
      }
      avaliadoresPorParticipante.get(av.exame_participante_id).add(av.avaliador_id);
    }

    const resultado = [];
    // Loop sequencial (não Promise.all) — evita deadlock no MySQL em
    // escritas concorrentes na mesma tabela, mesmo padrão usado em
    // chamadasController.fecharAula.
    for (const participanteId of participante_ids) {
      const usados = avaliadoresPorParticipante.get(participanteId) || new Set();
      const elegiveis = avaliadoresAtivos.filter((a) => !usados.has(a.id));

      if (elegiveis.length === 0) {
        resultado.push({ participante_id: participanteId, erro: 'Nenhum avaliador disponível para este aluno' });
        continue;
      }

      const menorCarga = Math.min(...elegiveis.map((a) => cargaPorAvaliador.get(a.id)));
      const candidatos = elegiveis.filter((a) => cargaPorAvaliador.get(a.id) === menorCarga);
      const escolhido = candidatos[crypto.randomInt(candidatos.length)];

      const [avaliacao, criada] = await AvaliacaoAluno.findOrCreate({
        where: { fase_exame_id, exame_participante_id: participanteId },
        defaults: { exame_id: exame.id, avaliador_id: escolhido.id, status: 'pendente' },
      });

      if (criada) {
        cargaPorAvaliador.set(escolhido.id, cargaPorAvaliador.get(escolhido.id) + 1);
        if (!avaliadoresPorParticipante.has(participanteId)) avaliadoresPorParticipante.set(participanteId, new Set());
        avaliadoresPorParticipante.get(participanteId).add(escolhido.id);
      }

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
  listar, detalhar, criar, comecarComRoteiroPadrao, atualizarStatus,
  marcarComoRoteiroPadrao, remover,
  criarFase, atualizarFase, removerFase,
  criarCriterio, atualizarCriterio, removerCriterio, definirFaixasAplicaveis,
  adicionarParticipante, removerParticipante,
  adicionarAvaliador, revogarAvaliador,
  sortear, reabrirAvaliacao, fichaParticipante, relatorio,
};
