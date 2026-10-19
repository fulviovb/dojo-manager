import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { SERVER_ORIGIN } from './Avatar';
import { COR_NIVEL, LegendaNiveis, useCatalogo, formatMes, btnVerde, btnCinza } from './EvolucaoInfantil';

// Visões da turma inteira no módulo Evolução Infantil, ambas sobre a ficha
// Mensal: o mapa (aluno × área, comparado com o mês anterior) e o
// preenchimento rápido (só os níveis, aluno por aluno, pensado pro celular).

const card = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 };

function Foto({ aluno, tamanho = 28 }) {
  return aluno.foto_url
    ? <img src={`${SERVER_ORIGIN}${aluno.foto_url}`} alt="" style={{ width: tamanho, height: tamanho, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <span style={{ width: tamanho, height: tamanho, borderRadius: '50%', background: '#c62828', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: tamanho * 0.45 }}>{aluno.nome[0]}</span>;
}

const fmt = (n) => String(n).replace('.', ',');

function useMapa(turmaId, mes) {
  const [mapa, setMapa] = useState(null);
  const carregar = useCallback(() => {
    axios.get(`/evolucao-infantil/turmas/${turmaId}/mapa`, { params: { mes } }).then((r) => setMapa(r.data));
  }, [turmaId, mes]);
  useEffect(() => { setMapa(null); carregar(); }, [carregar]);
  return [mapa, carregar];
}

// ---------------------------------------------------------------- Mapa

export function MapaTurma({ turmaId, mes, onAbrirAluno, onPreencher }) {
  const catalogo = useCatalogo();
  const [mapa] = useMapa(turmaId, mes);
  if (!mapa || !catalogo) return <p style={{ color: '#888' }}>Carregando...</p>;

  const siglas = Object.fromEntries(catalogo.niveis.map((n) => [n.valor, n.sigla]));
  const avaliados = mapa.alunos.filter((a) => Object.keys(a.niveis).length > 0);

  if (avaliados.length === 0) {
    return (
      <div style={{ ...card, padding: 24 }}>
        <p style={{ margin: '0 0 12px', color: '#666', fontSize: 14 }}>
          Nenhuma ficha Mensal com níveis em {formatMes(mes)}. O mapa aparece conforme as Mensais forem preenchidas.
        </p>
        <button style={btnVerde} onClick={onPreencher}>Preencher a Mensal da turma</button>
      </div>
    );
  }

  const comMedia = mapa.areas.filter((a) => mapa.medias[a.k].atual != null);
  const atencao = [...comMedia].sort((a, b) => mapa.medias[a.k].atual - mapa.medias[b.k].atual).slice(0, 3);
  const fortes = [...comMedia].sort((a, b) => mapa.medias[b.k].atual - mapa.medias[a.k].atual).slice(0, 3);
  const avancos = comMedia
    .filter((a) => mapa.medias[a.k].anterior != null && mapa.medias[a.k].atual > mapa.medias[a.k].anterior)
    .sort((a, b) => (mapa.medias[b.k].atual - mapa.medias[b.k].anterior) - (mapa.medias[a.k].atual - mapa.medias[a.k].anterior))
    .slice(0, 3);

  const resumo = (titulo, cor, lista, detalhe) => (
    <div style={{ ...card, padding: '12px 16px', flex: '1 1 220px', marginBottom: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: cor, marginBottom: 6 }}>{titulo}</div>
      {lista.length === 0
        ? <div style={{ fontSize: 13, color: '#aaa' }}>—</div>
        : lista.map((a) => (
          <div key={a.k} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
            <span>{a.l}</span><span style={{ color: '#888', whiteSpace: 'nowrap' }}>{detalhe(mapa.medias[a.k])}</span>
          </div>
        ))}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {resumo('Pedem mais atenção nas aulas', '#c62828', atencao, (m) => `${m.contagem[1] + m.contagem[2]} em PA/ED`)}
        {resumo('Pontos fortes da turma', '#2e7d32', fortes, (m) => `média ${fmt(m.atual)}`)}
        {resumo(`Avançaram desde ${formatMes(mapa.mes_anterior)}`, '#1565c0', avancos, (m) => `${fmt(m.anterior)} → ${fmt(m.atual)}`)}
      </div>

      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 12px', verticalAlign: 'bottom', color: '#666', minWidth: 170 }}>Aluno</th>
              <th style={{ padding: '10px 6px', verticalAlign: 'bottom', color: '#666', fontWeight: 600 }} title={`Presenças em ${formatMes(mes)}`}>Pres.</th>
              {mapa.areas.map((a) => (
                <th key={a.k} style={{ padding: '10px 2px', verticalAlign: 'bottom', color: '#555', fontWeight: 600 }}>
                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', margin: '0 auto' }}>{a.l}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mapa.alunos.map((al) => {
              const vazio = Object.keys(al.niveis).length === 0;
              return (
                <tr key={al.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '5px 12px' }}>
                    <button onClick={() => onAbrirAluno(al)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 600, color: vazio ? '#aaa' : '#1e2a38', textAlign: 'left' }}>
                      <Foto aluno={al} tamanho={24} />{al.nome}
                    </button>
                  </td>
                  <td style={{ padding: 4, textAlign: 'center', color: '#888' }}>{al.presencas}/{mapa.aulas_no_mes}</td>
                  {mapa.areas.map((a) => {
                    const v = al.niveis[a.k];
                    const antes = al.niveis_anterior[a.k];
                    const seta = v && antes && v !== antes ? (v > antes ? '▲' : '▼') : '';
                    return (
                      <td key={a.k} style={{ padding: 2, textAlign: 'center' }}>
                        <div title={`${a.l}: ${v ? catalogo.niveis[v - 1].rotulo : 'sem registro'}${antes ? ` (em ${formatMes(mapa.mes_anterior)}: ${siglas[antes]})` : ''}`}
                          style={{ minWidth: 38, padding: '4px 0', borderRadius: 4, fontWeight: 700, background: v ? COR_NIVEL[v].fundo : '#f7f7f7', color: v ? COR_NIVEL[v].forte : '#ddd' }}>
                          {v ? siglas[v] : '·'}
                          {seta && <span style={{ fontSize: 8, marginLeft: 2, color: v > antes ? '#2e7d32' : '#c62828' }}>{seta}</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #ddd', background: '#fafafa' }}>
              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e2a38' }}>Média da turma</td>
              <td />
              {mapa.areas.map((a) => {
                const m = mapa.medias[a.k];
                const cor = m.atual != null ? COR_NIVEL[Math.round(m.atual)] : null;
                const dif = m.atual != null && m.anterior != null ? Math.round((m.atual - m.anterior) * 10) / 10 : null;
                return (
                  <td key={a.k} style={{ padding: 2, textAlign: 'center' }}>
                    <div title={m.anterior != null ? `${formatMes(mapa.mes_anterior)}: ${fmt(m.anterior)}` : ''}
                      style={{ padding: '4px 0', borderRadius: 4, fontWeight: 700, background: cor ? cor.fundo : 'transparent', color: cor ? cor.forte : '#ccc' }}>
                      {m.atual != null ? fmt(m.atual) : '—'}
                      {dif ? <div style={{ fontSize: 9, color: dif > 0 ? '#2e7d32' : '#c62828' }}>{dif > 0 ? '+' : ''}{fmt(dif)}</div> : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <LegendaNiveis niveis={catalogo.niveis} />
        <span style={{ fontSize: 11, color: '#999' }}>Média: 1 = PA … 4 = DA · ▲▼ = mudou desde {formatMes(mapa.mes_anterior)}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------- Preenchimento rápido

export function PreencherMensal({ turmaId, mes, onSair }) {
  const catalogo = useCatalogo();
  const [mapa, recarregar] = useMapa(turmaId, mes);
  const [valores, setValores] = useState({}); // aluno_id → niveis
  const [alterados, setAlterados] = useState(new Set());
  const [aberto, setAberto] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!mapa) return;
    setValores(Object.fromEntries(mapa.alunos.map((a) => [a.id, { ...a.niveis }])));
    setAlterados(new Set());
    setAberto((atual) => atual || mapa.alunos.find((a) => Object.keys(a.niveis).length < mapa.areas.length)?.id || null);
  }, [mapa]);

  useEffect(() => {
    if (alterados.size === 0) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [alterados]);

  if (!mapa || !catalogo) return <p style={{ color: '#888' }}>Carregando...</p>;

  const totalAreas = mapa.areas.length;
  const preenchidas = (id) => mapa.areas.filter((a) => valores[id]?.[a.k]).length;
  const completos = mapa.alunos.filter((a) => preenchidas(a.id) === totalAreas).length;
  const temAnterior = mapa.alunos.some((a) => Object.keys(a.niveis_anterior).length > 0);

  const marcar = (al, area, v) => {
    const novos = { ...valores[al.id] };
    if (novos[area] === v) delete novos[area]; else novos[area] = v;
    setValores({ ...valores, [al.id]: novos });
    setAlterados(new Set(alterados).add(al.id));
    // Completou o aluno? Abre o próximo que ainda falta.
    if (mapa.areas.every((a) => novos[a.k]) && preenchidas(al.id) < totalAreas) {
      const idx = mapa.alunos.findIndex((a) => a.id === al.id);
      const proximo = [...mapa.alunos.slice(idx + 1), ...mapa.alunos.slice(0, idx)].find((a) => preenchidas(a.id) < totalAreas);
      setTimeout(() => setAberto(proximo?.id || null), 250);
    }
  };

  // Copia o mês anterior só nas áreas vazias — o professor ajusta o que mudou.
  const copiarAnterior = (lista) => {
    const novos = { ...valores };
    const novosAlterados = new Set(alterados);
    lista.forEach((al) => {
      const atual = { ...novos[al.id] };
      let mudou = false;
      mapa.areas.forEach((a) => {
        if (!atual[a.k] && al.niveis_anterior[a.k]) { atual[a.k] = al.niveis_anterior[a.k]; mudou = true; }
      });
      if (mudou) { novos[al.id] = atual; novosAlterados.add(al.id); }
    });
    setValores(novos);
    setAlterados(novosAlterados);
  };

  const salvar = async () => {
    setSalvando(true);
    setAviso('');
    try {
      const alunos = [...alterados].map((id) => ({ aluno_id: id, niveis: valores[id] }));
      const r = await axios.post(`/evolucao-infantil/turmas/${turmaId}/mensal-lote`, { mes, alunos });
      setAviso(`Salvo: ${r.data.criadas} ficha(s) nova(s), ${r.data.atualizadas} atualizada(s).`);
      recarregar();
    } catch (e) {
      setAviso(e.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const sair = () => {
    if (alterados.size && !window.confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    onSair();
  };

  return (
    <div style={{ maxWidth: 720, paddingBottom: 72 }}>
      <div style={{ ...card, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, color: '#1e2a38' }}>Mensal de {formatMes(mes)}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{completos}/{mapa.alunos.length} alunos completos · toque de novo para desmarcar</div>
        </div>
        {temAnterior && (
          <button style={btnCinza} onClick={() => copiarAnterior(mapa.alunos)} title="Preenche só as áreas vazias">
            Copiar {formatMes(mapa.mes_anterior)} nos vazios
          </button>
        )}
      </div>

      {mapa.alunos.map((al) => {
        const n = preenchidas(al.id);
        const expandido = aberto === al.id;
        const vals = valores[al.id] || {};
        return (
          <div key={al.id} style={{ ...card, marginBottom: 10, border: expandido ? '2px solid #c62828' : '2px solid transparent' }}>
            <button onClick={() => setAberto(expandido ? null : al.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <Foto aluno={al} tamanho={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e2a38' }}>
                  {al.nome}{alterados.has(al.id) && <span style={{ color: '#b26a00', fontSize: 11, marginLeft: 6 }}>● não salvo</span>}
                </div>
                <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                  {mapa.areas.map((a) => (
                    <span key={a.k} style={{ flex: 1, maxWidth: 22, height: 6, borderRadius: 2, background: vals[a.k] ? COR_NIVEL[vals[a.k]].forte : '#e5e5e5' }} />
                  ))}
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: n === totalAreas ? '#2e7d32' : '#888', whiteSpace: 'nowrap' }}>{n}/{totalAreas}</span>
            </button>

            {expandido && (
              <div style={{ padding: '0 14px 12px' }}>
                {Object.keys(al.niveis_anterior).length > 0 && n < totalAreas && (
                  <button style={{ ...btnCinza, marginBottom: 8 }} onClick={() => copiarAnterior([al])}>Igual a {formatMes(mapa.mes_anterior)} nos vazios</button>
                )}
                {mapa.areas.map((a) => (
                  <div key={a.k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderTop: '1px solid #f3f3f3', flexWrap: 'wrap' }}>
                    <span style={{ flex: '1 1 150px', fontSize: 13 }}>{a.l}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {catalogo.niveis.map((nv) => {
                        const sel = vals[a.k] === nv.valor;
                        const antes = al.niveis_anterior[a.k] === nv.valor;
                        return (
                          <button key={nv.valor} onClick={() => marcar(al, a.k, nv.valor)}
                            title={`${nv.rotulo}${antes ? ` (era assim em ${formatMes(mapa.mes_anterior)})` : ''}`}
                            style={{
                              width: 46, height: 38, borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                              background: sel ? COR_NIVEL[nv.valor].forte : COR_NIVEL[nv.valor].fundo,
                              color: sel ? '#fff' : COR_NIVEL[nv.valor].forte,
                              border: antes && !sel ? `2px dashed ${COR_NIVEL[nv.valor].forte}` : '2px solid transparent',
                            }}>
                            {nv.sigla}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {temAnterior && <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>Contorno tracejado = nível de {formatMes(mapa.mes_anterior)}.</div>}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '1px solid #ddd', padding: '10px 16px', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', zIndex: 50, flexWrap: 'wrap' }}>
        {aviso && <span style={{ fontSize: 13, color: '#555', marginRight: 'auto' }}>{aviso}</span>}
        <button style={{ ...btnCinza, padding: '9px 16px', fontSize: 13 }} onClick={sair}>Voltar</button>
        <button style={{ ...btnVerde, padding: '9px 18px', fontSize: 13, opacity: alterados.size && !salvando ? 1 : 0.5 }} disabled={!alterados.size || salvando} onClick={salvar}>
          {salvando ? 'Salvando...' : `Salvar${alterados.size ? ` (${alterados.size})` : ''}`}
        </button>
      </div>
    </div>
  );
}
