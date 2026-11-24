const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  Exame, FaseExame, CriterioExame, CriterioExameFaixa,
  ExameParticipante, AvaliadorExame, AvaliacaoAluno, RespostaCriterio,
  ArteMarcial, Faixa, Usuario, GraduacaoAluno, ExamePagamento, ExamePedidoFaixa, ExameHistorico,
} = require('../models');
const sequelize = require('../config/database');
const { calcularNotaFinal } = require('../utils/notaExame');
const { ErroRegra, responderErro, STATUS_ABERTO, alunosPermitidos, candidatoEmExameAberto } = require('../services/indicacaoExameService');
const { artesPermitidas, carregarExame, exigirExameInteiro, carregarCandidato } = require('../services/exameAcessoService');
const { lerGestao, resumosDosExames } = require('./gestaoExameController');

const listar = async (req, res) => {
  try {
    const artes = await artesPermitidas(req.usuario);
    const exames = await Exame.findAll({
      where: { escola_id: req.usuario.escola_id, ...(artes ? { arte_marcial_id: [...artes] } : {}) },
      include: [{ model: ArteMarcial, attributes: ['id', 'nome'] }],
      order: [['data', 'DESC']],
    });
    const permitidosPorArte = new Map();
    for (const arteId of new Set(exames.map((e) => e.arte_marcial_id))) permitidosPorArte.set(arteId, await alunosPermitidos(req.usuario, arteId));
    const resumos = await resumosDosExames(exames, permitidosPorArte);
    res.json(exames.map((e) => ({ ...e.toJSON(), ...resumos.get(e.id) })));
  } catch (e) { responderErro(res, e); }
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
    const { exame, permitidos } = await carregarExame(req);
    const arte = await ArteMarcial.findByPk(exame.arte_marcial_id, { attributes: ['id', 'nome'] });

    const fases = await buscarFasesDoExame(exame.id);

    const participantes = await ExameParticipante.findAll({
      where: { exame_id: exame.id, ...(permitidos ? { aluno_id: [...permitidos] } : {}) },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor'] },
        { model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor'] },
      ],
    });

    const avaliadores = await AvaliadorExame.findAll({ where: { exame_id: exame.id } });

    const avaliacoes = await AvaliacaoAluno.findAll({
      where: { exame_id: exame.id, exame_participante_id: participantes.map((p) => p.id) },
      include: [
        { model: AvaliadorExame, as: 'Avaliador', attributes: ['id', 'nome'] },
      ],
    });

    res.json({
      ...exame.toJSON(),
      ArteMarcial: arte,
      fases,
      participantes,
      avaliadores,
      avaliacoes,
    });
  } catch (e) { responderErro(res, e); }
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
    const artes = await artesPermitidas(req.usuario);
    if (artes && !artes.has(arte_marcial_id)) throw new ErroRegra(403, 'Sem permissão para esta arte marcial');
    const gestao = lerGestao(req.body);

    const codigo = await gerarCodigoUnico();
    const exame = await Exame.create({
      escola_id: req.usuario.escola_id, arte_marcial_id, nome, data, status: 'planejamento', codigo, ...gestao,
    });

    const exameAnterior = exame.usa_avaliacao && await Exame.findOne({
      where: {
        arte_marcial_id, escola_id: req.usuario.escola_id, id: { [Op.ne]: exame.id },
        usa_avaliacao: true, status: { [Op.ne]: 'cancelado' },
      },
      order: [['data', 'DESC']],
    });
    if (exameAnterior) await copiarRoteiro(exameAnterior.id, exame.id);

    const completo = await Exame.findByPk(exame.id, { include: [{ model: ArteMarcial, attributes: ['id', 'nome'] }] });
    res.status(201).json({ ...completo.toJSON(), fases: await buscarFasesDoExame(exame.id) });
  } catch (e) { responderErro(res, e); }
};

// POST /api/exames/comecar-com-roteiro-padrao — cria o exame copiando
// especificamente do exame marcado como Roteiro Padrão dessa arte marcial
// (ignora qual foi o exame mais recente).
const comecarComRoteiroPadrao = async (req, res) => {
  try {
    const { arte_marcial_id, nome, data } = req.body;
    const arte = await ArteMarcial.findOne({ where: { id: arte_marcial_id, escola_id: req.usuario.escola_id } });
    if (!arte) return res.status(404).json({ erro: 'Arte marcial não encontrada' });
    const artes = await artesPermitidas(req.usuario);
    if (artes && !artes.has(arte_marcial_id)) throw new ErroRegra(403, 'Sem permissão para esta arte marcial');
    const gestao = lerGestao(req.body);

    const roteiroPadrao = await Exame.findOne({
      where: { arte_marcial_id, escola_id: req.usuario.escola_id, tipo: 'roteiro_padrao' },
    });
    if (!roteiroPadrao) return res.status(404).json({ erro: 'Nenhum Roteiro Padrão definido pra essa arte marcial ainda.' });

    const codigo = await gerarCodigoUnico();
    const exame = await Exame.create({
      escola_id: req.usuario.escola_id, arte_marcial_id, nome, data, status: 'planejamento', codigo, ...gestao,
    });
    await copiarRoteiro(roteiroPadrao.id, exame.id);

    const completo = await Exame.findByPk(exame.id, { include: [{ model: ArteMarcial, attributes: ['id', 'nome'] }] });
    res.status(201).json({ ...completo.toJSON(), fases: await buscarFasesDoExame(exame.id) });
  } catch (e) { responderErro(res, e); }
};

const atualizarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['planejamento', 'em_andamento', 'finalizado', 'cancelado'].includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' });
    }
    await sequelize.transaction(async (transaction) => {
      const { exame, permitidos } = await carregarExame(req, { transaction, lock: true });
      await exigirExameInteiro(exame, permitidos, { transaction });
      if (status === exame.status) return;
      if (status === 'cancelado') {
        if (exame.tipo !== 'normal') throw new ErroRegra(409, 'Roteiro Padrão não pode ser cancelado');
        const graduados = await ExameParticipante.count({ where: { exame_id: exame.id, graduacao_aluno_id: { [Op.ne]: null } }, transaction });
        if (graduados) throw new ErroRegra(409, 'Este exame já graduou alunos e não pode ser cancelado');
      }
      // reabrir: nenhuma indicação pode ter ido pra outro exame aberto (RN-02)
      if (STATUS_ABERTO.includes(status) && !STATUS_ABERTO.includes(exame.status)) {
        const ps = await ExameParticipante.findAll({
          where: {
            exame_id: exame.id, status_inscricao: { [Op.ne]: 'desistiu' },
            graduacao_aluno_id: null, indicacao_exame_id: { [Op.ne]: null },
          }, transaction,
        });
        for (const p of ps) {
          const outro = await candidatoEmExameAberto(p.indicacao_exame_id, { exceto_exame_id: exame.id, transaction });
          if (outro) throw new ErroRegra(409, `Há candidatos que já estão no exame "${outro.Exame.nome}"`);
        }
      }
      await exame.update({ status }, { transaction });
      await ExameHistorico.create({
        escola_id: exame.escola_id, exame_id: exame.id, tipo: 'exame', descricao: `Status: ${status}`, usuario_id: req.usuario.id,
      }, { transaction });
    });
    res.json(await Exame.findByPk(req.params.id));
  } catch (e) { responderErro(res, e); }
};

// PATCH /api/exames/:id/tipo — marca/desmarca um exame como Roteiro Padrão
// da arte marcial dele. Só um por arte: marcar um novo rebaixa o anterior
// pra 'normal' automaticamente.
const marcarComoRoteiroPadrao = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);

    const { tipo } = req.body;
    await exigirExameInteiro(exame, permitidos);
    if (!['normal', 'roteiro_padrao'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido' });
    }

    if (tipo === 'roteiro_padrao') {
      if (!exame.usa_avaliacao) throw new ErroRegra(409, 'Exame só de gestão não pode ser Roteiro Padrão');
      if (await ExameParticipante.count({ where: { exame_id: exame.id } })) throw new ErroRegra(409, 'Exame com candidatos não pode ser Roteiro Padrão');
      await Exame.update(
        { tipo: 'normal' },
        { where: { arte_marcial_id: exame.arte_marcial_id, escola_id: req.usuario.escola_id, tipo: 'roteiro_padrao' } }
      );
    }
    await exame.update({ tipo });
    res.json(exame);
  } catch (e) { responderErro(res, e); }
};

