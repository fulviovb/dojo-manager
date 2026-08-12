// Script one-off: dados migrados do iDojo trouxeram Mensalidades com
// status='pago' mas sem nenhum registro de Pagamento associado (o iDojo não
// exportou o histórico de pagamento em si, só o status final) — por isso a
// coluna "Pagamento" da tela de Faturas ficava em branco pra tudo antes de
// agosto/2026 (mês em que o sistema entrou no ar e passou a criar o
// Pagamento de verdade a cada registro). Pedido do usuário: considerar
// todas pagas e preencher uma data de pagamento — dia 5 do mês de
// referência de cada fatura (não a data de vencimento real, que varia por
// aluno). Idempotente: só cria Pagamento pra quem ainda não tem nenhum.
// Rodar uma única vez:
//   docker compose exec backend node src/scripts/2026-08-backfill-pagamentos-migrados.js
const { Mensalidade, Pagamento } = require('../models');

const OBSERVACAO = 'Pagamento migrado do iDojo — dia 5 do mês de referência usado como data de pagamento (dado histórico real não disponível).';

async function main() {
  const pagas = await Mensalidade.findAll({ where: { status: 'pago' }, include: [{ model: Pagamento }] });
  const semPagamento = pagas.filter((m) => (m.Pagamentos || []).length === 0);

  let criados = 0;
  for (const m of semPagamento) {
    const mesRef = m.mes_referencia.slice(0, 7);
    await Pagamento.create({
      mensalidade_id: m.id,
      valor_pago: m.valor,
      data_pagamento: `${mesRef}-05`,
      forma_pagamento: 'dinheiro',
      observacao: OBSERVACAO,
    });
    criados++;
  }
  console.log(`✓ ${criados} pagamento(s) retroativo(s) criado(s) (${pagas.length - semPagamento.length} já tinham Pagamento e foram ignorados).`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao rodar backfill:', e);
  process.exit(1);
});
