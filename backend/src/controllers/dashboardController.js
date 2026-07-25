const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Escola, Usuario, Turma, Aula, Chamada, MatriculaAluno, Mensalidade, Pagamento, CriterioGraduacao, Faixa } = require('../models');
const { dataLocalISO } = require('../utils/data');

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

    // Ordena: vermelho > laranja > amarelo
    const ordem = { vermelho: 0, laranja: 1, amarelo: 2 };
    alertas.sort((a, b) => ordem[a.cor] - ordem[b.cor]);

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

    const elegiveis = [];

    for (const m of matriculas) {
      if (!m.FaixaAtual) continue;
      const criterio = criterios.find(
        (c) => c.arte_marcial_id === m.FaixaAtual.arte_marcial_id && c.faixa_id === m.FaixaAtual.id
      );
      if (!criterio) continue;
      if (m.aulas_desde_graduacao >= criterio.min_aulas) {
        elegiveis.push({
          aluno: { id: m.Aluno.id, nome: m.Aluno.nome },
          turma: m.Turma.nome,
          faixa_atual: m.FaixaAtual.nome,
          aulas_desde_graduacao: m.aulas_desde_graduacao,
          min_aulas_criterio: criterio.min_aulas,
        });
      }
    }

    res.json({ total: elegiveis.length, elegiveis });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { resumo, semaforo, graduacao };
