// Situação financeira de um candidato (RN-08 a RN-12). Nada disso é gravado:
// sempre calculado a partir dos lançamentos. Contas em centavos.
const cent = (v) => Math.round(Number(v || 0) * 100);
const real = (c) => c / 100;

// Taxa da faixa pretendida; sem preço próprio, a taxa padrão do exame
const taxaHerdada = (participante, exame) => exame.taxas_por_faixa?.[participante.faixa_pretendida_id] ?? exame.taxa_padrao;

const situacaoDe = ({ devido, pago, prazo, hoje }) => {
  if (pago >= devido) return 'pago';
  if (prazo && hoje > prazo) return 'atrasado';
  return pago > 0 ? 'parcial' : 'pendente';
};

const bloco = (devido, pago, situacao) => ({
  devido: real(devido), pago: real(pago),
  saldo: real(Math.max(0, devido - pago)),
  credito: real(Math.max(0, pago - devido)),
  situacao,
});

function resumoFinanceiro(participante, exame, hoje) {
  const validos = (participante.Pagamentos || []).filter((p) => !p.estornado_em);
  const somar = (ref) => validos.filter((p) => p.referente === ref).reduce((s, p) => s + cent(p.valor), 0);

  const bruto = cent(participante.valor_taxa ?? taxaHerdada(participante, exame));
  const devidoTaxa = participante.isento ? 0 : Math.max(0, bruto - cent(participante.desconto));
  const pagoTaxa = somar('taxa');
  let sitTaxa;
  if (participante.isento) sitTaxa = 'isento';
  else if (bruto === 0) sitTaxa = 'sem_taxa'; // taxa ainda não definida
  else sitTaxa = situacaoDe({ devido: devidoTaxa, pago: pagoTaxa, prazo: exame.prazo_pagamento, hoje });

  const pedido = participante.PedidoFaixa;
  const pediu = pedido?.quer_comprar === 'sim';
  const devidoFaixa = pediu ? cent(pedido.valor) : 0;
  const pagoFaixa = somar('faixa');
  const sitFaixa = pediu
    ? situacaoDe({ devido: devidoFaixa, pago: pagoFaixa, prazo: exame.prazo_pagamento, hoje })
    : 'nao_pediu';

  return {
    valor_taxa: real(bruto),
    taxa: bloco(devidoTaxa, pagoTaxa, sitTaxa),
    faixa: bloco(devidoFaixa, pagoFaixa, sitFaixa),
  };
}

// Desistente não entra no previsto/pendente, mas o que ele pagou é recebido.
function totaisDoExame(linhas) {
  const t = {
    inscritos: 0, confirmados: 0, desistentes: 0, faixas_pedidas: 0, credito_a_devolver: 0, pago_por_desistentes: 0,
    taxa: { previsto: 0, recebido: 0, pendente: 0 }, faixa: { previsto: 0, recebido: 0, pendente: 0 },
  };
  for (const l of linhas) {
    const desistiu = l.status_inscricao === 'desistiu';
    if (desistiu) t.desistentes += 1; else t.inscritos += 1;
    if (l.status_inscricao === 'confirmado') t.confirmados += 1;
    if (!desistiu && l.quer_comprar === 'sim') t.faixas_pedidas += 1;
    for (const ref of ['taxa', 'faixa']) {
      t[ref].recebido += cent(l.financeiro[ref].pago);
      if (desistiu) { t.pago_por_desistentes += cent(l.financeiro[ref].pago); continue; }
      t[ref].previsto += cent(l.financeiro[ref].devido);
      t[ref].pendente += cent(l.financeiro[ref].saldo);
      t.credito_a_devolver += cent(l.financeiro[ref].credito);
    }
  }
  for (const ref of ['taxa', 'faixa']) for (const k of Object.keys(t[ref])) t[ref][k] = real(t[ref][k]);
  t.credito_a_devolver = real(t.credito_a_devolver);
  t.pago_por_desistentes = real(t.pago_por_desistentes);
  return t;
}

module.exports = { resumoFinanceiro, totaisDoExame, taxaHerdada, cent, real };
