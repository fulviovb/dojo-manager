// Rótulos, filtros e exportação da Gestão do Exame — compartilhados entre a
// tela (components/exame) e as páginas de impressão (ExameListasPage).
export const moeda = (v) => 'R$\u00a0' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatData = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

export const SITUACAO = {
  isento: { label: 'Isento', cor: '#6a1b9a' },
  pendente: { label: 'Pendente', cor: '#ef6c00' },
  parcial: { label: 'Parcial', cor: '#1565c0' },
  pago: { label: 'Pago', cor: '#2e7d32' },
  atrasado: { label: 'Atrasado', cor: '#c62828' },
  sem_taxa: { label: 'Sem taxa', cor: '#888' },
  nao_pediu: { label: '—', cor: '#888' },
};
export const INSCRICAO = {
  indicado: { label: 'Indicado', cor: '#8d6e00' },
  confirmado: { label: 'Confirmado', cor: '#2e7d32' },
  desistiu: { label: 'Desistiu', cor: '#888' },
};
export const PEDIDO = { sim: 'Sim', nao: 'Não', sem_resposta: 'Sem resposta' };
export const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência' };
export const FILTROS_VAZIOS = { busca: '', turma: '', faixa: '', inscricao: '', pagamento: '', pedido: '', carencia: '' };

const normalizar = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const filtrar = (lista, f) => lista.filter((c) => (
  (!f.busca || normalizar(c.aluno.nome).includes(normalizar(f.busca)))
  && (!f.turma || c.turma?.id === f.turma)
  && (!f.faixa || c.faixa_pretendida?.id === f.faixa)
  && (!f.inscricao || c.status_inscricao === f.inscricao)
  && (!f.pagamento || c.financeiro.taxa.situacao === f.pagamento)
  && (!f.pedido || c.quer_comprar === f.pedido)
  && (!f.carencia || c.carencia?.situacao === f.carencia)
));

export const textoCarencia = (c) => {
  if (!c) return '—';
  return c.min_aulas == null ? `${c.aulas} (sem critério)` : `${c.aulas}/${c.min_aulas}`;
};
export const textoPedido = (c) => (c.quer_comprar === 'sim' ? c.pedido.tamanho : c.quer_comprar === 'nao' ? 'não' : '—');

export const ativos = (lista) => lista.filter((c) => c.status_inscricao !== 'desistiu');
export const saldoTotal = (c) => c.financeiro.taxa.saldo + c.financeiro.faixa.saldo;
export const pendentes = (lista) => ativos(lista).filter((c) => saldoTotal(c) > 0);
export const diasAtraso = (exame, hoje) => (exame.prazo_pagamento && hoje > exame.prazo_pagamento
  ? Math.round((new Date(hoje) - new Date(exame.prazo_pagamento)) / 86400000) : 0);

// Pedido consolidado: cor × tamanho
export const consolidarFaixas = (lista) => {
  const grupos = new Map();
  for (const c of ativos(lista).filter((x) => x.quer_comprar === 'sim')) {
    const chave = `${c.pedido.faixa?.id}|${c.pedido.tamanho.toUpperCase()}`;
    if (!grupos.has(chave)) grupos.set(chave, { faixa: c.pedido.faixa, tamanho: c.pedido.tamanho.toUpperCase(), quantidade: 0, entregues: 0, total: 0 });
    const g = grupos.get(chave);
    g.quantidade += 1;
    g.entregues += c.pedido.entregue ? 1 : 0;
    g.total = Math.round((g.total + c.pedido.valor) * 100) / 100;
  }
  return [...grupos.values()].sort((a, b) => (a.faixa?.ordem ?? 99) - (b.faixa?.ordem ?? 99) || a.tamanho.localeCompare(b.tamanho, 'pt-BR', { numeric: true }));
};

