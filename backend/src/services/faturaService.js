const { AssinaturaAluno, Mensalidade, PlanoMensalidade, Usuario } = require('../models');
const { dataLocalISO } = require('../utils/data');

const MESES_POR_PERIODICIDADE = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
const ANTECEDENCIA_GERACAO_DIAS = 5;

function ultimoDiaDoMes(ano, mes) {
  // mes 0-indexado — dia 0 do mês seguinte é o último dia do mês atual
  return new Date(ano, mes + 1, 0).getDate();
}

// Vencimento de um ciclo específico, com clamp de fim de mês (ex: dia 31
// configurado cai no dia 28/29 em fevereiro, nunca "vaza" pro mês seguinte).
function calcularVencimento(ano, mes, diaVencimento) {
  const dia = Math.min(diaVencimento, ultimoDiaDoMes(ano, mes));
  return dataLocalISO(new Date(ano, mes, dia));
}

function calcularPrimeiroVencimento(dataInicioISO, diaVencimento) {
  const inicio = new Date(dataInicioISO + 'T00:00:00');
  let candidato = calcularVencimento(inicio.getFullYear(), inicio.getMonth(), diaVencimento);
  if (candidato < dataInicioISO) {
    candidato = calcularVencimento(inicio.getFullYear(), inicio.getMonth() + 1, diaVencimento);
  }
  return candidato;
}

function proximoCiclo(vencimentoAtualISO, diaVencimento, mesesIntervalo) {
  const atual = new Date(vencimentoAtualISO + 'T00:00:00');
  return calcularVencimento(atual.getFullYear(), atual.getMonth() + mesesIntervalo, diaVencimento);
}

// Gera (idempotente) todas as faturas pendentes de ciclos que já entraram
// na janela de antecedência (venc <= hoje + ANTECEDENCIA_GERACAO_DIAS) de
// todas as assinaturas ativas da escola. Sem cron: chamada no início de
// leituras relevantes, igual ao padrão de aulasController.gerarAulasPorData.
// A fatura mantém a data_vencimento real — só a geração antecipa.
async function gerarFaturasPendentes(escola_id) {
  const limiteGeracao = dataLocalISO(new Date(Date.now() + ANTECEDENCIA_GERACAO_DIAS * 24 * 60 * 60 * 1000));

  const assinaturas = await AssinaturaAluno.findAll({
    where: { escola_id, status: 'ativa' },
    include: [{ model: PlanoMensalidade, as: 'Plano' }],
  });

  for (const assinatura of assinaturas) {
    const meses = MESES_POR_PERIODICIDADE[assinatura.Plano.periodicidade] || 1;
    let venc = assinatura.proximo_vencimento;

    while (venc <= limiteGeracao) {
      await Mensalidade.findOrCreate({
        where: { assinatura_id: assinatura.id, data_vencimento: venc },
        defaults: {
          aluno_id: assinatura.aluno_id,
          plano_id: assinatura.plano_id,
          assinatura_id: assinatura.id,
          mes_referencia: venc,
          data_vencimento: venc,
          valor: assinatura.Plano.valor,
          status: 'pendente',
        },
      });
      venc = proximoCiclo(venc, assinatura.dia_vencimento, meses);
    }

    if (venc !== assinatura.proximo_vencimento) {
      await assinatura.update({ proximo_vencimento: venc });
    }
  }
}

// Gera (ou reaproveita, se já existir) a fatura do ciclo atual de uma
// assinatura antes do vencimento normal — para quem quer pagar adiantado.
// Idempotente: se a assinatura já tem uma fatura pendente em aberto (gerada
// antecipadamente ou não), reaproveita ela em vez de criar outra — só avança
// pro próximo ciclo depois que a fatura pendente atual for paga/cancelada.
async function gerarFaturaAntecipada(assinatura) {
  const pendenteExistente = await Mensalidade.findOne({
    where: { assinatura_id: assinatura.id, status: 'pendente' },
    order: [['data_vencimento', 'DESC']],
  });
  if (pendenteExistente) return { fatura: pendenteExistente, criada: false };

  const plano = assinatura.Plano || await assinatura.getPlano();
  const meses = MESES_POR_PERIODICIDADE[plano.periodicidade] || 1;

  const [fatura, criada] = await Mensalidade.findOrCreate({
    where: { assinatura_id: assinatura.id, data_vencimento: assinatura.proximo_vencimento },
    defaults: {
      aluno_id: assinatura.aluno_id,
      plano_id: assinatura.plano_id,
      assinatura_id: assinatura.id,
      mes_referencia: assinatura.proximo_vencimento,
      data_vencimento: assinatura.proximo_vencimento,
      valor: plano.valor,
      status: 'pendente',
    },
  });

  if (criada) {
    const proximo = proximoCiclo(assinatura.proximo_vencimento, assinatura.dia_vencimento, meses);
    await assinatura.update({ proximo_vencimento: proximo });
  }

  return { fatura, criada };
}

module.exports = {
  calcularPrimeiroVencimento,
  proximoCiclo,
  gerarFaturasPendentes,
  gerarFaturaAntecipada,
};
