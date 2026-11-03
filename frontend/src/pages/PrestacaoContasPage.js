import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';

// Relatório de prestação de contas das bolsas do Incentivo ao Esporte.
// Página standalone (padrão de RelatorioPage): aberta em nova aba, com
// Imprimir/Salvar PDF e Exportar XLS. Um atleta (?bolsa_id=) ou todos do ano
// (?ano=, opcional &atleta= com o filtro da tela) — neste caso abre com um
// resumo geral e depois uma seção por atleta, cada uma em página nova.
//
// Regra (mesma do backend, alocarGastos/cobertura): todo gasto é do ano da
// bolsa; suplementação só é coberta por gasto do 2º semestre; a sobra do 2º
// semestre + os gastos do 1º cobrem a bolsa.

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SITUACAO = {
  em_andamento: 'Em andamento', entregue: 'Prestação entregue', aprovada: 'Aprovada', pendencia: 'Com pendência',
};
const COR = {
  tinta: '#1e2a38', texto2: '#555', mudo: '#888', linha: '#e6e6e6',
  barra: '#1565c0', comprovado: '#2e7d32', semComprovante: '#f9a825', vazio: '#eceff1',
  ok: '#2e7d32', alerta: '#ef6c00', critico: '#c62828',
};

const num = (v) => Math.round(parseFloat(v || 0) * 100) / 100;
const moeda = (v) => (v == null ? '—' : num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const pct = (parte, todo) => (todo > 0 ? `${Math.round((parte / todo) * 1000) / 10}%`.replace('.', ',') : '—');
const data = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
const segundoSemestre = (iso) => !!iso && iso.slice(5) >= '07-01';
// Dias restantes contando hoje (mesma conta da aba Bolsas recebidas).
const diasEntre = (de, ate) => Math.round((new Date(`${ate}T12:00:00`) - new Date(`${de}T12:00:00`)) / 86400000) + 1;

// Cobertura das duas verbas por um conjunto de gastos (espelho do backend).
function cobertura(bolsa, gastos) {
  const valorBolsa = num(bolsa.valor_bolsa);
  const valorSup = bolsa.valor_suplementacao == null ? 0 : num(bolsa.valor_suplementacao);
  const total = num(gastos.reduce((s, g) => s + num(g.valor), 0));
  const seg = num(gastos.filter(g => segundoSemestre(g.data_despesa)).reduce((s, g) => s + num(g.valor), 0));
  const sup = num(Math.min(valorSup, seg));
  const bol = num(Math.min(valorBolsa, total - sup));
  return { total, sup, bol, coberto: num(sup + bol) };
}

// Todos os números do relatório de um atleta.
function analisar(bolsa, categorias, hoje) {
  const gastos = bolsa.Despesas || [];
  const valorBolsa = num(bolsa.valor_bolsa);
  const temSup = bolsa.valor_suplementacao != null;
  const valorSup = temSup ? num(bolsa.valor_suplementacao) : 0;
  const recebido = num(valorBolsa + valorSup);

  const lanc = cobertura(bolsa, gastos);
  const comp = cobertura(bolsa, gastos.filter(g => g.comprovante_url));
  const decl = cobertura(bolsa, gastos.filter(g => g.prestado_contas));

  const verbas = [
    { nome: 'Bolsa', regra: `qualquer data de ${bolsa.ano}`, recebido: valorBolsa, gasto: lanc.bol, comprovado: comp.bol, declarado: decl.bol },
    ...(temSup ? [{ nome: 'Suplementação', regra: '2º semestre', recebido: valorSup, gasto: lanc.sup, comprovado: comp.sup, declarado: decl.sup }] : []),
  ].map(v => ({ ...v, aGastar: num(v.recebido - v.gasto), aComprovar: num(v.recebido - v.comprovado), aPrestar: num(v.recebido - v.declarado) }));
  const total = {
    nome: 'Total', recebido, gasto: lanc.coberto, comprovado: comp.coberto, declarado: decl.coberto,
    aGastar: num(recebido - lanc.coberto), aComprovar: num(recebido - comp.coberto), aPrestar: num(recebido - decl.coberto),
  };

  const catLabel = (v) => categorias.find(c => c.valor === v)?.label || v;
  const porCategoria = Object.values(gastos.reduce((acc, g) => {
    const c = acc[g.categoria] || (acc[g.categoria] = { categoria: catLabel(g.categoria), qtd: 0, valor: 0, comprovado: 0, sup: 0, bolsa: 0 });
    c.qtd += 1; c.valor = num(c.valor + num(g.valor));
    if (g.comprovante_url) c.comprovado = num(c.comprovado + num(g.valor));
    c.sup = num(c.sup + (g.alocacao?.suplementacao || 0)); c.bolsa = num(c.bolsa + (g.alocacao?.bolsa || 0));
    return acc;
  }, {})).sort((a, b) => b.valor - a.valor);

  const porMes = MESES.map((m, i) => {
    const doMes = gastos.filter(g => Number(g.data_despesa.slice(5, 7)) === i + 1);
    return { mes: m, valor: num(doMes.reduce((s, g) => s + num(g.valor), 0)), qtd: doMes.length, segundo: i >= 6 };
  });
  const semestre1 = num(porMes.slice(0, 6).reduce((s, m) => s + m.valor, 0));
  const semestre2 = num(porMes.slice(6).reduce((s, m) => s + m.valor, 0));

  const semComprovante = gastos.filter(g => !g.comprovante_url);
  const naoDeclarados = gastos.filter(g => !g.prestado_contas);
  const fimAno = `${bolsa.ano}-12-31`;
  const diasPrazo = diasEntre(hoje, fimAno);
  const supAGastar = temSup ? verbas.find(v => v.nome === 'Suplementação').aGastar : 0;

  // Pendências, da mais grave para a mais leve.
  const pendencias = [];
  if (temSup && supAGastar > 0) {
    pendencias.push({ nivel: 'critico', texto: `Faltam ${moeda(supAGastar)} de gastos do 2º semestre para cobrir a suplementação — ${diasPrazo > 0 ? `prazo até ${data(fimAno)} (${diasPrazo} dias)` : `prazo encerrado em ${data(fimAno)}`}.` });
  }
  if (verbas[0].aGastar > 0) pendencias.push({ nivel: 'critico', texto: `Faltam ${moeda(verbas[0].aGastar)} de gastos para cobrir a bolsa (qualquer data de ${bolsa.ano}).` });
  if (semComprovante.length) {
    pendencias.push({ nivel: 'alerta', texto: `${semComprovante.length} gasto(s) sem comprovante, somando ${moeda(semComprovante.reduce((s, g) => s + num(g.valor), 0))}: ${semComprovante.map(g => `${data(g.data_despesa)} ${moeda(g.valor)}`).join('; ')}.` });
  }
  if (naoDeclarados.length) {
    pendencias.push({ nivel: 'alerta', texto: `${naoDeclarados.length} gasto(s) ainda não lançado(s) na prestação de contas da prefeitura, somando ${moeda(naoDeclarados.reduce((s, g) => s + num(g.valor), 0))}.` });
  }
  if (!bolsa.data_recebimento_bolsa || (temSup && !bolsa.data_recebimento_suplementacao)) {
    pendencias.push({ nivel: 'info', texto: 'Data de recebimento da bolsa/suplementação não informada no sistema.' });
  }
  if (lanc.total > lanc.coberto) {
    pendencias.push({ nivel: 'info', texto: `${moeda(num(lanc.total - lanc.coberto))} lançados além do valor recebido (excedente — não precisa entrar na prestação).` });
  }

  return {
    recebido, temSup, verbas, total, porCategoria, porMes, semestre1, semestre2,
    totalLancado: lanc.total, excedente: num(lanc.total - lanc.coberto), gastos, pendencias, diasPrazo, fimAno,
    ticketMedio: gastos.length ? num(lanc.total / gastos.length) : 0,
    maiorGasto: gastos.reduce((m, g) => (num(g.valor) > num(m?.valor || 0) ? g : m), null),
    qtdComprovante: gastos.length - semComprovante.length, qtdDeclarado: gastos.length - naoDeclarados.length,
    catLabel,
  };
}

// ── Peças visuais ───────────────────────────────────────────────────────────

const th = { padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: COR.mudo, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: `1px solid ${COR.linha}` };
const thR = { ...th, textAlign: 'right' };
const td = { padding: '6px 8px', fontSize: 12, borderBottom: '1px solid #f2f2f2', verticalAlign: 'top' };
const tdR = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
const h3 = { fontSize: 13, margin: '22px 0 8px', color: COR.tinta, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${COR.tinta}`, paddingBottom: 4 };

function Kpi({ titulo, valor, detalhe, cor = COR.tinta }) {
  return (
    <div style={{ border: `1px solid ${COR.linha}`, borderRadius: 6, padding: '10px 12px', flex: '1 1 140px', minWidth: 130, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10, color: COR.mudo, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700 }}>{titulo}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: cor, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
      {detalhe && <div style={{ fontSize: 11, color: COR.mudo, marginTop: 1 }}>{detalhe}</div>}
    </div>
  );
}

// Barra de magnitude (uma cor) com o valor ao lado em tinta de texto.
function BarraValor({ valor, max, titulo }) {
  const w = max > 0 ? Math.max(valor > 0 ? 1.5 : 0, (valor / max) * 100) : 0;
  return (
    <div title={titulo} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 8, background: COR.vazio, borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${w}%`, height: '100%', background: COR.barra, borderRadius: '0 4px 4px 0' }} />
      </div>
    </div>
  );
}

