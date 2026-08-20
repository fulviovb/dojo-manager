const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {
  Usuario, Turma, ArteMarcial, Faixa, MatriculaAluno, GraduacaoAluno,
  HorarioTurma, Sala, Aula, Chamada, AssinaturaAluno, PlanoMensalidade, CriterioGraduacao,
  Pagamento, Mensalidade,
} = require('../models');
const { ehDonoDaTurma } = require('../middleware/autorizacao');
const { dataLocalISO } = require('../utils/data');

const umMesAtras = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return dataLocalISO(d);
};

// GET /api/relatorios/alunos-por-graduacao?arte_marcial_id=&exibir_turmas=
const alunosPorGraduacao = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { arte_marcial_id } = req.query;
    const exibirTurmas = req.query.exibir_turmas === 'true';

    const matriculas = await MatriculaAluno.findAll({
      where: { ativa: true },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'], where: { escola_id, role: 'aluno', ativo: true } },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor', 'ordem', 'arte_marcial_id'] },
        { model: Turma, attributes: ['id', 'nome'], where: { ativa: true, ...(arte_marcial_id ? { arte_marcial_id } : {}) } },
      ],
    });

    const porFaixa = new Map();
    for (const m of matriculas) {
      if (!m.FaixaAtual) continue;
      const fid = m.FaixaAtual.id;
      if (!porFaixa.has(fid)) porFaixa.set(fid, { faixa: m.FaixaAtual, alunos: new Map() });
      const grupo = porFaixa.get(fid);
      if (!grupo.alunos.has(m.aluno_id)) {
        grupo.alunos.set(m.aluno_id, { id: m.Aluno.id, nome: m.Aluno.nome, turmas: new Set() });
      }
      grupo.alunos.get(m.aluno_id).turmas.add(m.Turma.nome);
    }

    const faixas = [...porFaixa.values()]
      .sort((a, b) => (a.faixa.ordem ?? 0) - (b.faixa.ordem ?? 0))
      .map((g) => ({
        faixa: { id: g.faixa.id, nome: g.faixa.nome, cor: g.faixa.cor },
        alunos: [...g.alunos.values()]
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .map((a) => ({ id: a.id, nome: a.nome, turmas: exibirTurmas ? [...a.turmas] : undefined })),
      }));

    res.json({ exibir_turmas: exibirTurmas, faixas });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/alunos-por-turma?turma_id=&plano_pagamento=
