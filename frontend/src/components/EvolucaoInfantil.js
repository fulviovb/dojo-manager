import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Módulo Evolução Infantil — peças compartilhadas entre a tela do menu
// (pages/EvolucaoInfantil.js) e o perfil do aluno (AlunoDetalhe). O
// catálogo das fichas (itens, campos) vem do backend: GET /evolucao-infantil/modelos.

// Mesmas cores das colunas do PDF (rosa / amarelo / azul / verde).
export const COR_NIVEL = {
  1: { fundo: '#fdecea', forte: '#c62828' },
  2: { fundo: '#fff4d6', forte: '#b26a00' },
  3: { fundo: '#e3f0fc', forte: '#1565c0' },
  4: { fundo: '#e6f4ea', forte: '#2e7d32' },
};

export const GRUPOS = [
  { k: 'inicio', l: 'Início' },
  { k: 'tematica', l: 'Fichas temáticas' },
  { k: 'acompanhamento', l: 'Acompanhamento' },
];

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const card = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 };
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #f0f0f0', gap: 8, flexWrap: 'wrap' };
const cardTitle = { fontWeight: 700, fontSize: 15, color: '#1e2a38' };
export const btnVerde = { background: '#2e7d32', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
export const btnAzul = { background: '#1565c0', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
export const btnCinza = { background: 'none', border: '1px solid #ccc', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnLink = { background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 12, padding: 0 };
export const estiloInput = { width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' };
const rotulo = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 };

// Data local (YYYY-MM-DD) — toISOString() é UTC e vira o dia seguinte depois das 21h.
export function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatData(d) {
  return d ? d.slice(0, 10).split('-').reverse().join('/') : '—';
}

export function formatMes(mes) {
  const [y, m] = mes.split('-');
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`;
}

export function idadeEm(nascimento, referencia) {
  if (!nascimento) return null;
  const [ny, nm, nd] = nascimento.split('-').map(Number);
  const [ry, rm, rd] = (referencia || hojeLocal()).split('-').map(Number);
  let anos = ry - ny;
  if (rm < nm || (rm === nm && rd < nd)) anos -= 1;
  return anos;
}

// "05/10/2026", "out/26", "out/26 a dez/26", "01/10/2026 a 15/10/2026"
export function descreverPeriodo(modelo, ficha) {
  if (!modelo) return formatData(ficha.data_inicio);
  if (modelo.periodo === 'mes') return formatMes(ficha.data_inicio.slice(0, 7));
  if (modelo.periodo === 'trimestre') return `${formatMes(ficha.data_inicio.slice(0, 7))} a ${formatMes(ficha.data_fim.slice(0, 7))}`;
  if (modelo.periodo === 'periodo' && ficha.data_fim) return `${formatData(ficha.data_inicio)} a ${formatData(ficha.data_fim)}`;
  return formatData(ficha.data_inicio);
}

const deslocarMes = (mes, n) => {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const mesesAPartir = (mes, n) => Array.from({ length: n }, (_, i) => deslocarMes(mes, i));

let catalogoCache = null;
export function useCatalogo() {
  const [catalogo, setCatalogo] = useState(catalogoCache);
  useEffect(() => {
    if (catalogoCache) return;
    axios.get('/evolucao-infantil/modelos').then((r) => { catalogoCache = r.data; setCatalogo(r.data); });
  }, []);
  return catalogo;
}

export function abrirImpressao(fichaId) {
  window.open(`/evolucao-infantil/ficha/${fichaId}`, '_blank');
}

function Modal({ titulo, onFechar, largura = 900, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '32px 12px' }}>
      <div style={{ background: '#fff', borderRadius: 8, width: largura, maxWidth: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, background: '#fff', borderRadius: '8px 8px 0 0', zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#1e2a38' }}>{titulo}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

// Legenda da escala — "escala apenas de observação pedagógica (não é nota)".
export function LegendaNiveis({ niveis }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 11 }}>
      {niveis.map((n) => (
        <span key={n.valor} style={{ background: COR_NIVEL[n.valor].fundo, color: COR_NIVEL[n.valor].forte, padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>
          {n.sigla} = {n.rotulo}
        </span>
      ))}
      <span style={{ color: '#999' }}>Observação pedagógica — não é nota.</span>
    </div>
  );
}

function TabelaEscala({ itens, niveis, valores, onChange, sugestao }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '8px 10px', background: '#c62828', color: '#fff', borderRadius: '6px 0 0 0' }}>Item observado</th>
          {niveis.map((n) => (
            <th key={n.valor} style={{ width: 92, padding: '6px 4px', background: COR_NIVEL[n.valor].fundo, color: COR_NIVEL[n.valor].forte, fontSize: 11, lineHeight: 1.2 }}>
              {n.rotulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {itens.map((item, idx) => (
          <tr key={item.k} style={{ background: idx % 2 ? '#fafafa' : '#fff', borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '7px 10px' }}>
              {item.l}
              {sugestao?.detalhe?.[item.k] && (
                <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>
                  (temáticas: média {String(sugestao.detalhe[item.k].media).replace('.', ',')})
                </span>
              )}
            </td>
            {niveis.map((n) => {
              const marcado = valores[item.k] === n.valor;
              return (
                <td key={n.valor} style={{ textAlign: 'center', padding: 4 }}>
                  <button type="button" title={n.rotulo}
                    onClick={() => onChange(item.k, marcado ? null : n.valor)}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                      border: `2px solid ${marcado ? COR_NIVEL[n.valor].forte : '#bbb'}`,
                      background: marcado ? COR_NIVEL[n.valor].forte : '#fff',
                      color: '#fff', fontSize: 13, lineHeight: '20px', padding: 0,
                    }}>
                    {marcado ? '✓' : ''}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CamposTexto({ campos, textos, onChange, colunas = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`, gap: 12 }}>
      {campos.map((c) => (
        <div key={c.k} style={{ gridColumn: c.k === 'observacoes' && colunas > 1 ? `span ${colunas}` : undefined }}>
          <label style={rotulo}>{c.l}</label>
          <textarea rows={c.k.startsWith('foco_') ? 1 : 3} value={textos[c.k] || ''}
            onChange={(e) => onChange(c.k, e.target.value)} style={{ ...estiloInput, resize: 'vertical' }} />
        </div>
      ))}
    </div>
  );
}