// Execução de uma verba: comprovado (verde) + lançado sem comprovante (âmbar).
function BarraExecucao({ recebido, gasto, comprovado }) {
  const p = (v) => (recebido > 0 ? Math.min(100, (v / recebido) * 100) : 0);
  const pc = p(comprovado);
  const ps = Math.max(0, p(gasto) - pc);
  return (
    <div title={`Comprovado ${moeda(comprovado)} · sem comprovante ${moeda(num(gasto - comprovado))} · a gastar ${moeda(num(recebido - gasto))}`}
      style={{ display: 'flex', height: 8, background: COR.vazio, borderRadius: 4, overflow: 'hidden', gap: pc && ps ? 2 : 0, minWidth: 90 }}>
      {pc > 0 && <div style={{ width: `${pc}%`, background: COR.comprovado }} />}
      {ps > 0 && <div style={{ width: `${ps}%`, background: COR.semComprovante }} />}
    </div>
  );
}

function LegendaExecucao() {
  const item = (cor, txt) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: cor, display: 'inline-block' }} />{txt}
    </span>
  );
  return <div style={{ fontSize: 10, color: COR.texto2, marginTop: 4 }}>{item(COR.comprovado, 'Gasto comprovado')}{item(COR.semComprovante, 'Gasto sem comprovante')}{item(COR.vazio, 'A gastar')}</div>;
}

