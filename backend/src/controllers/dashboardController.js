const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {
  Escola, Usuario, Turma, Aula, Chamada, MatriculaAluno, Mensalidade, Pagamento,
  CriterioGraduacao, Faixa, GraduacaoAluno, ArteMarcial, HorarioTurma, Sala,
  AssinaturaAluno, PlanoMensalidade,
} = require('../models');
const { dataLocalISO } = require('../utils/data');
const { feriadosNoIntervalo } = require('../utils/feriados');

// Mesma tabela de `faturaService.js`: quantos meses cada periodicidade cobre
// — um plano trimestral de R$300 vale R$100/mês, não R$300/mês.
const MESES_POR_PERIODICIDADE = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

// Presenças (Chamada) do aluno em qualquer turma da arte marcial dada, desde
// o início da graduação atual — mesma base usada em `graduacao` e em
// `relatoriosController.frequenciaPercentual`. Trocar de turma/horário no
// meio da graduação não deveria "resetar" carência já cumprida.
async function presencasDesdeGraduacao(aluno_id, arte_marcial_id, dataInicio) {
  if (!dataInicio) return 0;
  // sum(quantidade), não count(*): Treino Extra pode valer mais de 1 "aula"
  // por registro (ex: 2 treinos seguidos no mesmo dia).
  const total = await Chamada.sum('quantidade', {
    where: { aluno_id },
    include: [{
      model: Aula,
      attributes: [],
      where: { data: { [Op.gte]: dataInicio } },
      include: [{ model: Turma, attributes: [], where: { arte_marcial_id } }],
    }],
  });
  return total || 0;
}