const alunosPorTurma = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { turma_id } = req.query;
    if (!turma_id) return res.status(400).json({ erro: 'turma_id é obrigatório' });
    const comPlano = req.query.plano_pagamento === 'true';

    const turma = await Turma.findOne({
      where: { id: turma_id, escola_id, ativa: true },
      include: [
        { model: ArteMarcial, attributes: ['id', 'nome'] },
        { model: Usuario, as: 'Professor', attributes: ['id', 'nome'] },
        { model: HorarioTurma, include: [{ model: Sala, attributes: ['id', 'nome'] }] },
      ],
    });
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    if (!ehDonoDaTurma(req.usuario, turma)) return res.status(403).json({ erro: 'Acesso negado a esta turma' });

    const matriculas = await MatriculaAluno.findAll({
      where: { turma_id, ativa: true },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor'] },
      ],
    });

    const planosPorAluno = {};
    if (comPlano && matriculas.length) {
      const assinaturas = await AssinaturaAluno.findAll({
        where: { aluno_id: { [Op.in]: matriculas.map((m) => m.aluno_id) }, status: 'ativa' },
        include: [{ model: PlanoMensalidade, as: 'Plano', attributes: ['id', 'nome'] }],
      });
      for (const a of assinaturas) planosPorAluno[a.aluno_id] = a.Plano?.nome || null;
    }

    const alunos = matriculas
      .map((m) => ({
        id: m.Aluno.id,
        nome: m.Aluno.nome,
        faixa: m.FaixaAtual?.nome || null,
        faixa_cor: m.FaixaAtual?.cor || null,
        plano: comPlano ? (planosPorAluno[m.aluno_id] || null) : undefined,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    res.json({
      turma: {
        id: turma.id,
        nome: turma.nome,
        arte_marcial: turma.ArteMarcial?.nome,
        professor: turma.Professor?.nome,
        horarios: (turma.HorarioTurmas || []).map((h) => ({
          dia_semana: h.dia_semana, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim, sala: h.Sala?.nome,
        })),
      },
      com_plano_pagamento: comPlano,
      alunos,
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/ficha-cadastral?aluno_id=
const fichaCadastral = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { aluno_id } = req.query;
    if (!aluno_id) return res.status(400).json({ erro: 'aluno_id é obrigatório' });

    const aluno = await Usuario.findOne({
      where: { id: aluno_id, escola_id, role: 'aluno' },
      attributes: { exclude: ['senha_hash'] },
    });
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const [matriculas, graduacoesAtuais] = await Promise.all([
      MatriculaAluno.findAll({
        where: { aluno_id, ativa: true },
        include: [{ model: Turma, attributes: ['id', 'nome'] }],
      }),
      GraduacaoAluno.findAll({
        where: { aluno_id, atual: true },
        include: [
          { model: Faixa, attributes: ['id', 'nome', 'cor'] },
          { model: ArteMarcial, attributes: ['id', 'nome'] },
        ],
      }),
    ]);

    res.json({
      aluno: aluno.toJSON(),
      turmas: matriculas.map((m) => m.Turma?.nome).filter(Boolean),
      graduacoes_atuais: graduacoesAtuais.map((g) => ({ arte: g.ArteMarcial?.nome, faixa: g.Faixa?.nome, faixa_cor: g.Faixa?.cor || null })),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/frequencia-turma?turma_id=&inicio=&fim=&modo=relacao|quantitativo
const frequenciaTurma = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { turma_id, modo } = req.query;
    if (!turma_id) return res.status(400).json({ erro: 'turma_id é obrigatório' });

    const turma = await Turma.findOne({ where: { id: turma_id, escola_id, ativa: true } });
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    if (!ehDonoDaTurma(req.usuario, turma)) return res.status(403).json({ erro: 'Acesso negado a esta turma' });

    const inicio = req.query.inicio || umMesAtras();
    const fim = req.query.fim || dataLocalISO(new Date());

    const aulas = await Aula.findAll({
      where: { turma_id, data: { [Op.between]: [inicio, fim] } },
      include: [{ model: Chamada, include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] }] }],
      order: [['data', 'ASC']],
    });

    if (modo === 'quantitativo') {
      const matriculas = await MatriculaAluno.findAll({
        where: { turma_id, ativa: true },
        include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] }],
      });
      const totalAulas = aulas.length;
      const contagem = new Map(matriculas.map((m) => [m.aluno_id, { id: m.Aluno.id, nome: m.Aluno.nome, presencas: 0 }]));
      for (const a of aulas) {
        for (const c of a.Chamadas) {
          if (contagem.has(c.aluno_id)) contagem.get(c.aluno_id).presencas++;
        }
      }
      const alunos = [...contagem.values()]
        .map((a) => ({ ...a, total_aulas: totalAulas, percentual: totalAulas ? Math.round((a.presencas / totalAulas) * 100) : 0 }))
        .sort((a, b) => b.percentual - a.percentual);
      return res.json({ turma: { id: turma.id, nome: turma.nome }, periodo: { inicio, fim }, modo: 'quantitativo', total_aulas: totalAulas, alunos });
    }

    const relacao = aulas.map((a) => ({
      id: a.id, data: a.data, hora_inicio: a.hora_inicio,
      presentes: a.Chamadas.map((c) => c.Aluno?.nome).filter(Boolean),
    }));
    res.json({ turma: { id: turma.id, nome: turma.nome }, periodo: { inicio, fim }, modo: 'relacao', aulas: relacao });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/frequencia-aluno?aluno_id=&inicio=&fim=
const frequenciaAluno = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { aluno_id } = req.query;
    if (!aluno_id) return res.status(400).json({ erro: 'aluno_id é obrigatório' });

    const aluno = await Usuario.findOne({ where: { id: aluno_id, escola_id, role: 'aluno' } });
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const inicio = req.query.inicio || umMesAtras();
    const fim = req.query.fim || dataLocalISO(new Date());

    const chamadas = await Chamada.findAll({
      where: { aluno_id },
      include: [{
        model: Aula,
        attributes: ['id', 'data', 'hora_inicio', 'turma_id'],
        where: { data: { [Op.between]: [inicio, fim] } },
        include: [{ model: Turma, attributes: ['id', 'nome'] }],
      }],
      order: [[{ model: Aula }, 'data', 'DESC']],
    });

    res.json({
      aluno: { id: aluno.id, nome: aluno.nome },
      periodo: { inicio, fim },
      total: chamadas.length,
      chamadas: chamadas.map((c) => ({ data: c.Aula.data, hora_inicio: c.Aula.hora_inicio, turma: c.Aula.Turma?.nome, origem: c.origem })),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/aniversariantes?mes=
const aniversariantes = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;

    const alunos = await Usuario.findAll({
      where: {
        escola_id, role: 'aluno', ativo: true,
        [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('data_nascimento')), mes),
      },
      attributes: ['id', 'nome', 'data_nascimento', 'matricula', 'telefone'],
    });

    alunos.sort((a, b) => (a.data_nascimento || '').slice(8, 10).localeCompare((b.data_nascimento || '').slice(8, 10)));

    res.json({ mes, aniversariantes: alunos.map((a) => a.toJSON()) });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/frequencia-percentual?arte_marcial_id=&turma_id=&ordenar_por=
// — % de carência cumprida por cada aluno ativo em relação à FAIXA ATUAL (uma
// linha por aluno+arte marcial): aulas presentes desde o início da graduação
// atual dividido pelo min_aulas do CriterioGraduacao cadastrado pra essa
// faixa — mesma base de cálculo de dashboardController.graduacao (usada no
// relatório "Presença Mínima"), mas sem o corte de só mostrar quem já
// atingiu 100%. `turma_id` restringe a uma turma específica (senão, todas as
// turmas, filtradas por `arte_marcial_id` se informado). `ordenar_por` aceita
// 'nome', 'faixa' (ordem de graduação) ou 'percentual' (padrão).
const frequenciaPercentual = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { arte_marcial_id, turma_id, ordenar_por } = req.query;

    const criterios = await CriterioGraduacao.findAll({
      where: { escola_id },
      include: [{ model: Faixa, attributes: ['id', 'nome', 'cor', 'ordem'] }],
    });

    const matriculas = await MatriculaAluno.findAll({
      where: { ativa: true },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'foto_url'], where: { escola_id, role: 'aluno', ativo: true } },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor', 'ordem', 'arte_marcial_id'] },
        {
          model: Turma, attributes: ['id', 'nome', 'arte_marcial_id'],
          where: { ativa: true, ...(arte_marcial_id ? { arte_marcial_id } : {}), ...(turma_id ? { id: turma_id } : {}) },
        },
      ],
    });

    // Um aluno pode estar matriculado em várias turmas da mesma arte marcial
    // — agrupa por (aluno, arte) pra contar a presença uma vez só.
    const porAlunoArte = new Map();
    for (const m of matriculas) {
      if (!m.FaixaAtual) continue;
      if (arte_marcial_id && m.FaixaAtual.arte_marcial_id !== arte_marcial_id) continue;
      const chave = `${m.aluno_id}:${m.FaixaAtual.arte_marcial_id}`;
      if (!porAlunoArte.has(chave)) {
        porAlunoArte.set(chave, { aluno: m.Aluno, faixaAtual: m.FaixaAtual, turmaNomes: [], turmaIds: [] });
      }
      porAlunoArte.get(chave).turmaNomes.push(m.Turma.nome);
      porAlunoArte.get(chave).turmaIds.push(m.turma_id);
    }

    const graduacoesAtuais = await GraduacaoAluno.findAll({
      where: { escola_id, atual: true },
      attributes: ['aluno_id', 'arte_marcial_id', 'data_inicio'],
    });
    const inicioGraduacao = new Map(graduacoesAtuais.map((g) => [`${g.aluno_id}:${g.arte_marcial_id}`, g.data_inicio]));

    const alunosResp = [];
    for (const [chave, grupo] of porAlunoArte) {
      const criterio = criterios.find(
        (c) => c.arte_marcial_id === grupo.faixaAtual.arte_marcial_id && c.faixa_id === grupo.faixaAtual.id
      );

      const dataInicio = inicioGraduacao.get(chave);
      // Mesma base do perfil do aluno (usuariosController.perfil): conta
      // presença em QUALQUER turma daquela arte marcial desde o início da
      // graduação atual — não só nas turmas em que está matriculado agora,
      // porque o aluno pode ter trocado de turma/horário no meio do caminho
      // sem isso "resetar" a carência já cumprida.
      const aulasPresentes = dataInicio
        ? await Chamada.count({
            where: { aluno_id: grupo.aluno.id },
            include: [{
              model: Aula,
              attributes: [],
              where: { data: { [Op.gte]: dataInicio } },
              include: [{ model: Turma, attributes: [], where: { arte_marcial_id: grupo.faixaAtual.arte_marcial_id } }],
            }],
          })
        : 0;

      alunosResp.push({
        id: grupo.aluno.id,
        nome: grupo.aluno.nome,
        foto_url: grupo.aluno.foto_url,
        turmas: [...new Set(grupo.turmaNomes)],
        faixa_atual: grupo.faixaAtual.nome,
        faixa_cor: grupo.faixaAtual.cor || null,
        faixa_ordem: grupo.faixaAtual.ordem ?? 0,
        aulas_presentes: aulasPresentes,
        min_aulas_criterio: criterio ? criterio.min_aulas : null,
        percentual: criterio ? Math.round((aulasPresentes / criterio.min_aulas) * 100) : null,
      });
    }

    alunosResp.sort((a, b) => {
      if (ordenar_por === 'nome') return a.nome.localeCompare(b.nome);
      if (ordenar_por === 'faixa') return a.faixa_ordem - b.faixa_ordem || a.nome.localeCompare(b.nome);
      return (a.percentual ?? -1) - (b.percentual ?? -1) || a.nome.localeCompare(b.nome);
    });

    res.json({ arte_marcial_id: arte_marcial_id || null, turma_id: turma_id || null, ordenar_por: ordenar_por || 'percentual', alunos: alunosResp });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/financeiro?turma_id=&plano_id=&inicio=&fim=