const ICONE = { critico: '✕', alerta: '⚠', info: 'ℹ' };
const COR_NIVEL = { critico: COR.critico, alerta: COR.alerta, info: COR.texto2 };

// ── Seção de um atleta ──────────────────────────────────────────────────────

function SecaoAtleta({ bolsa, a, quebraPagina, escola, hoje }) {
  const maxCat = Math.max(0, ...a.porCategoria.map(c => c.valor));
  const maxMes = Math.max(0, ...a.porMes.map(m => m.valor));
  return (
    <section className={quebraPagina ? 'quebra' : ''} style={{ marginTop: quebraPagina ? 36 : 0 }}>
      <Cabecalho escola={escola} titulo={`Prestação de contas — ${bolsa.nome}`} subtitulo={`Lei de Incentivo ao Esporte · bolsa ${bolsa.ano}`} hoje={hoje} />

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 6 }}>
        <tbody>
          <tr>
            <td style={{ ...td, width: '25%', color: COR.mudo }}>Atleta</td><td style={{ ...td, fontWeight: 600 }}>{bolsa.nome}</td>
            <td style={{ ...td, width: '20%', color: COR.mudo }}>Situação da prestação</td><td style={{ ...td, fontWeight: 600 }}>{SITUACAO[bolsa.situacao_prestacao]}</td>
          </tr>
          <tr>
            <td style={{ ...td, color: COR.mudo }}>CPF</td><td style={td}>{bolsa.inscricao?.cpf || '—'}</td>
            <td style={{ ...td, color: COR.mudo }}>Nº protocolo (SMELJ)</td><td style={td}>{bolsa.inscricao?.numero_protocolo || '—'}</td>
          </tr>
          <tr>
            <td style={{ ...td, color: COR.mudo }}>Bolsa recebida</td><td style={td}>{moeda(bolsa.valor_bolsa)} em {data(bolsa.data_recebimento_bolsa)}</td>
            <td style={{ ...td, color: COR.mudo }}>Suplementação</td>
            <td style={td}>{a.temSup ? `${moeda(bolsa.valor_suplementacao)} em ${data(bolsa.data_recebimento_suplementacao)}` : 'Não recebeu'}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={h3}>Indicadores</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Kpi titulo="Valor recebido" valor={moeda(a.recebido)} detalhe={a.temSup ? `Bolsa ${moeda(bolsa.valor_bolsa)} + supl. ${moeda(bolsa.valor_suplementacao)}` : 'Só bolsa'} />
        <Kpi titulo="Valor a gastar" valor={moeda(a.total.aGastar)} cor={a.total.aGastar > 0 ? COR.critico : COR.ok}
          detalhe={`Executado ${pct(a.total.gasto, a.recebido)}`} />
        <Kpi titulo="Valor a comprovar" valor={moeda(a.total.aComprovar)} cor={a.total.aComprovar > 0 ? COR.alerta : COR.ok}
          detalhe={`Comprovado ${pct(a.total.comprovado, a.recebido)}`} />
        <Kpi titulo="Valor a prestar contas" valor={moeda(a.total.aPrestar)} cor={a.total.aPrestar > 0 ? COR.alerta : COR.ok}
          detalhe={`Declarado ${pct(a.total.declarado, a.recebido)} na prefeitura`} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <Kpi titulo="Gastos lançados" valor={a.gastos.length} detalhe={`${moeda(a.totalLancado)} no total`} />
        <Kpi titulo="Com comprovante" valor={`${a.qtdComprovante} de ${a.gastos.length}`} detalhe={`Declarados: ${a.qtdDeclarado} de ${a.gastos.length}`} />
        <Kpi titulo="Gasto médio" valor={moeda(a.ticketMedio)} detalhe={a.maiorGasto ? `Maior: ${moeda(a.maiorGasto.valor)} (${data(a.maiorGasto.data_despesa)})` : null} />
        <Kpi titulo="Por semestre" valor={`${moeda(a.semestre1)} · ${moeda(a.semestre2)}`} detalhe="1º semestre · 2º semestre" />
      </div>

      <h3 style={h3}>Execução por verba</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>Verba</th><th style={thR}>Recebido</th><th style={thR}>Gasto</th><th style={thR}>Comprovado</th><th style={thR}>Declarado</th>
          <th style={thR}>A gastar</th><th style={thR}>A comprovar</th><th style={thR}>A prestar contas</th><th style={{ ...th, width: 110 }}>Execução</th>
        </tr></thead>
        <tbody>
          {[...a.verbas, a.total].map(v => (
            <tr key={v.nome} style={v.nome === 'Total' ? { fontWeight: 700, background: '#fafafa' } : undefined}>
              <td style={td}>{v.nome}{v.regra && <div style={{ fontSize: 10, color: COR.mudo, fontWeight: 400 }}>{v.regra}</div>}</td>
              <td style={tdR}>{moeda(v.recebido)}</td><td style={tdR}>{moeda(v.gasto)}</td><td style={tdR}>{moeda(v.comprovado)}</td><td style={tdR}>{moeda(v.declarado)}</td>
              <td style={{ ...tdR, color: v.aGastar > 0 ? COR.critico : COR.ok }}>{moeda(v.aGastar)}</td>
              <td style={{ ...tdR, color: v.aComprovar > 0 ? COR.alerta : COR.ok }}>{moeda(v.aComprovar)}</td>
              <td style={{ ...tdR, color: v.aPrestar > 0 ? COR.alerta : COR.ok }}>{moeda(v.aPrestar)}</td>
              <td style={td}><BarraExecucao recebido={v.recebido} gasto={v.gasto} comprovado={v.comprovado} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <LegendaExecucao />
      {a.excedente > 0 && <div style={{ fontSize: 11, color: COR.texto2, marginTop: 4 }}>Excedente lançado além do recebido: {moeda(a.excedente)}.</div>}

      <h3 style={h3}>Pendências</h3>
      {a.pendencias.length === 0
        ? <div style={{ fontSize: 12, color: COR.ok }}>✓ Nenhuma pendência — verbas gastas, comprovadas e declaradas.</div>
        : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {a.pendencias.map((p, i) => (
              <li key={i} style={{ fontSize: 12, marginBottom: 4, display: 'flex', gap: 6 }}>
                <span style={{ color: COR_NIVEL[p.nivel], fontWeight: 700, width: 14, flexShrink: 0 }}>{ICONE[p.nivel]}</span>
                <span style={{ color: p.nivel === 'info' ? COR.texto2 : COR.tinta }}>{p.texto}</span>
              </li>
            ))}
          </ul>
        )}

      <div className="duas-colunas" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px' }}>
          <h3 style={h3}>Gastos por tipo (rubrica)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Tipo de gasto</th><th style={thR}>Qtd</th><th style={thR}>Valor</th><th style={thR}>%</th><th style={{ ...th, width: 80 }} /></tr></thead>
            <tbody>
              {a.porCategoria.length === 0 && <tr><td colSpan={5} style={{ ...td, color: COR.mudo }}>Nenhum gasto lançado.</td></tr>}
              {a.porCategoria.map(c => (
                <tr key={c.categoria}>
                  <td style={td}>{c.categoria}
                    <div style={{ fontSize: 10, color: COR.mudo }}>
                      {[c.sup > 0 && `supl. ${moeda(c.sup)}`, c.bolsa > 0 && `bolsa ${moeda(c.bolsa)}`, c.comprovado < c.valor && `sem comprovante ${moeda(num(c.valor - c.comprovado))}`].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td style={tdR}>{c.qtd}</td><td style={tdR}>{moeda(c.valor)}</td><td style={tdR}>{pct(c.valor, a.totalLancado)}</td>
                  <td style={td}><BarraValor valor={c.valor} max={maxCat} titulo={`${c.categoria}: ${moeda(c.valor)}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ flex: '1 1 260px' }}>
          <h3 style={h3}>Gastos por mês</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Mês</th><th style={thR}>Qtd</th><th style={thR}>Valor</th><th style={{ ...th, width: 90 }} /></tr></thead>
            <tbody>
              {a.porMes.map((m, i) => (
                <tr key={m.mes} style={i === 6 ? { borderTop: `2px solid ${COR.tinta}` } : undefined}>
                  <td style={{ ...td, color: m.valor ? COR.tinta : COR.mudo }}>{m.mes}/{String(bolsa.ano).slice(2)}{i === 6 && <span style={{ fontSize: 9, color: COR.mudo, marginLeft: 4 }}>2º sem.</span>}</td>
                  <td style={tdR}>{m.qtd || ''}</td><td style={{ ...tdR, color: m.valor ? COR.tinta : COR.mudo }}>{m.valor ? moeda(m.valor) : '—'}</td>
                  <td style={td}><BarraValor valor={m.valor} max={maxMes} titulo={`${m.mes}: ${moeda(m.valor)}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={h3}>Detalhamento dos gastos</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>#</th><th style={th}>Data</th><th style={th}>Tipo / descrição</th><th style={thR}>Valor</th>
          <th style={th}>Conta para</th><th style={th}>Comprov.</th><th style={th}>Declarado</th>
        </tr></thead>
        <tbody>
          {a.gastos.length === 0 && <tr><td colSpan={7} style={{ ...td, color: COR.mudo }}>Nenhum gasto lançado.</td></tr>}
          {a.gastos.map((g, i) => {
            const al = g.alocacao || {};
            const partes = [al.suplementacao > 0 && `Supl. ${moeda(al.suplementacao)}`, al.bolsa > 0 && `Bolsa ${moeda(al.bolsa)}`, al.excedente > 0 && `Exced. ${moeda(al.excedente)}`].filter(Boolean);
            return (
              <tr key={g.id} style={{ breakInside: 'avoid' }}>
                <td style={{ ...td, color: COR.mudo }}>{i + 1}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{data(g.data_despesa)}<div style={{ fontSize: 10, color: COR.mudo }}>{segundoSemestre(g.data_despesa) ? '2º' : '1º'} sem.</div></td>
                <td style={td}>{a.catLabel(g.categoria)}{g.descricao && <div style={{ fontSize: 11, color: COR.texto2 }}>{g.descricao}</div>}{g.observacao && <div style={{ fontSize: 10, color: COR.mudo }}>Obs.: {g.observacao}</div>}</td>
                <td style={{ ...tdR, fontWeight: 600 }}>{moeda(g.valor)}</td>
                <td style={{ ...td, fontSize: 11, whiteSpace: 'nowrap' }}>{partes.map(p => <div key={p}>{p}</div>)}</td>
                <td style={{ ...td, fontSize: 11, color: g.comprovante_url ? COR.ok : COR.critico, fontWeight: 600 }}>{g.comprovante_url ? '✓ Sim' : '✕ Falta'}</td>
                <td style={{ ...td, fontSize: 11, color: g.prestado_contas ? COR.ok : COR.mudo }}>{g.prestado_contas ? `✓ ${data(g.data_prestado_contas)}` : 'Não'}</td>
              </tr>
            );
          })}
          {a.gastos.length > 0 && (
            <tr style={{ fontWeight: 700, background: '#fafafa' }}>
              <td style={td} colSpan={3}>Total ({a.gastos.length} gastos)</td><td style={tdR}>{moeda(a.totalLancado)}</td><td style={td} colSpan={3} />
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ fontSize: 10, color: COR.mudo, marginTop: 14, lineHeight: 1.5 }}>
        Regra aplicada: todo gasto deve ser de {bolsa.ano}. A suplementação só pode ser coberta por gastos do 2º semestre (01/07 a 31/12);
        os gastos do 2º semestre cobrem primeiro a suplementação, e o que sobra deles, junto com os gastos do 1º semestre, cobre a bolsa.
        "Gasto" = lançado no sistema; "Comprovado" = com comprovante anexado; "Declarado" = marcado como lançado na prestação de contas da prefeitura.
      </div>

      <div className="assinaturas" style={{ display: 'flex', gap: 40, marginTop: 44 }}>
        {['Atleta / responsável legal', 'Responsável pelo acompanhamento'].map(t => (
          <div key={t} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COR.texto2 }}>
            <div style={{ borderTop: `1px solid ${COR.tinta}`, paddingTop: 4 }}>{t}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Cabecalho({ escola, titulo, subtitulo, hoje }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3px solid ${COR.tinta}`, paddingBottom: 8, marginBottom: 12, gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: COR.mudo }}>{escola?.nome}</div>
        <h2 style={{ margin: '2px 0 0', fontSize: 19, color: COR.tinta }}>{titulo}</h2>
        <div style={{ fontSize: 12, color: COR.texto2 }}>{subtitulo}</div>
      </div>
      <div style={{ fontSize: 11, color: COR.mudo, textAlign: 'right', whiteSpace: 'nowrap' }}>Emitido em {data(hoje)}</div>
    </div>
  );
}

// ── Resumo geral (vários atletas) ───────────────────────────────────────────

function ResumoGeral({ itens, escola, hoje, ano }) {
  const soma = (fn) => num(itens.reduce((s, { a }) => s + fn(a), 0));
  const tot = {
    recebido: soma(a => a.recebido), gasto: soma(a => a.total.gasto), aGastar: soma(a => a.total.aGastar),
    aComprovar: soma(a => a.total.aComprovar), aPrestar: soma(a => a.total.aPrestar),
    supAGastar: soma(a => (a.temSup ? a.verbas[1].aGastar : 0)), gastos: soma(a => a.gastos.length),
  };
  const fim = `${ano}-12-31`;
  return (
    <section>
      <Cabecalho escola={escola} titulo="Prestação de contas — resumo geral" subtitulo={`Lei de Incentivo ao Esporte · bolsas ${ano} · ${itens.length} atleta(s)`} hoje={hoje} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Kpi titulo="Total recebido" valor={moeda(tot.recebido)} detalhe={`${itens.length} atletas · ${tot.gastos} gastos`} />
        <Kpi titulo="Valor a gastar" valor={moeda(tot.aGastar)} cor={tot.aGastar > 0 ? COR.critico : COR.ok} detalhe={`Executado ${pct(tot.gasto, tot.recebido)}`} />
        <Kpi titulo="Suplementação a gastar" valor={moeda(tot.supAGastar)} cor={tot.supAGastar > 0 ? COR.critico : COR.ok}
          detalhe={diasEntre(hoje, fim) > 0 ? `${diasEntre(hoje, fim)} dias até ${data(fim)}` : 'Prazo encerrado'} />
        <Kpi titulo="Valor a comprovar" valor={moeda(tot.aComprovar)} cor={tot.aComprovar > 0 ? COR.alerta : COR.ok} />
        <Kpi titulo="Valor a prestar contas" valor={moeda(tot.aPrestar)} cor={tot.aPrestar > 0 ? COR.alerta : COR.ok} />
      </div>
      <h3 style={h3}>Por atleta</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>Atleta</th><th style={thR}>Recebido</th><th style={thR}>Gasto</th><th style={thR}>A gastar</th><th style={thR}>Supl. a gastar</th>
          <th style={thR}>A comprovar</th><th style={thR}>A prestar</th><th style={{ ...th, width: 90 }}>Execução</th><th style={th}>Situação</th>
        </tr></thead>
        <tbody>
          {itens.map(({ bolsa, a }) => (
            <tr key={bolsa.id}>
              <td style={td}>{bolsa.nome}</td><td style={tdR}>{moeda(a.recebido)}</td><td style={tdR}>{moeda(a.total.gasto)}</td>
              <td style={{ ...tdR, color: a.total.aGastar > 0 ? COR.critico : COR.ok }}>{moeda(a.total.aGastar)}</td>
              <td style={{ ...tdR, color: a.temSup && a.verbas[1].aGastar > 0 ? COR.critico : COR.mudo }}>{a.temSup ? moeda(a.verbas[1].aGastar) : '—'}</td>
              <td style={{ ...tdR, color: a.total.aComprovar > 0 ? COR.alerta : COR.ok }}>{moeda(a.total.aComprovar)}</td>
              <td style={{ ...tdR, color: a.total.aPrestar > 0 ? COR.alerta : COR.ok }}>{moeda(a.total.aPrestar)}</td>
              <td style={td}><BarraExecucao recebido={a.recebido} gasto={a.total.gasto} comprovado={a.total.comprovado} /></td>
              <td style={{ ...td, fontSize: 11 }}>{SITUACAO[bolsa.situacao_prestacao]}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700, background: '#fafafa' }}>
            <td style={td}>Total</td><td style={tdR}>{moeda(tot.recebido)}</td><td style={tdR}>{moeda(tot.gasto)}</td><td style={tdR}>{moeda(tot.aGastar)}</td>
            <td style={tdR}>{moeda(tot.supAGastar)}</td><td style={tdR}>{moeda(tot.aComprovar)}</td><td style={tdR}>{moeda(tot.aPrestar)}</td><td style={td} colSpan={2} />
          </tr>
        </tbody>
      </table>
      <LegendaExecucao />
    </section>
  );
}

// ── Excel ───────────────────────────────────────────────────────────────────

async function exportarXLS(itens, ano) {
  const wb = new ExcelJS.Workbook();
  const fmtMoeda = '"R$" #,##0.00';
  const cabecalho = (ws, cols) => {
    ws.columns = cols;
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    cols.forEach((c, i) => { if (c.moeda) ws.getColumn(i + 1).numFmt = fmtMoeda; });
  };

  const resumo = wb.addWorksheet('Resumo');
  cabecalho(resumo, [
    { header: 'Atleta', key: 'atleta', width: 36 }, { header: 'CPF', key: 'cpf', width: 16 }, { header: 'Protocolo', key: 'prot', width: 16 },
    { header: 'Bolsa', key: 'bolsa', width: 13, moeda: true }, { header: 'Suplementação', key: 'sup', width: 14, moeda: true },
    { header: 'Recebido', key: 'rec', width: 13, moeda: true }, { header: 'Gasto', key: 'gasto', width: 13, moeda: true },
    { header: 'Comprovado', key: 'comp', width: 13, moeda: true }, { header: 'Declarado', key: 'decl', width: 13, moeda: true },
    { header: 'A gastar', key: 'aGastar', width: 13, moeda: true }, { header: 'Supl. a gastar (2º sem.)', key: 'supAGastar', width: 20, moeda: true },
    { header: 'A comprovar', key: 'aComp', width: 13, moeda: true }, { header: 'A prestar contas', key: 'aPrest', width: 15, moeda: true },
    { header: 'Qtd gastos', key: 'qtd', width: 10 }, { header: 'Sem comprovante', key: 'semComp', width: 15 }, { header: 'Situação', key: 'sit', width: 18 },
  ]);
  itens.forEach(({ bolsa, a }) => resumo.addRow({
    atleta: bolsa.nome, cpf: bolsa.inscricao?.cpf || '', prot: bolsa.inscricao?.numero_protocolo || '',
    bolsa: num(bolsa.valor_bolsa), sup: a.temSup ? num(bolsa.valor_suplementacao) : null, rec: a.recebido,
    gasto: a.total.gasto, comp: a.total.comprovado, decl: a.total.declarado, aGastar: a.total.aGastar,
    supAGastar: a.temSup ? a.verbas[1].aGastar : null, aComp: a.total.aComprovar, aPrest: a.total.aPrestar,
    qtd: a.gastos.length, semComp: a.gastos.length - a.qtdComprovante, sit: SITUACAO[bolsa.situacao_prestacao],
  }));

  const gastos = wb.addWorksheet('Gastos');
  cabecalho(gastos, [
    { header: 'Atleta', key: 'atleta', width: 32 }, { header: 'Data', key: 'data', width: 12 }, { header: 'Semestre', key: 'sem', width: 9 },
    { header: 'Tipo de gasto', key: 'cat', width: 44 }, { header: 'Descrição', key: 'desc', width: 36 }, { header: 'Valor', key: 'valor', width: 12, moeda: true },
    { header: 'Conta p/ suplementação', key: 'aSup', width: 18, moeda: true }, { header: 'Conta p/ bolsa', key: 'aBol', width: 14, moeda: true },
    { header: 'Excedente', key: 'aExc', width: 11, moeda: true }, { header: 'Comprovante', key: 'comp', width: 12 },
    { header: 'Declarado', key: 'decl', width: 11 }, { header: 'Declarado em', key: 'declEm', width: 13 }, { header: 'Observação', key: 'obs', width: 30 },
  ]);
  itens.forEach(({ bolsa, a }) => a.gastos.forEach(g => gastos.addRow({
    atleta: bolsa.nome, data: data(g.data_despesa), sem: segundoSemestre(g.data_despesa) ? '2º' : '1º',
    cat: a.catLabel(g.categoria), desc: g.descricao || '', valor: num(g.valor),
    aSup: g.alocacao?.suplementacao || 0, aBol: g.alocacao?.bolsa || 0, aExc: g.alocacao?.excedente || 0,
    comp: g.comprovante_url ? 'Sim' : 'Falta', decl: g.prestado_contas ? 'Sim' : 'Não',
    declEm: g.prestado_contas ? data(g.data_prestado_contas) : '', obs: g.observacao || '',
  })));
  gastos.autoFilter = { from: 'A1', to: 'M1' };

  const cats = wb.addWorksheet('Por tipo de gasto');
  cabecalho(cats, [
    { header: 'Atleta', key: 'atleta', width: 32 }, { header: 'Tipo de gasto', key: 'cat', width: 44 }, { header: 'Qtd', key: 'qtd', width: 6 },
    { header: 'Valor', key: 'valor', width: 13, moeda: true }, { header: 'Comprovado', key: 'comp', width: 13, moeda: true },
    { header: 'Conta p/ suplementação', key: 'sup', width: 18, moeda: true }, { header: 'Conta p/ bolsa', key: 'bol', width: 14, moeda: true },
  ]);
  itens.forEach(({ bolsa, a }) => a.porCategoria.forEach(c => cats.addRow({
    atleta: bolsa.nome, cat: c.categoria, qtd: c.qtd, valor: c.valor, comp: c.comprovado, sup: c.sup, bol: c.bolsa,
  })));

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = itens.length === 1 ? `prestacao-contas-${ano}-${itens[0].bolsa.nome.replace(/\s+/g, '-')}.xlsx` : `prestacao-contas-${ano}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Página ──────────────────────────────────────────────────────────────────

const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

export default function PrestacaoContasPage() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    axios.get(`/incentivo-esporte/bolsas/relatorio?${params.toString()}`)
      .then(r => setDados(r.data))
      .catch(ex => setErro(ex.response?.data?.erro || 'Não foi possível carregar o relatório.'));
  }, []);

  const itens = dados ? dados.bolsas.map(bolsa => ({ bolsa, a: analisar(bolsa, dados.categorias, dados.hoje) })) : [];
  const ano = itens[0]?.bolsa.ano;
  useEffect(() => {
    if (!itens.length) return;
    document.title = itens.length === 1 ? `Prestação de contas ${ano} — ${itens[0].bolsa.nome}` : `Prestação de contas ${ano}`;
  }, [itens.length, ano]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', fontFamily: 'sans-serif', color: COR.tinta }}>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .acoes-relatorio { display: none !important; }
          body, .folha-relatorio { background: #fff !important; box-shadow: none !important; border: none !important; }
          .folha-relatorio { padding: 0 !important; width: 100% !important; }
          .quebra { break-before: page; margin-top: 0 !important; }
          h3 { break-after: avoid; }
          tr, .assinaturas { break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {erro && <p style={{ color: COR.critico }}>{erro}</p>}
      {!erro && !dados && <p style={{ color: COR.mudo }}>Carregando...</p>}

      {dados && (
        <>
          <div className="acoes-relatorio" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => window.print()} style={btnPrimario}>🖨 Imprimir / Salvar PDF</button>
            <button onClick={() => exportarXLS(itens, ano)} style={{ ...btnPrimario, background: '#2e7d32' }}>📊 Exportar XLS</button>
          </div>
          <div className="folha-relatorio" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 32, width: 900, maxWidth: '100%', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {itens.length > 1 && <ResumoGeral itens={itens} escola={dados.escola} hoje={dados.hoje} ano={ano} />}
            {itens.map(({ bolsa, a }, i) => (
              <SecaoAtleta key={bolsa.id} bolsa={bolsa} a={a} escola={dados.escola} hoje={dados.hoje} quebraPagina={itens.length > 1 || i > 0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