// Quantas aulas de verdade ainda existem entre `inicioISO` (inclusive) e
// `fimISO` (exclusive), dado um multiset de dias-da-semana (0=Dom..6=Sáb —
// um por HorarioTurma que bate), descontando feriados nacionais.
function contarAulasNoIntervalo(diasDaSemana, inicioISO, fimISO) {
  if (diasDaSemana.length === 0 || inicioISO >= fimISO) return 0;
  const feriados = feriadosNoIntervalo(inicioISO, fimISO);
  const contagemPorDia = new Array(7).fill(0);
  for (const d of diasDaSemana) contagemPorDia[d]++;

  let total = 0;
  const cursor = new Date(inicioISO + 'T00:00:00');
  const fim = new Date(fimISO + 'T00:00:00');
  while (cursor < fim) {
    const iso = dataLocalISO(cursor);
    if (!feriados.has(iso)) total += contagemPorDia[cursor.getDay()];
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

// Início (inclusive) e fim (exclusive) do mês corrente, no formato usado por
// `contarAulasNoIntervalo`/`horasNoMes`.
function intervaloMesAtual() {
  const hoje = new Date();
  return {
    inicio: dataLocalISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    fim: dataLocalISO(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)),
  };
}

// Soma de horas de aula de verdade entre `inicioISO` (inclusive) e `fimISO`
// (exclusive), a partir de uma lista de HorarioTurma (dia_semana + duração),
// descontando feriados nacionais — mesma lógica de `contarAulasNoIntervalo`,
// mas somando duração em vez de contar ocorrências (turmas com aulas de
// duração diferente em dias diferentes da semana).
function horasNoMes(horarios, inicioISO, fimISO) {
  if (horarios.length === 0 || inicioISO >= fimISO) return 0;
  const feriados = feriadosNoIntervalo(inicioISO, fimISO);
  const horasPorDia = new Array(7).fill(0);
  for (const h of horarios) {
    horasPorDia[h.dia_semana] += horaParaFracao(h.hora_fim) - horaParaFracao(h.hora_inicio);
  }
  let total = 0;
  const cursor = new Date(inicioISO + 'T00:00:00');
  const fim = new Date(fimISO + 'T00:00:00');
  while (cursor < fim) {
    const iso = dataLocalISO(cursor);
    if (!feriados.has(iso)) total += horasPorDia[cursor.getDay()];
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

// 'HH:MM:SS' → horas fracionárias (ex: '01:30:00' → 1.5)
function horaParaFracao(hhmmss) {
  const [h, m, s] = hhmmss.split(':').map(Number);
  return h + m / 60 + (s || 0) / 3600;
}

// GET /api/dashboard
const resumo = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const escola = await Escola.findByPk(escola_id);
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    const dataInicio = dataLocalISO(trintaDiasAtras);
    const dataFim = dataLocalISO(hoje);

    const { inicio: inicioMes, fim: fimMes } = intervaloMesAtual();

    const [totalAlunos, totalTurmas, aulasPeriodo, novosAlunosMes, alunosSemPlano] = await Promise.all([
      Usuario.count({ where: { escola_id, role: 'aluno', ativo: true } }),
      Turma.count({ where: { escola_id, ativa: true } }),
      Aula.findAll({
        where: { data: { [Op.between]: [dataInicio, dataFim] }, status: 'fechada' },
        include: [
          { model: Chamada, attributes: ['aluno_id'] },
          // tipo 'treino_extra' é a turma oculta do módulo de Treino Extra —
          // não deve inflar o indicador de aulas da grade regular. Também
          // fecha uma lacuna pré-existente: essa query não filtrava por
          // escola_id nenhuma (Aula não tem a coluna direto, só via Turma).
          { model: Turma, attributes: [], where: { escola_id, tipo: 'regular' }, required: true },
        ],
      }),
      // Alunos que entraram este mês — sinal de crescimento na aba Operacional.
      Usuario.count({ where: { escola_id, role: 'aluno', ativo: true, data_ingresso: { [Op.gte]: inicioMes, [Op.lt]: fimMes } } }),
      // Aluno ativo sem nenhuma AssinaturaAluno — mesma regra do relatório
      // "Alunos sem Plano de Assinatura"; só a contagem, pra sinalizar na
      // aba Financeira que tem gente sem cobrança nenhuma configurada.
      (async () => {
        const comAssinatura = await AssinaturaAluno.findAll({ where: { escola_id }, attributes: ['aluno_id'], group: ['aluno_id'] });
        const ids = comAssinatura.map((a) => a.aluno_id);
        return Usuario.count({ where: { escola_id, role: 'aluno', ativo: true, ...(ids.length ? { id: { [Op.notIn]: ids } } : {}) } });
      })(),
    ]);

    const totalAulas = aulasPeriodo.length;
    const totalPresencas = aulasPeriodo.reduce((sum, a) => sum + a.Chamadas.length, 0);
    const mediaPresenca = totalAulas > 0 ? (totalPresencas / totalAulas).toFixed(1) : 0;

    // Financeiro do mês atual
    const mesAtual = dataLocalISO(hoje).slice(0, 7) + '-01';
    const mensalidadesDoMes = await Mensalidade.findAll({
      where: { mes_referencia: { [Op.gte]: mesAtual } },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['escola_id'], where: { escola_id } },
        { model: Pagamento, attributes: ['valor_pago'] },
      ],
    });
    const mensalidadesPendentes = mensalidadesDoMes.filter(m => m.status === 'pendente').length;
    const receitaMes = mensalidadesDoMes.reduce((sum, m) => {
      const pago = m.Pagamentos?.reduce((s, p) => s + parseFloat(p.valor_pago || 0), 0) || 0;
      return sum + pago;
    }, 0);

    // Mensalidades vencidas: pendentes com vencimento já passado, qualquer mês
    // (não só o atual) — sinal de inadimplência acumulada, distinto de
    // "pendente" (que pode só ainda não ter vencido).
    const hojeIso = dataLocalISO(hoje);
    const mensalidadesVencidas = await Mensalidade.count({
      where: { status: 'pendente', data_vencimento: { [Op.lt]: hojeIso } },
      include: [{ model: Usuario, as: 'Aluno', attributes: [], where: { escola_id } }],
    });

    // Receita projetada do mês: valor mensal equivalente de TODAS as
    // assinaturas ativas da escola (independente de já ter mensalidade
    // gerada/paga) — "quanto eu deveria faturar esse mês se tudo correr
    // normal", pra comparar com o já efetivamente recebido.
    const assinaturasAtivas = await AssinaturaAluno.findAll({
      where: { escola_id, status: 'ativa' },
      include: [{ model: PlanoMensalidade, as: 'Plano', attributes: ['valor', 'periodicidade'] }],
    });
    let receitaProjetadaMes = 0;
    for (const a of assinaturasAtivas) {
      if (!a.Plano) continue;
      const meses = MESES_POR_PERIODICIDADE[a.Plano.periodicidade] || 1;
      receitaProjetadaMes += parseFloat(a.Plano.valor) / meses;
    }

    res.json({
      periodo: { inicio: dataInicio, fim: dataFim },
      alunos: { total: totalAlunos, novos_mes: novosAlunosMes },
      turmas: { total: totalTurmas },
      frequencia: { aulas_periodo: totalAulas, media_presentes: Number(mediaPresenca) },
      financeiro: {
        mensalidades_pendentes: mensalidadesPendentes,
        mensalidades_vencidas: mensalidadesVencidas,
        receita_mes: receitaMes || 0,
        receita_projetada_mes: Math.round(receitaProjetadaMes * 100) / 100,
        alunos_sem_plano: alunosSemPlano,
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/dashboard/semaforo — alertas de ausência por aluno
const semaforo = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const escola = await Escola.findByPk(escola_id);
    const threshold = escola?.threshold_falta_vermelho || 40;

    const matriculas = await MatriculaAluno.findAll({
      where: { ativa: true },
      include: [
        { model: Usuario, as: 'Aluno', where: { escola_id, role: 'aluno', ativo: true }, attributes: ['id', 'nome'] },
        // Só turmas ativas e regulares: turma desativada não tem mais aula,
        // então a matrícula nela (que pode continuar ativa) viraria um
        // alerta de ausência eterno. A turma oculta de Treino Extra também
        // fica de fora — não tem frequência esperada.
        { model: Turma, attributes: ['id', 'nome'], where: { escola_id, ativa: true, tipo: 'regular' } },
      ],
    });

    const alertas = [];

    for (const m of matriculas) {
      // Busca últimas aulas da turma a partir da data de matrícula — aula
      // anterior à entrada do aluno na turma não é falta dele.
      const ultimasAulas = await Aula.findAll({
        where: {
          turma_id: m.turma_id,
          status: 'fechada',
          ...(m.data_matricula ? { data: { [Op.gte]: m.data_matricula } } : {}),
        },
        order: [['data', 'DESC']],
        limit: 10,
      });

      if (ultimasAulas.length === 0) continue;

      const aulaIds = ultimasAulas.map((a) => a.id);
      const presencas = await Chamada.findAll({
        where: { aula_id: { [Op.in]: aulaIds }, aluno_id: m.aluno_id },
      });
      const presenteIds = new Set(presencas.map((c) => c.aula_id));

      // Verifica sequência de faltas
      let sequenciaFaltas = 0;
      for (const aula of ultimasAulas) {
        if (!presenteIds.has(aula.id)) sequenciaFaltas++;
        else break;
      }

      // Porcentagem de faltas nas últimas 10 aulas
      const pctFaltas = Math.round(((ultimasAulas.length - presencas.length) / ultimasAulas.length) * 100);

      let cor = null;
      let motivo = null;

      // % de faltas só é avaliado com pelo menos 3 aulas desde a matrícula —
      // senão aluno recém-matriculado com 1 falta em 1 aula já cairia no
      // vermelho (100%).
      if (ultimasAulas.length >= 3 && pctFaltas >= threshold) { cor = 'vermelho'; motivo = `${pctFaltas}% de faltas (limite ${threshold}%)`; }
      else if (sequenciaFaltas >= 14 / 7 * 2) { cor = 'laranja'; motivo = '2+ semanas consecutivas sem presença'; }
      else if (sequenciaFaltas >= 3) { cor = 'amarelo'; motivo = `${sequenciaFaltas} aulas seguidas sem presença`; }

      if (cor) {
        alertas.push({
          aluno: { id: m.Aluno.id, nome: m.Aluno.nome },
          turma: { id: m.Turma.id, nome: m.Turma.nome },
          cor,
          motivo,
          sequencia_faltas: sequenciaFaltas,
          pct_faltas: pctFaltas,
        });
      }
    }

    // Ordena por % de faltas, do maior pro menor — como vermelho só ocorre
    // quando pct_faltas >= threshold e laranja/amarelo só quando é menor
    // que isso, os vermelhos continuam naturalmente no topo, mas agora com
    // ordenação real dentro de cada grupo em vez da ordem arbitrária da
    // consulta.
    alertas.sort((a, b) => b.pct_faltas - a.pct_faltas);

    res.json({ total: alertas.length, alertas });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/dashboard/graduacao — alunos elegíveis para graduação
const graduacao = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const criterios = await CriterioGraduacao.findAll({
      where: { escola_id },
      include: [{ model: Faixa, attributes: ['id', 'nome', 'cor', 'ordem'] }],
    });

    const matriculas = await MatriculaAluno.findAll({
      where: { ativa: true },
      include: [
        { model: Usuario, as: 'Aluno', where: { escola_id, role: 'aluno', ativo: true }, attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor', 'ordem', 'arte_marcial_id'] },
        { model: Turma, attributes: ['id', 'nome', 'arte_marcial_id'] },
      ],
    });

    // Um aluno pode estar matriculado em várias turmas da mesma arte marcial
    // (ex: Karatê às seg-qua 19h E 20h) — agrupa por (aluno, arte) pra contar
    // a presença UMA vez, em vez de avaliar cada matrícula isoladamente.
    const porAlunoArte = new Map();
    for (const m of matriculas) {
      if (!m.FaixaAtual) continue;
      const chave = `${m.aluno_id}:${m.FaixaAtual.arte_marcial_id}`;
      if (!porAlunoArte.has(chave)) {
        porAlunoArte.set(chave, { aluno: m.Aluno, faixaAtual: m.FaixaAtual, turmaNomes: [], turmaIds: [] });
      }
      porAlunoArte.get(chave).turmaNomes.push(m.Turma.nome);
      porAlunoArte.get(chave).turmaIds.push(m.turma_id);
    }

    // Data de início da graduação atual de cada (aluno, arte) — a contagem de
    // presenças precisa ser feita a partir desse marco, não desde sempre.
    const graduacoesAtuais = await GraduacaoAluno.findAll({
      where: { escola_id, atual: true },
      attributes: ['aluno_id', 'arte_marcial_id', 'data_inicio'],
    });
    const inicioGraduacao = new Map(
      graduacoesAtuais.map((g) => [`${g.aluno_id}:${g.arte_marcial_id}`, g.data_inicio])
    );

    // Filtro opcional usado pelo relatório "Frequência: Presença Mínima"
    // (Relatórios → filtra por Programa Marcial); sem o parâmetro, comporta-se
    // como antes (todas as artes marciais).
    const { arte_marcial_id } = req.query;

    const elegiveis = [];

    for (const [chave, grupo] of porAlunoArte) {
      if (arte_marcial_id && grupo.faixaAtual.arte_marcial_id !== arte_marcial_id) continue;
      const criterio = criterios.find(
        (c) => c.arte_marcial_id === grupo.faixaAtual.arte_marcial_id && c.faixa_id === grupo.faixaAtual.id
      );
      if (!criterio) continue;

      const dataInicio = inicioGraduacao.get(chave);
      const aulasPresentes = await presencasDesdeGraduacao(grupo.aluno.id, grupo.faixaAtual.arte_marcial_id, dataInicio);

      if (aulasPresentes >= criterio.min_aulas) {
        elegiveis.push({
          aluno: { id: grupo.aluno.id, nome: grupo.aluno.nome },
          turma: [...new Set(grupo.turmaNomes)].join(', '),
          faixa_atual: grupo.faixaAtual.nome,
          faixa_cor: grupo.faixaAtual.cor || null,
          aulas_desde_graduacao: aulasPresentes,
          min_aulas_criterio: criterio.min_aulas,
        });
      }
    }

    res.json({ total: elegiveis.length, elegiveis });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/dashboard/semaforo-graduacao — prospecção de risco: quantas aulas
// de verdade ainda restam até o próximo exame de faixa (ArteMarcial.
// data_proximo_exame, configurado em Configurações), descontando feriados
// nacionais e considerando só os dias-da-semana das turmas em que o aluno
// está matriculado, versus quantas presenças ainda faltam pra fechar a
// carência da faixa atual. O indicador é o % dessas aulas restantes que o
// aluno precisa comparecer daqui pra frente — diferente do Semáforo de
// Ausência (que olha só o passado). Sem `data_proximo_exame` cadastrada pra
// uma arte, os alunos dela ficam de fora (não dá pra prospectar sem uma
// data-alvo).
const semaforoGraduacao = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const hoje = dataLocalISO(new Date());
    const { arte_marcial_id: filtroArteId } = req.query;

    const artes = await ArteMarcial.findAll({ where: { escola_id } });
    const nomePorArte = new Map(artes.map((a) => [a.id, a.nome]));
    const dataExamePorArte = new Map(
      artes
        .filter((a) => a.data_proximo_exame && (!filtroArteId || a.id === filtroArteId))
        .map((a) => [a.id, a.data_proximo_exame])
    );
    if (dataExamePorArte.size === 0) return res.json({ total: 0, alertas: [] });

    const criterios = await CriterioGraduacao.findAll({
      where: { escola_id },
      include: [{ model: Faixa, attributes: ['id', 'nome', 'cor', 'ordem'] }],
    });

    // Turma precisa estar ativa: uma turma desativada não vai ter mais aula
    // de verdade, então não pode contar como "aula restante" na projeção até
    // o exame (mesmo que a matrícula do aluno nela continue ativa).
    const matriculas = await MatriculaAluno.findAll({
      where: { ativa: true },
      include: [
        { model: Usuario, as: 'Aluno', where: { escola_id, role: 'aluno', ativo: true }, attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor', 'ordem', 'arte_marcial_id'] },
        { model: Turma, attributes: ['id', 'nome', 'arte_marcial_id'], where: { ativa: true } },
      ],
    });

    const porAlunoArte = new Map();
    for (const m of matriculas) {
      if (!m.FaixaAtual) continue;
      if (!dataExamePorArte.has(m.FaixaAtual.arte_marcial_id)) continue;
      const chave = `${m.aluno_id}:${m.FaixaAtual.arte_marcial_id}`;
      if (!porAlunoArte.has(chave)) {
        porAlunoArte.set(chave, { aluno: m.Aluno, faixaAtual: m.FaixaAtual, turmaIds: [] });
      }
      porAlunoArte.get(chave).turmaIds.push(m.turma_id);
    }
    if (porAlunoArte.size === 0) return res.json({ total: 0, alertas: [] });

    const graduacoesAtuais = await GraduacaoAluno.findAll({
      where: { escola_id, atual: true },
      attributes: ['aluno_id', 'arte_marcial_id', 'data_inicio'],
    });
    const inicioGraduacao = new Map(graduacoesAtuais.map((g) => [`${g.aluno_id}:${g.arte_marcial_id}`, g.data_inicio]));

    const todosTurmaIds = [...new Set([...porAlunoArte.values()].flatMap((g) => g.turmaIds))];
    const horarios = await HorarioTurma.findAll({
      where: { turma_id: { [Op.in]: todosTurmaIds } },
      attributes: ['turma_id', 'dia_semana'],
    });
    const diasPorTurma = new Map();
    for (const h of horarios) {
      if (!diasPorTurma.has(h.turma_id)) diasPorTurma.set(h.turma_id, []);
      diasPorTurma.get(h.turma_id).push(h.dia_semana);
    }

    const alertas = [];
    for (const [chave, grupo] of porAlunoArte) {
      const criterio = criterios.find(
        (c) => c.arte_marcial_id === grupo.faixaAtual.arte_marcial_id && c.faixa_id === grupo.faixaAtual.id
      );
      if (!criterio) continue;

      const dataInicio = inicioGraduacao.get(chave);
      const aulasPresentes = await presencasDesdeGraduacao(grupo.aluno.id, grupo.faixaAtual.arte_marcial_id, dataInicio);
      const aulasFaltando = criterio.min_aulas - aulasPresentes;
      if (aulasFaltando <= 0) continue; // já bateu a carência

      const dataExame = dataExamePorArte.get(grupo.faixaAtual.arte_marcial_id);
      const diasDaSemana = grupo.turmaIds.flatMap((id) => diasPorTurma.get(id) || []);
      const aulasRestantes = contarAulasNoIntervalo(diasDaSemana, hoje, dataExame);

      // null = não tem mais nenhuma aula (real) programada antes do exame.
      const percentualNecessario = aulasRestantes > 0 ? Math.round((aulasFaltando / aulasRestantes) * 100) : null;

      let cor = null;
      if (percentualNecessario === null || percentualNecessario > 100) cor = 'vermelho';
      else if (percentualNecessario >= 80) cor = 'laranja';
      else if (percentualNecessario >= 50) cor = 'amarelo';
      if (!cor) continue;

      alertas.push({
        aluno: { id: grupo.aluno.id, nome: grupo.aluno.nome },
        arte_marcial_id: grupo.faixaAtual.arte_marcial_id,
        arte_marcial_nome: nomePorArte.get(grupo.faixaAtual.arte_marcial_id) || null,
        faixa_atual: grupo.faixaAtual.nome,
        faixa_cor: grupo.faixaAtual.cor || null,
        aulas_faltando: aulasFaltando,
        aulas_restantes_ate_exame: aulasRestantes,
        data_exame: dataExame,
        percentual_necessario: percentualNecessario,
        cor,
      });
    }

    alertas.sort((a, b) => (b.percentual_necessario ?? 999) - (a.percentual_necessario ?? 999));

    res.json({ total: alertas.length, alertas });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/dashboard/horas-por-turma — carga horária semanal (soma dos
// HorarioTurma) de cada turma ativa. Professor vê só as turmas onde é
// professor_id (mesma regra de `ehDonoDaTurma`); admin vê todas.
// Valor mensal equivalente do plano de cada aluno (a partir da assinatura
// ATIVA — ignora status de pagamento de propósito: "a receber no mês" conta
// o valor cheio independente de já ter sido pago ou não). Plano trimestral/
// semestral/anual é dividido pelos meses que cobre — R$300 trimestral vale
// R$100/mês pra essa conta, não R$300. Aluno com mais de uma assinatura
// ativa (não devia acontecer, mas o schema não impede) soma as duas.
async function valorMensalPorAluno(alunoIds) {
  const mapa = new Map();
  if (!alunoIds.length) return mapa;
  const assinaturas = await AssinaturaAluno.findAll({
    where: { aluno_id: { [Op.in]: alunoIds }, status: 'ativa' },
    include: [{ model: PlanoMensalidade, as: 'Plano', attributes: ['valor', 'periodicidade'] }],
  });
  for (const a of assinaturas) {
    if (!a.Plano) continue;
    const meses = MESES_POR_PERIODICIDADE[a.Plano.periodicidade] || 1;
    const valorMensal = parseFloat(a.Plano.valor) / meses;
    mapa.set(a.aluno_id, (mapa.get(a.aluno_id) || 0) + valorMensal);
  }
  return mapa;
}

const horasPorTurma = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const souProfessor = req.usuario.role === 'professor';
    const { inicio: inicioMes, fim: fimMes } = intervaloMesAtual();

    const turmas = await Turma.findAll({
      where: { escola_id, ativa: true, ...(souProfessor ? { professor_id: req.usuario.id } : {}) },
      include: [
        { model: Usuario, as: 'Professor', attributes: ['id', 'nome'] },
        { model: HorarioTurma, attributes: ['dia_semana', 'hora_inicio', 'hora_fim'] },
      ],
    });

    const turmaIds = turmas.map((t) => t.id);
    const matriculas = turmaIds.length
      ? await MatriculaAluno.findAll({ where: { turma_id: { [Op.in]: turmaIds }, ativa: true }, attributes: ['turma_id', 'aluno_id'] })
      : [];
    const alunoIdsPorTurma = new Map();
    for (const m of matriculas) {
      if (!alunoIdsPorTurma.has(m.turma_id)) alunoIdsPorTurma.set(m.turma_id, []);
      alunoIdsPorTurma.get(m.turma_id).push(m.aluno_id);
    }
    const valorPorAluno = await valorMensalPorAluno([...new Set(matriculas.map((m) => m.aluno_id))]);

    const linhas = turmas.map((t) => {
      const horas_semana = t.HorarioTurmas.reduce(
        (soma, h) => soma + (horaParaFracao(h.hora_fim) - horaParaFracao(h.hora_inicio)),
        0
      );
      const horas_mes = horasNoMes(t.HorarioTurmas, inicioMes, fimMes);
      const alunoIds = alunoIdsPorTurma.get(t.id) || [];
      const valor_mes = alunoIds.reduce((soma, id) => soma + (valorPorAluno.get(id) || 0), 0);
      return {
        id: t.id,
        nome: t.nome,
        professor: t.Professor?.nome || null,
        aulas_semana: t.HorarioTurmas.length,
        horas_semana: Math.round(horas_semana * 100) / 100,
        horas_mes: Math.round(horas_mes * 100) / 100,
        valor_mes: Math.round(valor_mes * 100) / 100,
        valor_hora: horas_mes > 0 ? Math.round((valor_mes / horas_mes) * 100) / 100 : null,
      };
    });

    linhas.sort((a, b) => b.horas_semana - a.horas_semana || a.nome.localeCompare(b.nome));
    const total_horas_semana = Math.round(linhas.reduce((s, l) => s + l.horas_semana, 0) * 100) / 100;
    const total_horas_mes = Math.round(linhas.reduce((s, l) => s + l.horas_mes, 0) * 100) / 100;
    const total_valor_mes = Math.round(linhas.reduce((s, l) => s + l.valor_mes, 0) * 100) / 100;
    const valor_hora_medio = total_horas_mes > 0 ? Math.round((total_valor_mes / total_horas_mes) * 100) / 100 : null;

    res.json({ turmas: linhas, total_horas_semana, total_horas_mes, total_valor_mes, valor_hora_medio });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/dashboard/horas-por-local — mesma carga horária semanal de
// `horasPorTurma`, mas agrupada por Sala (local físico) em vez de por
// turma — uma sala pode receber várias turmas, então soma-se o
// `HorarioTurma` de todas elas. Mesma regra de visibilidade por role.
const horasPorLocal = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const souProfessor = req.usuario.role === 'professor';
    const { inicio: inicioMes, fim: fimMes } = intervaloMesAtual();

    const horarios = await HorarioTurma.findAll({
      attributes: ['dia_semana', 'hora_inicio', 'hora_fim'],
      include: [
        {
          model: Turma, attributes: ['id', 'nome'],
          where: { escola_id, ativa: true, ...(souProfessor ? { professor_id: req.usuario.id } : {}) },
        },
        { model: Sala, attributes: ['id', 'nome'] },
      ],
    });

    const turmaIds = [...new Set(horarios.map((h) => h.Turma.id))];
    const matriculas = turmaIds.length
      ? await MatriculaAluno.findAll({ where: { turma_id: { [Op.in]: turmaIds }, ativa: true }, attributes: ['turma_id', 'aluno_id'] })
      : [];
    const alunoIdsPorTurma = new Map();
    for (const m of matriculas) {
      if (!alunoIdsPorTurma.has(m.turma_id)) alunoIdsPorTurma.set(m.turma_id, []);
      alunoIdsPorTurma.get(m.turma_id).push(m.aluno_id);
    }
    const valorPorAluno = await valorMensalPorAluno([...new Set(matriculas.map((m) => m.aluno_id))]);

    // valor mensal de cada turma (mesma regra de `horasPorTurma`) e sua
    // carga horária mensal total, pra ratear o valor entre os locais dela
    // proporcionalmente às horas de cada um (turma que dá aula em mais de
    // um local — raro, mas o schema permite — não deveria contar o valor
    // cheio em cada local).
    const horariosPorTurma = new Map();
    for (const h of horarios) {
      if (!horariosPorTurma.has(h.Turma.id)) horariosPorTurma.set(h.Turma.id, []);
      horariosPorTurma.get(h.Turma.id).push(h);
    }
    const valorMesPorTurma = new Map();
    const horasMesPorTurma = new Map();
    for (const [turmaId, hs] of horariosPorTurma) {
      const alunoIds = alunoIdsPorTurma.get(turmaId) || [];
      valorMesPorTurma.set(turmaId, alunoIds.reduce((soma, id) => soma + (valorPorAluno.get(id) || 0), 0));
      horasMesPorTurma.set(turmaId, horasNoMes(hs, inicioMes, fimMes));
    }

    const porLocal = new Map();
    for (const h of horarios) {
      const sala = h.Sala;
      if (!porLocal.has(sala.id)) porLocal.set(sala.id, { id: sala.id, nome: sala.nome, turmas: new Set(), aulas_semana: 0, horas_semana: 0, horas_mes: 0, valor_mes: 0 });
      const grupo = porLocal.get(sala.id);
      grupo.turmas.add(h.Turma.nome.split('\n')[0]);
      grupo.aulas_semana += 1;
      grupo.horas_semana += horaParaFracao(h.hora_fim) - horaParaFracao(h.hora_inicio);

      const horasMesDesseHorario = horasNoMes([h], inicioMes, fimMes);
      grupo.horas_mes += horasMesDesseHorario;
      const horasMesTurmaTotal = horasMesPorTurma.get(h.Turma.id) || 0;
      const fracao = horasMesTurmaTotal > 0 ? horasMesDesseHorario / horasMesTurmaTotal : 0;
      grupo.valor_mes += (valorMesPorTurma.get(h.Turma.id) || 0) * fracao;
    }

    const linhas = [...porLocal.values()].map((g) => ({
      id: g.id,
      nome: g.nome,
      turmas: [...g.turmas],
      aulas_semana: g.aulas_semana,
      horas_semana: Math.round(g.horas_semana * 100) / 100,
      horas_mes: Math.round(g.horas_mes * 100) / 100,
      valor_mes: Math.round(g.valor_mes * 100) / 100,
      valor_hora: g.horas_mes > 0 ? Math.round((g.valor_mes / g.horas_mes) * 100) / 100 : null,
    }));

    linhas.sort((a, b) => b.horas_semana - a.horas_semana || a.nome.localeCompare(b.nome));
    const total_horas_semana = Math.round(linhas.reduce((s, l) => s + l.horas_semana, 0) * 100) / 100;
    const total_horas_mes = Math.round(linhas.reduce((s, l) => s + l.horas_mes, 0) * 100) / 100;
    const total_valor_mes = Math.round(linhas.reduce((s, l) => s + l.valor_mes, 0) * 100) / 100;
    const valor_hora_medio = total_horas_mes > 0 ? Math.round((total_valor_mes / total_horas_mes) * 100) / 100 : null;

    res.json({ locais: linhas, total_horas_semana, total_horas_mes, total_valor_mes, valor_hora_medio });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/dashboard/ausencias — cenário de ausências para os gráficos do
// Dashboard: tendência semanal (últimas 12 semanas) e ranking de turmas/locais
// com mais faltas nos últimos 30 dias. "Ausentes" por aula = matriculados
// ativos da turma hoje (não dá pra reconstruir matrícula histórica) menos
// quem tem Chamada nela — mesma aproximação do Semáforo de Ausência.
const ausencias = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const souProfessor = req.usuario.role === 'professor';
    const hoje = new Date();
    const dataFim = dataLocalISO(hoje);
    const inicio30 = new Date(hoje); inicio30.setDate(hoje.getDate() - 30);
    const dataInicio30 = dataLocalISO(inicio30);
    const inicio12Semanas = new Date(hoje); inicio12Semanas.setDate(hoje.getDate() - 7 * 12);
    const dataInicio12Semanas = dataLocalISO(inicio12Semanas);

    const turmas = await Turma.findAll({
      // tipo 'treino_extra' é a turma oculta do módulo de Treino Extra — não
      // tem Sala nem matrícula real, não deve entrar nas métricas de ausência.
      where: { escola_id, tipo: 'regular', ...(souProfessor ? { professor_id: req.usuario.id } : {}) },
      attributes: ['id', 'nome'],
    });
    const turmaIds = turmas.map((t) => t.id);
    if (turmaIds.length === 0) return res.json({ tendencia_semanal: [], por_turma: [], por_local: [] });
    const nomePorTurma = new Map(turmas.map((t) => [t.id, t.nome.split('\n')[0]]));

    const matriculasAtivas = await MatriculaAluno.findAll({
      where: { turma_id: { [Op.in]: turmaIds }, ativa: true },
      attributes: ['turma_id'],
    });
    const matriculadosPorTurma = new Map();
    for (const m of matriculasAtivas) {
      matriculadosPorTurma.set(m.turma_id, (matriculadosPorTurma.get(m.turma_id) || 0) + 1);
    }

    const aulas = await Aula.findAll({
      where: { turma_id: { [Op.in]: turmaIds }, status: 'fechada', data: { [Op.gte]: dataInicio12Semanas, [Op.lte]: dataFim } },
      attributes: ['id', 'turma_id', 'sala_id', 'data'],
      include: [{ model: Chamada, attributes: ['id'] }, { model: Sala, attributes: ['id', 'nome'] }],
    });

    // Semana começando na segunda-feira (0=Dom..6=Sáb no getDay()).
    const inicioDaSemana = (isoDate) => {
      const d = new Date(isoDate + 'T00:00:00');
      const deslocamento = d.getDay() === 0 ? 6 : d.getDay() - 1;
      d.setDate(d.getDate() - deslocamento);
      return dataLocalISO(d);
    };

    const semanas = new Map();
    const porTurma = new Map();
    const porLocal = new Map();
    const acumula = (mapa, chave, ausentes, matriculados, extra) => {
      if (!mapa.has(chave)) mapa.set(chave, { aulas: 0, ausencias: 0, esperado: 0, ...extra });
      const b = mapa.get(chave);
      b.aulas += 1; b.ausencias += ausentes; b.esperado += matriculados;
    };

    for (const a of aulas) {
      const matriculados = matriculadosPorTurma.get(a.turma_id) || 0;
      const ausentes = Math.max(0, matriculados - a.Chamadas.length);

      acumula(semanas, inicioDaSemana(a.data), ausentes, matriculados);
      if (a.data >= dataInicio30) {
        acumula(porTurma, a.turma_id, ausentes, matriculados);
        acumula(porLocal, a.sala_id, ausentes, matriculados, { nome: a.Sala.nome });
      }
    }

    const taxa = (v) => (v.esperado > 0 ? Math.round((v.ausencias / v.esperado) * 1000) / 10 : 0);

    const tendenciaSemanal = [...semanas.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, v]) => ({ semana, aulas: v.aulas, ausencias: v.ausencias, taxa: taxa(v) }));

    const rankear = (mapa, nomeDe) => [...mapa.entries()]
      .map(([id, v]) => ({ id, nome: nomeDe(id, v), aulas: v.aulas, ausencias: v.ausencias, taxa: taxa(v) }))
      .filter((x) => x.ausencias > 0)
      .sort((a, b) => b.ausencias - a.ausencias)
      .slice(0, 8);

    res.json({
      tendencia_semanal: tendenciaSemanal,
      por_turma: rankear(porTurma, (id) => nomePorTurma.get(id) || '—'),
      por_local: rankear(porLocal, (_id, v) => v.nome),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { resumo, semaforo, graduacao, semaforoGraduacao, horasPorTurma, horasPorLocal, ausencias };