// DELETE /api/exames/:id — Roteiro Padrão nunca pode ser excluído (precisa
// primeiro ser rebaixado pra 'normal' via PATCH .../tipo).
const remover = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    await exigirExameInteiro(exame, permitidos);
    if (exame.tipo === 'roteiro_padrao') {
      return res.status(400).json({ erro: 'Não é possível excluir o Roteiro Padrão. Desmarque-o primeiro se realmente quiser apagar.' });
    }

    const participantes = await ExameParticipante.findAll({ where: { exame_id: exame.id }, attributes: ['id'] });
    const participanteIds = participantes.map((p) => p.id);
    // RN-17: exame com pagamento (mesmo estornado) ou graduação fica no histórico
    if (await ExamePagamento.count({ where: { exame_participante_id: participanteIds } })) {
      throw new ErroRegra(409, 'Exame com pagamentos não pode ser excluído: finalize ou cancele');
    }
    if (await ExameParticipante.count({ where: { exame_id: exame.id, graduacao_aluno_id: { [Op.ne]: null } } })) {
      throw new ErroRegra(409, 'Exame que já graduou alunos não pode ser excluído: finalize');
    }
    const avaliacoes = await AvaliacaoAluno.findAll({ where: { exame_id: exame.id }, attributes: ['id'] });
    const fases = await FaseExame.findAll({ where: { exame_id: exame.id }, attributes: ['id'] });
    const criterios = await CriterioExame.findAll({ where: { fase_exame_id: fases.map((f) => f.id) }, attributes: ['id'] });

    // Graduações já confirmadas a partir desse exame perdem só o rastro
    // (exame_participante_id), a nota_exame já copiada fica intacta.
    await GraduacaoAluno.update({ exame_participante_id: null }, { where: { exame_participante_id: { [Op.in]: participanteIds } } });
    await RespostaCriterio.destroy({ where: { avaliacao_id: avaliacoes.map((a) => a.id) } });
    await AvaliacaoAluno.destroy({ where: { exame_id: exame.id } });
    await AvaliadorExame.destroy({ where: { exame_id: exame.id } });
    await ExamePedidoFaixa.destroy({ where: { exame_participante_id: participanteIds } });
    await ExameHistorico.destroy({ where: { exame_id: exame.id } });
    await ExameParticipante.destroy({ where: { exame_id: exame.id } });
    await CriterioExameFaixa.destroy({ where: { criterio_exame_id: criterios.map((c) => c.id) } });
    await CriterioExame.destroy({ where: { fase_exame_id: fases.map((f) => f.id) } });
    await FaseExame.destroy({ where: { exame_id: exame.id } });
    await exame.destroy();

    res.json({ mensagem: 'Exame removido' });
  } catch (e) { responderErro(res, e); }
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
    const { exame, permitidos } = await carregarExame(req);
    await exigirExameInteiro(exame, permitidos);
    if (!exigirPlanejamento(exame, res)) return;

    const { nome, ordem } = req.body;
    const fase = await FaseExame.create({ exame_id: exame.id, nome, ordem: ordem || 0 });
    res.status(201).json({ ...fase.toJSON(), criterios: [] });
  } catch (e) { responderErro(res, e); }
};

const atualizarFase = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    await exigirExameInteiro(exame, permitidos);
    if (!exigirPlanejamento(exame, res)) return;

    const fase = await FaseExame.findOne({ where: { id: req.params.fase_id, exame_id: exame.id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada' });

    const { nome, ordem } = req.body;
    await fase.update({ nome, ordem });
    res.json(fase);
  } catch (e) { responderErro(res, e); }
};

const removerFase = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    await exigirExameInteiro(exame, permitidos);
    if (!exigirPlanejamento(exame, res)) return;

    const fase = await FaseExame.findOne({ where: { id: req.params.fase_id, exame_id: exame.id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada' });

    const criterios = await CriterioExame.findAll({ where: { fase_exame_id: fase.id }, attributes: ['id'] });
    await CriterioExameFaixa.destroy({ where: { criterio_exame_id: criterios.map((c) => c.id) } });
    await CriterioExame.destroy({ where: { fase_exame_id: fase.id } });
    await fase.destroy();

    res.json({ mensagem: 'Fase removida' });
  } catch (e) { responderErro(res, e); }
};

const criarCriterio = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    await exigirExameInteiro(exame, permitidos);
    if (!exigirPlanejamento(exame, res)) return;

    const fase = await FaseExame.findOne({ where: { id: req.params.fase_id, exame_id: exame.id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada' });

    const { nome, ordem } = req.body;
    const criterio = await CriterioExame.create({ fase_exame_id: fase.id, nome, ordem: ordem || 0 });
    res.status(201).json({ ...criterio.toJSON(), faixa_ids: [] });
  } catch (e) { responderErro(res, e); }
};

// Garante que o critério pertence a um exame da escola do usuário logado
const buscarCriterioDoExame = async (criterioId, exameId) => {
  const criterio = await CriterioExame.findByPk(criterioId, { include: [FaseExame] });
  if (!criterio || criterio.FaseExame.exame_id !== exameId) return null;
  return criterio;
};

const atualizarCriterio = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    await exigirExameInteiro(exame, permitidos);
    if (!exigirPlanejamento(exame, res)) return;

    const criterio = await buscarCriterioDoExame(req.params.criterio_id, exame.id);
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });

    const { nome, ordem } = req.body;
    await criterio.update({ nome, ordem });
    res.json(criterio);
  } catch (e) { responderErro(res, e); }
};