// Pagamentos do período (corpo do relatório) filtrados por turma (via
// matrícula ativa) e/ou plano de pagamento, com um briefing de indicadores
// no cabeçalho — recebido no período e situação atual (em aberto/vencidas)
// das mensalidades do mesmo recorte, não só as do período.
const relatorioFinanceiro = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { turma_id, plano_id } = req.query;
    const inicio = req.query.inicio || umMesAtras();
    const fim = req.query.fim || dataLocalISO(new Date());
    // % que o contratante (escola/academia que cede o espaço) recolhe da
    // mensalidade — informado por quem pede o relatório, não vem de
    // cadastro nenhum (varia por acordo, não é um dado fixo do sistema).
    const percentualContratante = Math.min(100, Math.max(0, parseFloat(req.query.percentual_contratante) || 0));

    let turma = null;
    if (turma_id) {
      turma = await Turma.findOne({ where: { id: turma_id, escola_id } });
      if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
      if (!ehDonoDaTurma(req.usuario, turma)) return res.status(403).json({ erro: 'Acesso negado a esta turma' });
    }

    let plano = null;
    if (plano_id) {
      plano = await PlanoMensalidade.findOne({ where: { id: plano_id, escola_id } });
      if (!plano) return res.status(404).json({ erro: 'Plano não encontrado' });
    }

    let alunoIds = null;
    if (turma_id) {
      const matriculas = await MatriculaAluno.findAll({ where: { turma_id, ativa: true }, attributes: ['aluno_id'] });
      alunoIds = matriculas.map((m) => m.aluno_id);
    }

    const whereMensalidade = {
      ...(plano_id ? { plano_id } : {}),
      ...(alunoIds ? { aluno_id: { [Op.in]: alunoIds } } : {}),
    };

    const pagamentos = await Pagamento.findAll({
      where: { data_pagamento: { [Op.between]: [inicio, fim] } },
      include: [{
        model: Mensalidade,
        required: true,
        where: whereMensalidade,
        include: [
          { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'], where: { escola_id } },
          { model: PlanoMensalidade, as: 'Plano', attributes: ['id', 'nome'] },
        ],
      }],
      order: [['data_pagamento', 'DESC']],
    });

    // Situação atual (independente do período) das mensalidades do mesmo
    // recorte turma/plano — dá contexto de inadimplência no cabeçalho.
    const mensalidadesDoRecorte = await Mensalidade.findAll({
      where: whereMensalidade,
      include: [{ model: Usuario, as: 'Aluno', attributes: [], where: { escola_id } }],
    });

    const hoje = dataLocalISO(new Date());
    let mensalidades_em_aberto = 0, mensalidades_vencidas = 0, valor_a_receber = 0;
    for (const m of mensalidadesDoRecorte) {
      if (m.status !== 'pendente') continue;
      valor_a_receber += parseFloat(m.valor) - parseFloat(m.desconto || 0) + parseFloat(m.juros || 0);
      if (m.data_vencimento < hoje) mensalidades_vencidas++; else mensalidades_em_aberto++;
    }

    const total_recebido = pagamentos.reduce((soma, p) => soma + parseFloat(p.valor_pago), 0);
    const alunosPagantes = new Set(pagamentos.map((p) => p.Mensalidade.aluno_id));

    res.json({
      turma: turma ? { id: turma.id, nome: turma.nome } : null,
      plano: plano ? { id: plano.id, nome: plano.nome } : null,
      periodo: { inicio, fim },
      indicadores: {
        total_recebido,
        qtd_pagamentos: pagamentos.length,
        ticket_medio: pagamentos.length ? total_recebido / pagamentos.length : 0,
        alunos_pagantes: alunosPagantes.size,
        mensalidades_em_aberto,
        mensalidades_vencidas,
        valor_a_receber,
        percentual_contratante: percentualContratante,
        valor_contratante: total_recebido * (percentualContratante / 100),
      },
      pagamentos: pagamentos.map((p) => ({
        id: p.id,
        data_pagamento: p.data_pagamento,
        valor_pago: p.valor_pago,
        forma_pagamento: p.forma_pagamento,
        aluno_id: p.Mensalidade.aluno_id,
        aluno: p.Mensalidade.Aluno?.nome,
        plano: p.Mensalidade.Plano?.nome || 'Fatura avulsa',
        mes_referencia: p.Mensalidade.mes_referencia,
      })),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/alunos-sem-plano
// Alunos ativos que nunca tiveram nenhuma AssinaturaAluno (qualquer status) —
// não é "sem plano ativo", é sem NENHUM registro de assinatura.
const alunosSemPlano = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;

    const comAssinatura = await AssinaturaAluno.findAll({
      where: { escola_id },
      attributes: ['aluno_id'],
      group: ['aluno_id'],
    });
    const idsComAssinatura = comAssinatura.map((a) => a.aluno_id);

    const alunos = await Usuario.findAll({
      where: {
        escola_id, role: 'aluno', ativo: true,
        ...(idsComAssinatura.length ? { id: { [Op.notIn]: idsComAssinatura } } : {}),
      },
      attributes: ['id', 'nome', 'matricula', 'telefone', 'data_ingresso'],
      order: [['nome', 'ASC']],
    });

    res.json({ total: alunos.length, alunos: alunos.map((a) => a.toJSON()) });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = {
  alunosPorGraduacao, alunosPorTurma, fichaCadastral, frequenciaTurma, frequenciaAluno, aniversariantes,
  frequenciaPercentual, relatorioFinanceiro, alunosSemPlano,
};
