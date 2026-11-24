import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Faixa, btnPrimario } from '../components/exame/ui';
import {
  moeda, formatData, filtrar, FILTROS_VAZIOS, SITUACAO, INSCRICAO, textoCarencia, textoPedido, ativos, pendentes, saldoTotal, diasAtraso, consolidarFaixas,
} from '../utils/gestaoExame';

const TITULOS = { completa: 'Lista de candidatos', chamada: 'Lista de chamada', pendencias: 'Pendências de pagamento', faixas: 'Pedido de faixas' };
const th = { padding: '6px 8px', textAlign: 'left', fontSize: 11, borderBottom: '2px solid #333' };
const td = { padding: '6px 8px', fontSize: 12, borderBottom: '1px solid #ddd' };

function Tabela({ colunas, linhas, rodape }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{colunas.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
      <tbody>
        {linhas.map((l, i) => <tr key={i} style={{ breakInside: 'avoid' }}>{l.map((v, j) => <td key={j} style={td}>{v}</td>)}</tr>)}
        {rodape && <tr style={{ fontWeight: 700 }}>{rodape.map((v, j) => <td key={j} style={td}>{v}</td>)}</tr>}
      </tbody>
    </table>
  );
}

function conteudo(tipo, d, filtros) {
  const { exame, candidatos, hoje } = d;
  if (tipo === 'chamada') {
    return <Tabela colunas={['#', 'Nome', 'Faixa atual', 'Faixa pretendida', 'Presença']} linhas={ativos(candidatos).map((c, i) => [i + 1, c.aluno.nome, <Faixa faixa={c.faixa_atual} />, <Faixa faixa={c.faixa_pretendida} />, c.presenca ? (c.presenca === 'presente' ? 'Presente' : 'Ausente') : '☐'])} />;
  }
  if (tipo === 'pendencias') {
    const l = pendentes(candidatos); const a = diasAtraso(exame, hoje);
    return <Tabela colunas={['Aluno', 'Responsável', 'Telefone', 'Devido', 'Pago', 'Saldo', 'Dias de atraso']}
      linhas={l.map((c) => [c.aluno.nome, c.responsavel, c.aluno.telefone || '—', moeda(c.financeiro.taxa.devido + c.financeiro.faixa.devido), moeda(c.financeiro.taxa.pago + c.financeiro.faixa.pago), moeda(saldoTotal(c)), a || '—'])}
      rodape={['Total', '', '', '', '', moeda(l.reduce((s, c) => s + saldoTotal(c), 0)), '']} />;
  }
  if (tipo === 'faixas') {
    const g = consolidarFaixas(candidatos);
    return <Tabela colunas={['Cor', 'Tamanho', 'Quantidade', 'Total']} linhas={g.map((x) => [<Faixa faixa={x.faixa} />, x.tamanho, x.quantidade, moeda(x.total)])}
      rodape={['Total', '', g.reduce((s, x) => s + x.quantidade, 0), moeda(g.reduce((s, x) => s + x.total, 0))]} />;
  }
  return <Tabela colunas={['#', 'Aluno', 'Turma', 'Atual → pretendida', 'Carência', 'Taxa', 'Pago', 'Situação', 'Faixa', 'Inscrição']}
    linhas={filtrar(candidatos, filtros).map((c, i) => [i + 1, c.aluno.nome, c.turma?.nome || '—', <><Faixa faixa={c.faixa_atual} /> → <Faixa faixa={c.faixa_pretendida} /></>, textoCarencia(c.carencia), moeda(c.financeiro.taxa.devido), moeda(c.financeiro.taxa.pago), SITUACAO[c.financeiro.taxa.situacao].label, textoPedido(c), INSCRICAO[c.status_inscricao].label])} />;
}

// Impressões da Gestão do Exame (nova aba, sem sidebar — mesmo padrão de
// RelatorioPage). Filtros da lista completa vêm na querystring.
export default function ExameListasPage({ exameId, tipo }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    axios.get(`/exames/${exameId}/candidatos`).then((r) => setDados(r.data))
      .catch((ex) => setErro(ex.response?.data?.erro || 'Não foi possível carregar a lista.'));
  }, [exameId]);
  const filtros = { ...FILTROS_VAZIOS, ...Object.fromEntries(new URLSearchParams(window.location.search)) };
  const paisagem = tipo === 'completa' || tipo === 'pendencias';
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '24px 12px', fontFamily: 'sans-serif' }} className="fundo">
      <style>{`@page { size: A4 ${paisagem ? 'landscape' : 'portrait'}; margin: 12mm; } @media print { .acoes { display: none; } body, .fundo { background: #fff !important; padding: 0 !important; } .folha { border: none !important; padding: 0 !important; } * { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }`}</style>
      {erro && <p style={{ color: '#c62828', textAlign: 'center' }}>{erro}</p>}
      {!erro && !dados && <p style={{ color: '#888', textAlign: 'center' }}>Carregando...</p>}
      {dados && TITULOS[tipo] && (
        <div style={{ maxWidth: paisagem ? 1080 : 760, margin: '0 auto' }}>
          <div className="acoes" style={{ marginBottom: 12 }}><button style={btnPrimario} onClick={() => window.print()}>🖨 Imprimir / Salvar PDF</button></div>
          <div className="folha" style={{ background: '#fff', border: '1px solid #ddd', padding: 24, overflowX: 'auto' }}>
            <h2 style={{ margin: 0 }}>{TITULOS[tipo]}</h2>
            <p style={{ fontSize: 13, color: '#555' }}>{dados.exame.nome} · {dados.exame.ArteMarcial?.nome} · {formatData(dados.exame.data)}{dados.exame.horario && ` às ${dados.exame.horario.slice(0, 5)}`}{dados.exame.local && ` · ${dados.exame.local}`}</p>
            {conteudo(tipo, dados, filtros)}
          </div>
        </div>
      )}
    </div>
  );
}