const removerCriterio = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    await exigirExameInteiro(exame, permitidos);
    if (!exigirPlanejamento(exame, res)) return;

    const criterio = await buscarCriterioDoExame(req.params.criterio_id, exame.id);
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });

    await CriterioExameFaixa.destroy({ where: { criterio_exame_id: criterio.id } });
    await criterio.destroy();
    res.json({ mensagem: 'Critério removido' });
  } catch (e) { responderErro(res, e); }
};

// PUT /api/exames/:id/criterios/:criterio_id/faixas — substitui o conjunto
// de faixas em que esse critério é aplicável (clique único, sem checkbox —
// ver telas de Chamadas pro mesmo padrão de "duas listas")
const definirFaixasAplicaveis = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);
    await exigirExameInteiro(exame, permitidos);
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
  } catch (e) { responderErro(res, e); }
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
    const { exame } = await carregarExame(req);

    const { nome } = req.body;
    const pin = await gerarPinUnico(exame.id);
    const avaliador = await AvaliadorExame.create({
      escola_id: req.usuario.escola_id, exame_id: exame.id, nome, pin,
    });
    res.status(201).json(avaliador);
  } catch (e) { responderErro(res, e); }
};

// Revoga o acesso do avaliador (soft-delete) em vez de apagar — avaliações
// já feitas por ele continuam íntegras no histórico do exame.
const revogarAvaliador = async (req, res) => {
  try {
    const { exame } = await carregarExame(req);

    const avaliador = await AvaliadorExame.findOne({ where: { id: req.params.avaliador_id, exame_id: exame.id } });
    if (!avaliador) return res.status(404).json({ erro: 'Avaliador não encontrado' });

    await avaliador.update({ ativo: false });
    res.json({ mensagem: 'Avaliador revogado' });
  } catch (e) { responderErro(res, e); }
};

// POST /api/exames/:id/sorteio — sorteia um avaliador pra cada aluno na
// fase informada, evitando repetir avaliador que já avaliou aquele aluno em
// QUALQUER fase deste exame (regra 3.4) e distribuindo a carga igualmente:
// cada aluno vai pro avaliador elegível com MENOS avaliações no exame até
// agora (empate quebrado por sorteio) — com N alunos e N avaliadores
// disponíveis, cada um fecha com exatamente 1.
const sortear = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);

    if (!exame.usa_avaliacao) throw new ErroRegra(409, 'Este exame não usa avaliação');
    const { fase_exame_id, participante_ids } = req.body;
    if (!Array.isArray(participante_ids)) throw new ErroRegra(400, 'Selecione ao menos um aluno');
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
      const participante = await carregarCandidato(exame, permitidos, participanteId);
      if (participante.status_inscricao === 'desistiu' || participante.presenca === 'ausente') {
        resultado.push({ participante_id: participanteId, erro: 'Desistente ou ausente: fora do sorteio' });
        continue;
      }
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
  } catch (e) { responderErro(res, e); }
};

// Regra 3.7 — permite corrigir uma avaliação já finalizada
const reabrirAvaliacao = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);

    const avaliacao = await AvaliacaoAluno.findOne({ where: { id: req.params.avaliacao_id, exame_id: exame.id } });
    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const avaliado = await carregarCandidato(exame, permitidos, avaliacao.exame_participante_id);
    if (avaliado.graduacao_aluno_id) throw new ErroRegra(409, 'O aluno já foi graduado com esta nota');

    await avaliacao.update({ status: 'em_andamento', nota: null, finalizada_em: null });
    res.json(avaliacao);
  } catch (e) { responderErro(res, e); }
};

// GET /api/exames/:id/participantes/:participante_id/ficha — regra 3.8
const fichaParticipante = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);

    const participante = await ExameParticipante.findOne({
      where: { id: req.params.participante_id, exame_id: exame.id },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor'] },
        { model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor'] },
      ],
    });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });
    if (permitidos && !permitidos.has(participante.aluno_id)) throw new ErroRegra(403, 'Sem permissão para este aluno');

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
  } catch (e) { responderErro(res, e); }
};

// GET /api/exames/:id/relatorio — regra 3.9
const relatorio = async (req, res) => {
  try {
    const { exame, permitidos } = await carregarExame(req);

    const totalFases = await FaseExame.count({ where: { exame_id: exame.id } });

    const participantes = await ExameParticipante.findAll({
      where: { exame_id: exame.id, ...(permitidos ? { aluno_id: [...permitidos] } : {}) },
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
  } catch (e) { responderErro(res, e); }
};

module.exports = {
  listar, detalhar, criar, comecarComRoteiroPadrao, atualizarStatus,
  marcarComoRoteiroPadrao, remover,
  criarFase, atualizarFase, removerFase,
  criarCriterio, atualizarCriterio, removerCriterio, definirFaixasAplicaveis,
  adicionarAvaliador, revogarAvaliador,
  sortear, reabrirAvaliacao, fichaParticipante, relatorio,
};