// Grade da Trimestral: os níveis vêm das fichas Mensais dos 3 meses
// (somente leitura); aqui o professor escreve só a observação por área.
function GradeTrimestral({ itens, niveis, meses, mensais, textos, onChange }) {
  const porMes = Object.fromEntries(mensais.map((m) => [m.mes, m.niveis]));
  const siglas = Object.fromEntries(niveis.map((n) => [n.valor, n.sigla]));
  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={{ textAlign: 'left', padding: '8px 10px' }}>Aspecto</th>
            {meses.map((m, i) => (
              <th key={m} style={{ width: 80, padding: 6, fontSize: 12 }}>Mês {i + 1}<div style={{ fontWeight: 400, color: '#888' }}>{formatMes(m)}</div></th>
            ))}
            <th style={{ textAlign: 'left', padding: '8px 10px' }}>Observação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((a) => (
            <tr key={a.k} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '6px 10px' }}>{a.l}</td>
              {meses.map((m) => {
                const v = porMes[m]?.[a.k];
                return (
                  <td key={m} style={{ textAlign: 'center', padding: 4 }}>
                    {v ? (
                      <span style={{ background: COR_NIVEL[v].fundo, color: COR_NIVEL[v].forte, fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 10 }}>{siglas[v]}</span>
                    ) : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                );
              })}
              <td style={{ padding: 4 }}>
                <input value={textos[`obs_${a.k}`] || ''} onChange={(e) => onChange(`obs_${a.k}`, e.target.value)} style={{ ...estiloInput, padding: '5px 8px' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {meses.some((m) => !porMes[m]) && (
        <p style={{ fontSize: 12, color: '#b26a00', margin: '8px 0 0' }}>
          Sem ficha Mensal em: {meses.filter((m) => !porMes[m]).map(formatMes).join(', ')}. Os níveis desta grade vêm das fichas Mensais.
        </p>
      )}
    </div>
  );
}

function BlocosMetas({ modelo, blocos, onChange }) {
  const cores = ['#c62828', '#1565c0', '#2e7d32'];
  const metas = Array.from({ length: modelo.max_metas }, (_, i) => blocos[i] || {});
  const alterar = (i, k, v) => onChange(metas.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  return metas.map((meta, i) => (
    <div key={i} style={{ border: `1px solid ${cores[i]}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, color: cores[i], marginBottom: 8 }}>Meta {i + 1}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        {modelo.campos_meta.map((c) => (
          <div key={c.k}>
            <label style={rotulo}>{c.l}</label>
            <textarea rows={3} value={meta[c.k] || ''} onChange={(e) => alterar(i, c.k, e.target.value)} style={{ ...estiloInput, resize: 'vertical' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8, fontSize: 12, flexWrap: 'wrap' }}>
        <strong>Status:</strong>
        {modelo.status_meta.map((s) => (
          <label key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={meta.status === s.k} onChange={() => alterar(i, 'status', meta.status === s.k ? null : s.k)} />
            {s.l}
          </label>
        ))}
      </div>
    </div>
  ));
}

function BlocosRegistro({ modelo, blocos, onChange }) {
  const alterar = (i, k, v) => onChange(blocos.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div>
      {blocos.map((reg, i) => (
        <div key={i} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12, background: i % 2 ? '#f5f9ff' : '#fff8f8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <strong>Registro {i + 1}</strong>
              <input type="date" value={reg.data || ''} onChange={(e) => alterar(i, 'data', e.target.value)} style={{ ...estiloInput, width: 150 }} />
            </div>
            <button type="button" style={{ ...btnLink, color: '#c62828' }} onClick={() => onChange(blocos.filter((_, j) => j !== i))}>Remover</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {modelo.campos_registro.map((c) => (
              <div key={c.k}>
                <label style={rotulo}>{c.l}</label>
                <textarea rows={2} value={reg[c.k] || ''} onChange={(e) => alterar(i, c.k, e.target.value)} style={{ ...estiloInput, resize: 'vertical' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" style={btnCinza} onClick={() => onChange([...blocos, { data: hojeLocal() }])}>+ Adicionar registro</button>
    </div>
  );
}

// Formulário genérico de qualquer uma das 19 fichas. `ficha` = edição;
// sem ela, cria uma nova do `modeloSlug` para o aluno/turma informados.
export function FichaForm({ catalogo, modeloSlug, mesInicial, ficha, aluno, turmas, turmaIdInicial, onFechar, onSalvo }) {
  const modelo = catalogo.modelos.find((m) => m.slug === (ficha?.modelo || modeloSlug));
  const hoje = hojeLocal();
  const mesAtual = mesInicial || hoje.slice(0, 7);
  const [turmaId, setTurmaId] = useState(ficha?.turma_id || turmaIdInicial || turmas[0]?.id || '');
  const [dataInicio, setDataInicio] = useState(
    ficha ? (['mes', 'trimestre'].includes(modelo.periodo) ? ficha.data_inicio.slice(0, 7) : ficha.data_inicio)
      : modelo.periodo === 'mes' ? mesAtual
      : modelo.periodo === 'trimestre' ? deslocarMes(mesAtual, -2) // trimestre que termina no mês atual
      : hoje,
  );
  const [dataFim, setDataFim] = useState(ficha?.data_fim && modelo.periodo === 'periodo' ? ficha.data_fim : '');
  const [dataRevisao, setDataRevisao] = useState(ficha?.data_revisao || '');
  const [niveis, setNiveis] = useState(ficha?.niveis || {});
  const [textos, setTextos] = useState(ficha?.textos || {});
  const [blocos, setBlocos] = useState(ficha?.blocos || (modelo.tipo === 'registro_livre' ? [{ data: hoje }] : []));
  const [mensais, setMensais] = useState([]);
  const [sugestao, setSugestao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (modelo.tipo !== 'trimestral') return;
    axios.get(`/evolucao-infantil/alunos/${aluno.id}/evolucao`).then((r) => setMensais(r.data.meses));
  }, [modelo.tipo, aluno.id]);

  const sugerir = async () => {
    const de = modelo.periodo === 'mes' ? `${dataInicio}-01` : dataInicio;
    let ate = dataFim || hoje;
    if (modelo.periodo === 'mes') {
      const [y, m] = dataInicio.split('-').map(Number);
      ate = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    }
    const r = await axios.get('/evolucao-infantil/sugestao', { params: { aluno_id: aluno.id, de, ate } });
    setSugestao(r.data);
    // Só preenche o que está vazio — nunca sobrescreve o que o professor marcou.
    setNiveis((atual) => {
      const novo = { ...atual };
      modelo.itens.forEach((a) => { if (!novo[a.k] && r.data.niveis[a.k]) novo[a.k] = r.data.niveis[a.k]; });
      return novo;
    });
  };

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    const corpo = {
      modelo: modelo.slug, aluno_id: aluno.id, turma_id: turmaId,
      data_inicio: dataInicio, data_fim: dataFim || null, data_revisao: dataRevisao || null,
      niveis, textos, blocos,
    };
    try {
      const r = ficha ? await axios.put(`/evolucao-infantil/fichas/${ficha.id}`, corpo) : await axios.post('/evolucao-infantil/fichas', corpo);
      onSalvo(r.data);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao salvar a ficha');
    } finally { setSalvando(false); }
  };

  const alterarTexto = (k, v) => setTextos((t) => ({ ...t, [k]: v }));
  const idade = modelo.mostra_idade ? idadeEm(aluno.data_nascimento, dataInicio) : null;

  return (
    <Modal titulo={`${modelo.titulo} — ${aluno.nome}`} onFechar={onFechar}>
      <p style={{ margin: '0 0 16px', color: '#666', fontSize: 13 }}>{modelo.subtitulo}</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <div style={{ minWidth: 220, flex: 1 }}>
          <label style={rotulo}>Turma</label>
          {ficha || turmas.length <= 1 ? (
            <div style={{ fontSize: 13, padding: '7px 0' }}>{turmas.find((t) => t.id === turmaId)?.nome || ficha?.Turma?.nome || '—'}</div>
          ) : (
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} style={estiloInput}>
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          )}
        </div>
        {modelo.periodo === 'data' && (
          <div>
            <label style={rotulo}>Data</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={estiloInput} />
          </div>
        )}
        {modelo.periodo === 'mes' && (
          <div>
            <label style={rotulo}>Mês</label>
            <input type="month" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={estiloInput} />
          </div>
        )}
        {modelo.periodo === 'trimestre' && (
          <div>
            <label style={rotulo}>1º mês do trimestre</label>
            <input type="month" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={estiloInput} />
          </div>
        )}
        {modelo.periodo === 'periodo' && (
          <>
            <div>
              <label style={rotulo}>Período — início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={estiloInput} />
            </div>
            <div>
              <label style={rotulo}>fim (opcional)</label>
              <input type="date" value={dataFim} min={dataInicio} onChange={(e) => setDataFim(e.target.value)} style={estiloInput} />
            </div>
          </>
        )}
        {idade != null && <div style={{ fontSize: 13, padding: '7px 0' }}><strong>Idade:</strong> {idade} anos</div>}
      </div>

      {modelo.tipo === 'escala' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <LegendaNiveis niveis={catalogo.niveis} />
            {modelo.usa_areas && (
              <button type="button" style={btnCinza} onClick={sugerir} title="Média dos itens das fichas temáticas do período, só nas áreas ainda sem marcação">
                ✨ Sugerir pelas fichas temáticas
              </button>
            )}
          </div>
          {sugestao && sugestao.total_fichas === 0 && (
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>Nenhuma ficha temática neste período.</p>
          )}
          <TabelaEscala itens={modelo.itens} niveis={catalogo.niveis} valores={niveis} sugestao={sugestao}
            onChange={(k, v) => setNiveis((n) => { const novo = { ...n }; if (v) novo[k] = v; else delete novo[k]; return novo; })} />
          <div style={{ height: 16 }} />
          <CamposTexto campos={modelo.campos} textos={textos} onChange={alterarTexto} />
        </>
      )}

      {modelo.tipo === 'trimestral' && (
        <>
          <GradeTrimestral itens={modelo.itens} niveis={catalogo.niveis} meses={mesesAPartir(dataInicio, 3)} mensais={mensais} textos={textos} onChange={alterarTexto} />
          <div style={{ height: 16 }} />
          <CamposTexto campos={modelo.campos} textos={textos} onChange={alterarTexto} />
        </>
      )}

      {modelo.tipo === 'metas' && (
        <>
          <div style={{ fontWeight: 700, color: '#c62828', marginBottom: 8 }}>Ponto de partida</div>
          <CamposTexto campos={modelo.campos.filter((c) => c.k !== 'observacoes')} textos={textos} onChange={alterarTexto} />
          <div style={{ height: 16 }} />
          <BlocosMetas modelo={modelo} blocos={blocos} onChange={setBlocos} />
          <CamposTexto campos={modelo.campos.filter((c) => c.k === 'observacoes')} textos={textos} onChange={alterarTexto} colunas={1} />
        </>
      )}

      {modelo.tipo === 'registro_livre' && (
        <>
          <BlocosRegistro modelo={modelo} blocos={blocos} onChange={setBlocos} />
          <div style={{ height: 16 }} />
          <CamposTexto campos={modelo.campos} textos={textos} onChange={alterarTexto} colunas={1} />
        </>
      )}

      {modelo.tem_data_revisao && (
        <div style={{ marginTop: 12, maxWidth: 220 }}>
          <label style={rotulo}>{modelo.slug === 'metas' ? 'Data da próxima revisão' : 'Data da revisão'}</label>
          <input type="date" value={dataRevisao} onChange={(e) => setDataRevisao(e.target.value)} style={estiloInput} />
        </div>
      )}
      {modelo.aviso && <p style={{ fontSize: 12, color: '#c62828', margin: '12px 0 0' }}>❗ {modelo.aviso}</p>}

      {erro && <p style={{ color: '#c62828', fontSize: 13, margin: '12px 0 0' }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
        <button style={btnCinza} onClick={onFechar}>Cancelar</button>
        <button style={btnAzul} disabled={salvando || !turmaId} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar ficha'}</button>
      </div>
    </Modal>
  );
}

// Escolha do modelo de uma ficha nova, agrupado como no PDF.
function MenuNovaFicha({ catalogo, onEscolher, onFechar }) {
  return (
    <Modal titulo="Nova ficha" onFechar={onFechar} largura={640}>
      {GRUPOS.map((g) => (
        <div key={g.k} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 6 }}>{g.l}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {catalogo.modelos.filter((m) => m.grupo === g.k).map((m) => (
              <button key={m.slug} onClick={() => onEscolher(m.slug)}
                style={{ textAlign: 'left', background: '#fff', border: '1px solid #e0e0e0', borderLeft: '4px solid #c62828', borderRadius: 6, padding: '10px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1e2a38' }}>
                {m.titulo}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Modal>
  );
}

// Linha do tempo: área × mês, a partir das fichas Mensais.
function LinhaDoTempo({ catalogo, meses }) {
  if (meses.length === 0) return null;
  const siglas = Object.fromEntries(catalogo.niveis.map((n) => [n.valor, n.sigla]));
  const ultimos = meses.slice(-12);
  const areas = catalogo.areas.filter((a) => ultimos.some((m) => m.niveis[a.k]));
  return (
    <div style={{ overflowX: 'auto', padding: '4px 18px 12px' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: '#888', fontWeight: 600 }}>Evolução mensal</th>
            {ultimos.map((m) => <th key={m.id} style={{ padding: '4px 6px', color: '#888', fontWeight: 600 }}>{formatMes(m.mes)}</th>)}
          </tr>
        </thead>
        <tbody>
          {areas.map((a) => (
            <tr key={a.k}>
              <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>{a.l}</td>
              {ultimos.map((m) => {
                const v = m.niveis[a.k];
                return (
                  <td key={m.id} style={{ padding: 2, textAlign: 'center' }}>
                    <div title={v ? catalogo.niveis[v - 1].rotulo : 'sem registro'}
                      style={{ minWidth: 38, padding: '3px 0', borderRadius: 4, fontWeight: 700, background: v ? COR_NIVEL[v].fundo : '#f5f5f5', color: v ? COR_NIVEL[v].forte : '#ccc' }}>
                      {v ? siglas[v] : '·'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Card completo de evolução de um aluno: linha do tempo + lista de fichas
// + criar/editar/imprimir/excluir. `turmas` = turmas infantis do aluno
// (as que aceitam ficha nova).
export function EvolucaoAluno({ aluno, turmas, turmaIdInicial, abrirModelo, onAlterado }) {
  const catalogo = useCatalogo();
  const [fichas, setFichas] = useState([]);
  const [meses, setMeses] = useState([]);
  const [escolhendo, setEscolhendo] = useState(false);
  const [form, setForm] = useState(null); // { modeloSlug } | { ficha }

  const carregar = useCallback(() => {
    axios.get('/evolucao-infantil/fichas', { params: { aluno_id: aluno.id } }).then((r) => setFichas(r.data));
    axios.get(`/evolucao-infantil/alunos/${aluno.id}/evolucao`).then((r) => setMeses(r.data.meses));
  }, [aluno.id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Atalho da tela de turma: abrir direto um modelo (ou uma ficha existente).
  useEffect(() => {
    if (abrirModelo?.fichaId) {
      axios.get(`/evolucao-infantil/fichas/${abrirModelo.fichaId}`).then((r) => setForm({ ficha: r.data }));
    } else if (abrirModelo?.modeloSlug) {
      setForm({ modeloSlug: abrirModelo.modeloSlug, mes: abrirModelo.mes });
    }
  }, [abrirModelo]);

  const remover = async (f) => {
    if (!window.confirm('Excluir esta ficha? Não dá para desfazer.')) return;
    await axios.delete(`/evolucao-infantil/fichas/${f.id}`);
    carregar();
    onAlterado?.();
  };

  if (!catalogo) return <div style={card}><div style={{ padding: 18, color: '#888' }}>Carregando...</div></div>;
  const modeloPorSlug = Object.fromEntries(catalogo.modelos.map((m) => [m.slug, m]));

  return (
    <div style={card}>
      <div style={cardHeader}>
        <span style={cardTitle}>🧒 Evolução Infantil</span>
        {turmas.length > 0 && <button style={btnVerde} onClick={() => setEscolhendo(true)}>+ Nova ficha</button>}
      </div>

      <LinhaDoTempo catalogo={catalogo} meses={meses} />

      <div style={{ padding: '4px 18px 14px' }}>
        {fichas.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '6px 0' }}>
            Nenhuma ficha registrada. Comece pela <button style={btnLink} onClick={() => setForm({ modeloSlug: 'observacao_inicial' })} disabled={turmas.length === 0}>Observação Inicial</button>.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {fichas.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '7px 0', whiteSpace: 'nowrap', color: '#666', width: 150 }}>{descreverPeriodo(modeloPorSlug[f.modelo], f)}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <button style={{ ...btnLink, fontSize: 13, color: '#1e2a38', fontWeight: 600 }} onClick={() => setForm({ ficha: f })}>
                      {modeloPorSlug[f.modelo]?.titulo || f.modelo}
                    </button>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{f.Professor?.nome}{f.Turma ? ` · ${f.Turma.nome}` : ''}</div>
                  </td>
                  <td style={{ padding: '7px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button style={{ ...btnLink, marginRight: 10 }} onClick={() => abrirImpressao(f.id)}>🖨 Imprimir</button>
                    <button style={{ ...btnLink, color: '#c62828' }} onClick={() => remover(f)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {escolhendo && (
        <MenuNovaFicha catalogo={catalogo} onFechar={() => setEscolhendo(false)}
          onEscolher={(slug) => { setEscolhendo(false); setForm({ modeloSlug: slug }); }} />
      )}
      {form && (
        <FichaForm catalogo={catalogo} aluno={aluno} turmas={turmas} turmaIdInicial={turmaIdInicial}
          modeloSlug={form.modeloSlug} mesInicial={form.mes} ficha={form.ficha}
          onFechar={() => setForm(null)}
          onSalvo={() => { setForm(null); carregar(); onAlterado?.(); }} />
      )}
    </div>
  );
}
