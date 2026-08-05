const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {
  Escola, Usuario, Turma, Aula, Chamada, MatriculaAluno, Mensalidade, Pagamento,
  CriterioGraduacao, Faixa, GraduacaoAluno, ArteMarcial, HorarioTurma,
} = require('../models');
const { dataLocalISO } = require('../utils/data');
const { feriadosNoIntervalo } = require('../utils/feriados');

// Presenças (Chamada) do aluno em qualquer turma da arte marcial dada, desde
// o início da graduação atual — mesma base usada em `graduacao` e em
// `relatoriosController.frequenciaPercentual`. Trocar de turma/horário no
// meio da graduação não deveria "resetar" carência já cumprida.
async function presencasDesdeGraduacao(aluno_id, arte_marcial_id, dataInicio) {
  if (!dataInicio) return 0;
  return Chamada.count({
    where: { aluno_id },
    include: [{
      model: Aula,
      attributes: [],
      where: { data: { [Op.gte]: dataInicio } },
      include: [{ model: Turma, attributes: [], where: { arte_marcial_id } }],
    }],
  });
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

    const [totalAlunos, totalTurmas, aulasPeriodo] = await Promise.all([
      Usuario.count({ where: { escola_id, role: 'aluno', ativo: true } }),
      Turma.count({ where: { escola_id, ativa: true } }),
      Aula.findAll({
        where: { data: { [Op.between]: [dataInicio, dataFim] }, status: 'fechada' },
        include: [{ model: Chamada, attributes: ['aluno_id'] }],
      }),
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

    res.json({
      periodo: { inicio: dataInicio, fim: dataFim },
      alunos: { total: totalAlunos },
      turmas: { total: totalTurmas },
      frequencia: { aulas_periodo: totalAulas, media_presentes: Number(mediaPresenca) },
      financeiro: { mensalidades_pendentes: mensalidadesPendentes, receita_mes: receitaMes || 0 },
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
        { model: Turma, attributes: ['id', 'nome'] },
      ],
    });

    const alertas = [];

    for (const m of matriculas) {
      // Busca últimas aulas da turma
      const ultimasAulas = await Aula.findAll({
        where: { turma_id: m.turma_id, status: 'fechada' },
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

      if (pctFaltas >= threshold) { cor = 'vermelho'; motivo = `${pctFaltas}% de faltas (limite ${threshold}%)`; }
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

    const artes = await ArteMarcial.findAll({ where: { escola_id } });
    const dataExamePorArte = new Map(
      artes.filter((a) => a.data_proximo_exame).map((a) => [a.id, a.data_proximo_exame])
    );
    if (dataExamePorArte.size === 0) return res.json({ total: 0, alertas: [] });

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

module.exports = { resumo, semaforo, graduacao, semaforoGraduacao };
