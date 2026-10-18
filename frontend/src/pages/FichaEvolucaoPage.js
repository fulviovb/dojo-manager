import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { COR_NIVEL, descreverPeriodo, formatData, formatMes, idadeEm } from '../components/EvolucaoInfantil';

// Impressão de uma Ficha de Evolução no layout do PDF original (cabeçalho
// vermelho, colunas coloridas por nível, caixas de texto). Mesmo padrão de
// página própria em nova aba de ExameFichaPage.js.
const VERMELHO = '#d32f2f';

function Caixa({ titulo, children, span }) {
  return (
    <div style={{ border: `1.5px solid ${VERMELHO}`, borderRadius: 8, overflow: 'hidden', gridColumn: span ? '1 / -1' : undefined, breakInside: 'avoid' }}>
      <div style={{ background: '#fdecea', padding: '5px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#222' }}>{titulo}</div>
      <div style={{ padding: '6px 10px', minHeight: 44, fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

function Marca({ marcado, nivel }) {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
      border: `1.5px solid ${marcado ? COR_NIVEL[nivel].forte : '#555'}`,
      background: marcado ? COR_NIVEL[nivel].forte : 'transparent',
      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
    }} />
  );
}

export default function FichaEvolucaoPage({ fichaId }) {
  const [ficha, setFicha] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [mensais, setMensais] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([axios.get(`/evolucao-infantil/fichas/${fichaId}`), axios.get('/evolucao-infantil/modelos')])
      .then(([f, c]) => {
        setFicha(f.data);
        setCatalogo(c.data);
        if (f.data.modelo === 'trimestral') {
          axios.get(`/evolucao-infantil/alunos/${f.data.aluno_id}/evolucao`).then((r) => setMensais(r.data.meses));
        }
      })
      .catch((ex) => setErro(ex.response?.data?.erro || 'Não foi possível carregar a ficha.'));
  }, [fichaId]);

  if (erro) return <p style={{ color: '#c62828', padding: 40, fontFamily: 'sans-serif' }}>{erro}</p>;
  if (!ficha || !catalogo) return <p style={{ color: '#888', padding: 40, fontFamily: 'sans-serif' }}>Carregando...</p>;

  const modelo = catalogo.modelos.find((m) => m.slug === ficha.modelo);
  const niveis = ficha.niveis || {};
  const textos = ficha.textos || {};
  const palavras = modelo.titulo.split(' ');
  const meio = Math.ceil(palavras.length / 2);
  const ident = [
    ['Nome do aluno', ficha.Aluno?.nome],
    ['Turma', ficha.Turma?.nome?.split('\n')[0]],
    [modelo.periodo === 'data' ? 'Data' : modelo.periodo === 'mes' ? 'Mês' : 'Período', descreverPeriodo(modelo, ficha)],
    ['Sensei / Professor', ficha.Professor?.nome],
  ];
  if (modelo.mostra_idade) ident.splice(1, 0, ['Idade', `${idadeEm(ficha.Aluno?.data_nascimento, ficha.data_inicio) ?? '—'} anos`]);

  const th = { padding: '5px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.15, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
  const mesesTri = modelo.tipo === 'trimestral'
    ? [0, 1, 2].map((i) => { const [y, m] = ficha.data_inicio.split('-').map(Number); const d = new Date(y, m - 1 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })
    : [];
  const mensalPorMes = Object.fromEntries(mensais.map((m) => [m.mes, m.niveis]));
  const sigla = Object.fromEntries(catalogo.niveis.map((n) => [n.valor, n.sigla]));

  return (
    <div style={{ background: '#eee', minHeight: '100vh', padding: '24px 0', fontFamily: '"Arial Narrow", Arial, sans-serif' }}>
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print { .acoes { display: none; } body, .fundo { background: #fff !important; } .folha { box-shadow: none !important; margin: 0 !important; } }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      <div className="acoes" style={{ textAlign: 'center', marginBottom: 16 }}>
        <button onClick={() => window.print()} style={{ background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>🖨 Imprimir / Salvar PDF</button>
      </div>

      <div className="folha" style={{ background: '#fff', width: '190mm', margin: '0 auto', padding: '8mm', boxSizing: 'border-box', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', fontSize: 13, color: '#444' }}>
            <span style={{ flex: 1, height: 3, background: VERMELHO }} />
            Fichas de Evolução do Aluno
            <span style={{ flex: 1, height: 3, background: VERMELHO }} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.05, marginTop: 6, textTransform: 'uppercase', letterSpacing: -0.5 }}>
            <span style={{ color: '#111' }}>{palavras.slice(0, meio).join(' ')} </span>
            <span style={{ color: VERMELHO }}>{palavras.slice(meio).join(' ')}</span>
          </div>
          <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>{modelo.subtitulo}</div>
        </div>

        {/* Identificação */}
        <div style={{ border: `1.5px solid ${VERMELHO}`, borderRadius: 8, padding: '8px 10px', marginTop: 12, display: 'grid', gridTemplateColumns: `2fr ${ident.slice(1).map(() => '1fr').join(' ')}`, gap: 10 }}>
          {ident.map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
              <div style={{ borderBottom: '1px solid #bbb', fontSize: 12, minHeight: 18, paddingTop: 2 }}>{v || ''}</div>
            </div>
          ))}
        </div>

        {/* Escala */}
        {modelo.tipo === 'escala' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 11.5, border: '1px solid #999' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left', background: VERMELHO, color: '#fff', fontSize: 12, padding: '6px 8px' }}>
                  {modelo.usa_areas ? (modelo.slug === 'mensal' ? 'Visão do mês' : 'Visão geral') : 'Item observado'}
                </th>
                {catalogo.niveis.map((n) => (
                  <th key={n.valor} style={{ ...th, width: '13%', background: COR_NIVEL[n.valor].fundo, color: '#222', borderLeft: '1px solid #999' }}>{n.rotulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelo.itens.map((item) => (
                <tr key={item.k} style={{ borderTop: '1px solid #ccc' }}>
                  <td style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: 10.5 }}>{item.l}</td>
                  {catalogo.niveis.map((n) => (
                    <td key={n.valor} style={{ textAlign: 'center', borderLeft: '1px solid #ccc', padding: 3 }}>
                      <Marca marcado={niveis[item.k] === n.valor} nivel={n.valor} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Trimestral */}
        {modelo.tipo === 'trimestral' && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 11, border: '1px solid #999' }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left', background: VERMELHO, color: '#fff', padding: '6px 8px' }}>Aspecto</th>
                  {mesesTri.map((m, i) => (
                    <th key={m} style={{ ...th, width: '11%', background: COR_NIVEL[[3, 2, 4][i]].fundo, color: '#222', borderLeft: '1px solid #999' }}>Mês {i + 1}<br />{formatMes(m)}</th>
                  ))}
                  <th style={{ ...th, background: '#fdecea', color: '#222', borderLeft: '1px solid #999', textAlign: 'left' }}>Observação</th>
                </tr>
              </thead>
              <tbody>
                {modelo.itens.map((a) => (
                  <tr key={a.k} style={{ borderTop: '1px solid #ccc' }}>
                    <td style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: 10.5 }}>{a.l}</td>
                    {mesesTri.map((m) => {
                      const v = mensalPorMes[m]?.[a.k];
                      return <td key={m} style={{ textAlign: 'center', borderLeft: '1px solid #ccc', fontWeight: 700, color: v ? COR_NIVEL[v].forte : '#bbb' }}>{v ? sigla[v] : '—'}</td>;
                    })}
                    <td style={{ borderLeft: '1px solid #ccc', padding: '3px 6px', fontSize: 10.5 }}>{textos[`obs_${a.k}`] || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 10, marginTop: 4 }}>
              <strong style={{ color: VERMELHO }}>LEGENDA:</strong> {catalogo.niveis.map((n) => `${n.sigla} = ${n.rotulo}`).join(' · ')}
            </div>
          </>
        )}

        {modelo.tipo === 'escala' && modelo.slug === 'observacao_inicial' && (
          <div style={{ fontSize: 10, marginTop: 4, color: '#555' }}>Escala apenas de observação pedagógica (não é nota).</div>
        )}

        {/* Metas */}
        {modelo.tipo === 'metas' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              {modelo.campos.filter((c) => c.k !== 'observacoes').map((c) => <Caixa key={c.k} titulo={c.l}>{textos[c.k]}</Caixa>)}
            </div>
            {(ficha.blocos || []).map((meta, i) => (
              <div key={i} style={{ border: `1.5px solid ${['#d32f2f', '#1565c0', '#2e7d32'][i]}`, borderRadius: 8, marginTop: 10, padding: 8, breakInside: 'avoid' }}>
                <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>META {i + 1}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {modelo.campos_meta.map((c) => (
                    <div key={c.k}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{c.l}</div>
                      <div style={{ fontSize: 11.5, minHeight: 34, whiteSpace: 'pre-wrap' }}>{meta[c.k]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, marginTop: 6, display: 'flex', gap: 14 }}>
                  <strong>STATUS:</strong>
                  {modelo.status_meta.map((s) => <span key={s.k}>{meta.status === s.k ? '☑' : '☐'} {s.l.toUpperCase()}</span>)}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Registro livre */}
        {modelo.tipo === 'registro_livre' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            {(ficha.blocos || []).map((reg, i) => (
              <div key={i} style={{ border: `1.5px solid ${i % 2 ? '#1565c0' : VERMELHO}`, borderRadius: 8, padding: 8, breakInside: 'avoid' }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>REGISTRO {i + 1}</div>
                <div style={{ fontSize: 11, margin: '4px 0' }}><strong>DATA:</strong> {formatData(reg.data)}</div>
                {modelo.campos_registro.map((c) => (
                  <div key={c.k} style={{ borderTop: '1px solid #eee', padding: '3px 0' }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' }}>{c.l}</div>
                    <div style={{ fontSize: 11, whiteSpace: 'pre-wrap', minHeight: 14 }}>{reg[c.k]}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Campos de texto */}
        {modelo.tipo !== 'metas' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            {modelo.slug === 'resumo' ? (
              <>
                {modelo.campos.filter((c) => !c.k.startsWith('foco_') && c.k !== 'observacoes').map((c) => <Caixa key={c.k} titulo={c.l}>{textos[c.k]}</Caixa>)}
                <Caixa titulo="Próximos focos">{['foco_1', 'foco_2', 'foco_3'].map((k, i) => `${i + 1}. ${textos[k] || ''}`).join('\n')}</Caixa>
                <Caixa titulo="Observações do sensei">{textos.observacoes}</Caixa>
              </>
            ) : modelo.campos.map((c) => (
              <Caixa key={c.k} titulo={c.l} span={c.k === 'observacoes' && modelo.campos.length % 2 === 1}>{textos[c.k]}</Caixa>
            ))}
          </div>
        )}
        {modelo.tipo === 'metas' && <div style={{ marginTop: 10 }}><Caixa titulo="Observações">{textos.observacoes}</Caixa></div>}

        {modelo.tem_data_revisao && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <strong>{modelo.slug === 'metas' ? 'DATA DA PRÓXIMA REVISÃO' : 'DATA DA REVISÃO'}:</strong> {ficha.data_revisao ? formatData(ficha.data_revisao) : '___/___/______'}
          </div>
        )}
        {modelo.aviso && <div style={{ fontSize: 10.5, marginTop: 8, color: '#555' }}>❗ {modelo.aviso}</div>}

        <div style={{ height: 6, marginTop: 14, background: `linear-gradient(90deg, ${VERMELHO} 0 35%, #999 35% 45%, ${VERMELHO} 45% 100%)` }} />
      </div>
    </div>
  );
}