// CSV pro Excel em português: BOM + ';'. Texto começando com =,+,-,@ ganha
// apóstrofo pra não virar fórmula.
export const baixarCSV = (nome, cabecalho, linhas) => {
  const celula = (v) => {
    if (typeof v === 'number') return String(v).replace('.', ',');
    let t = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = '﻿' + [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${nome.replace(/[^\p{L}\p{N}]+/gu, '-')}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const csvCandidatos = (exame, lista) => baixarCSV(`candidatos ${exame.nome}`,
  ['Aluno', 'Idade', 'Responsável', 'Telefone', 'Turma', 'Faixa atual', 'Faixa pretendida', 'Aulas na faixa', 'Mínimo', 'Inscrição',
    'Taxa', 'Desconto', 'Motivo', 'Devido', 'Pago', 'Saldo', 'Situação', 'Quer faixa', 'Cor', 'Tamanho', 'Valor faixa', 'Pago faixa', 'Entregue', 'Presença', 'Resultado', 'Observações'],
  lista.map((c) => [c.aluno.nome, c.aluno.idade ?? '', c.responsavel, c.aluno.telefone, c.turma?.nome, c.faixa_atual?.nome, c.faixa_pretendida?.nome,
    c.carencia?.aulas ?? '', c.carencia?.min_aulas ?? '', INSCRICAO[c.status_inscricao].label,
    c.financeiro.valor_taxa, c.desconto, c.motivo_desconto, c.financeiro.taxa.devido, c.financeiro.taxa.pago, c.financeiro.taxa.saldo, SITUACAO[c.financeiro.taxa.situacao].label,
    PEDIDO[c.quer_comprar], c.quer_comprar === 'sim' ? c.pedido.faixa?.nome : '', c.quer_comprar === 'sim' ? c.pedido.tamanho : '', c.financeiro.faixa.devido, c.financeiro.faixa.pago, c.pedido?.entregue ? 'Sim' : '',
    c.presenca || '', c.resultado === 'nao_aprovado' ? 'não aprovado' : c.resultado || '', c.observacoes]));

export const csvFaixas = (exame, lista) => baixarCSV(`pedido de faixas ${exame.nome}`,
  ['Cor', 'Tamanho', 'Quantidade', 'Total'],
  consolidarFaixas(lista).map((g) => [g.faixa?.nome, g.tamanho, g.quantidade, g.total]));

// Cobrança pra colar no WhatsApp (RF-17)
export const textoCobranca = (exame, c) => {
  const { taxa, faixa } = c.financeiro;
  const partes = [];
  if (taxa.saldo > 0) partes.push(`• Taxa do exame: ${moeda(taxa.saldo)}${taxa.pago > 0 ? ` (já pago ${moeda(taxa.pago)})` : ''}`);
  if (faixa.saldo > 0) partes.push(`• Faixa ${c.pedido?.faixa?.nome || ''} tamanho ${c.pedido?.tamanho || ''}: ${moeda(faixa.saldo)}${faixa.pago > 0 ? ` (já pago ${moeda(faixa.pago)})` : ''}`);
  return [
    `Olá${c.responsavel ? `, ${c.responsavel}` : ''}! 🥋`,
    `Sobre o ${exame.nome} (${formatData(exame.data)}) — ${c.aluno.nome}, faixa ${c.faixa_pretendida?.nome}:`,
    ...partes,
    `Total pendente: ${moeda(saldoTotal(c))}`,
    exame.prazo_pagamento ? `Prazo: ${formatData(exame.prazo_pagamento)}` : null,
    'Se já pagou, por favor desconsidere. Oss!',
  ].filter(Boolean).join('\n');
};

// navigator.clipboard só existe em https/localhost; no celular, pela rede
// local (http), cai pro execCommand.
export const copiarTexto = async (texto) => {
  try { await navigator.clipboard.writeText(texto); return true; } catch (e) { /* fallback abaixo */ }
  const ta = document.createElement('textarea');
  ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  return ok;
};
