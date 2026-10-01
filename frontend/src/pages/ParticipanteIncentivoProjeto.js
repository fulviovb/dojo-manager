import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { estiloInput, btnVerde, btnAzul, btnCinza } from './IncentivoEsporte';

// Seção "Projeto (formulário da prefeitura)" do participante: os 5 campos
// da tela "Projeto" do Sistema Incentivo online — modalidade, currículo,
// objetivos, competições previstas e locais de treinamento. O mesmo texto
// vai pro LEIA-ME do "Baixar projeto" (backend: utils/textoProjeto.js).

const card = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 };
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #f0f0f0' };
const titulo = { fontWeight: 700, fontSize: 15, color: '#1e2a38' };
const subtitulo = { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', margin: '14px 0 6px' };
const btnX = { background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: 14, padding: '0 4px' };
const inputPeq = { ...estiloInput, padding: '6px 8px', fontSize: 13 };
const LIMITE_CURRICULO = 500; // limite do campo no formulário da prefeitura
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const META_LABEL = { campeao: 'Ser campeão (1º lugar)', podio: 'Pódio (até 3º)', top5: 'Entre os 5 primeiros', participar: 'Participar', livre: 'Objetivo livre (texto)' };

function BotaoCopiar({ texto }) {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* sem clipboard */ }
  };
  return <button type="button" onClick={copiar} disabled={!texto} style={{ ...btnCinza, padding: '2px 8px', fontSize: 11 }}>{ok ? 'Copiado ✓' : 'Copiar'}</button>;
}

export default function SecaoProjetoIncentivo({ participante }) {
  const base = `/incentivo-esporte/participantes/${participante.id}/projeto`;
  const [dados, setDados] = useState(null);
  const [calendario, setCalendario] = useState([]);
  const [curriculo, setCurriculo] = useState('');
  const [curriculoSalvo, setCurriculoSalvo] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [novoObjetivo, setNovoObjetivo] = useState({ meta: 'podio', competicao_id: '', modalidade: '', categoria: '', texto_livre: '' });
  const [novaPrevista, setNovaPrevista] = useState('');
  const [novoLocal, setNovoLocal] = useState({ local_id: '', dia_semana: '1', hora_inicio: '', hora_fim: '' });
  const [cadastroLocais, setCadastroLocais] = useState([]);

  const carregar = useCallback(() => {
    axios.get(base).then(r => {
      setDados(r.data);
      setCurriculo(r.data.curriculo_esportivo);
      setCurriculoSalvo(r.data.curriculo_esportivo);
    }).catch(() => setErro('Erro ao carregar o projeto'));
  }, [base]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { axios.get('/incentivo-esporte/calendario').then(r => setCalendario(r.data)).catch(() => {}); }, []);
  useEffect(() => { axios.get('/incentivo-esporte/locais-treino').then(r => setCadastroLocais(r.data)).catch(() => {}); }, []);

  const executar = async (fn, msgOk) => {
    setErro(''); setAviso('');
    try { const r = await fn(); if (msgOk) setAviso(typeof msgOk === 'function' ? msgOk(r) : msgOk); carregar(); return true; }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); return false; }
  };

  const sugerirCurriculo = async () => {
    setErro('');
    try {
      const r = await axios.get(`${base}/curriculo-sugerido`);
      if (!r.data.texto) return setErro('Sem histórico no sistema para montar o currículo — escreva manualmente.');
      setCurriculo(r.data.texto);
      setAviso('Texto gerado a partir do histórico — revise e clique em "Salvar currículo".');
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao gerar'); }
  };

  const nomeComp = (c) => `${c.nome}${c.etapa ? ` (${c.etapa})` : ''} ${String(c.nome).includes(String(c.ano)) ? '' : c.ano}`.trim();

  if (!dados) return <div style={card}><div style={cardHeader}><span style={titulo}>Projeto (formulário da prefeitura)</span></div><p style={{ padding: 18, color: '#aaa', fontSize: 13, margin: 0 }}>{erro || 'Carregando...'}</p></div>;
  const f = dados.formulario;

  return (
    <div style={card}>
      <div style={cardHeader}>
        <span style={titulo}>Projeto (formulário da prefeitura)</span>
        <span style={{ fontSize: 11, color: '#888' }}>Vai pro LEIA-ME do "Baixar projeto"</span>
      </div>
      <div style={{ padding: '4px 18px 16px' }}>
        {erro && <p style={{ color: '#c62828', fontSize: 12, margin: '8px 0 0' }}>{erro}</p>}
        {aviso && <p style={{ color: '#2e7d32', fontSize: 12, margin: '8px 0 0' }}>{aviso}</p>}

        {/* MODALIDADE */}
        <div style={subtitulo}>Modalidade esportiva / paradesportiva</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          {f.modalidade ? <b>{f.modalidade}</b> : <span style={{ color: '#ef6c00' }}>Sem esporte — defina em "✎ Editar" dos dados do participante.</span>}
          {f.modalidade && <BotaoCopiar texto={f.modalidade} />}
        </div>

        {/* CURRÍCULO */}
        <div style={subtitulo}>Currículo esportivo / paradesportivo</div>
        <textarea value={curriculo} onChange={e => setCurriculo(e.target.value)} rows={4} maxLength={Math.max(LIMITE_CURRICULO, curriculoSalvo.length)}
          placeholder="Descreva de forma clara e sucinta a carreira esportiva (ex.: tempo de prática, graduação, principais resultados)."
          style={{ ...estiloInput, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" onClick={sugerirCurriculo} style={btnAzul}>Gerar a partir do histórico</button>
          <button type="button" disabled={curriculo === curriculoSalvo || curriculo.trim().length > LIMITE_CURRICULO}
            onClick={() => executar(() => axios.put(`${base}/curriculo`, { texto: curriculo }), 'Currículo salvo.')} style={btnVerde}>Salvar currículo</button>
          <BotaoCopiar texto={curriculo} />
          {curriculo !== curriculoSalvo && <span style={{ fontSize: 11, color: '#ef6c00' }}>não salvo</span>}
          <span style={{ fontSize: 11, fontWeight: curriculo.length > LIMITE_CURRICULO ? 700 : 400, color: curriculo.length > LIMITE_CURRICULO ? '#c62828' : curriculo.length > LIMITE_CURRICULO - 50 ? '#ef6c00' : '#888' }}>
            {curriculo.length}/{LIMITE_CURRICULO}{curriculo.length > LIMITE_CURRICULO ? ` — passou ${curriculo.length - LIMITE_CURRICULO}, encurte para salvar` : ''}
          </span>
        </div>

        {/* OBJETIVOS */}
        <div style={subtitulo}>Objetivos ({dados.objetivos.length})</div>
        {dados.objetivos.map(o => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
            <span style={{ flex: 1 }}>{o.texto}</span>
            <BotaoCopiar texto={o.texto} />
            <button type="button" onClick={() => window.confirm('Remover este objetivo?') && executar(() => axios.delete(`${base}/objetivos/${o.id}`))} style={btnX}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
          <select value={novoObjetivo.meta} onChange={e => setNovoObjetivo(o => ({ ...o, meta: e.target.value }))} style={{ ...inputPeq, width: 190 }}>
            {Object.entries(META_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {novoObjetivo.meta === 'livre' ? (
            <input placeholder='Ex.: "Conquistar a faixa preta"' value={novoObjetivo.texto_livre} onChange={e => setNovoObjetivo(o => ({ ...o, texto_livre: e.target.value }))} style={{ ...inputPeq, flex: 1, minWidth: 220 }} />
          ) : (<>
            <select value={novoObjetivo.competicao_id} onChange={e => setNovoObjetivo(o => ({ ...o, competicao_id: e.target.value }))} style={{ ...inputPeq, flex: 2, minWidth: 200 }}>
              <option value="">Competição (aba Calendário)...</option>
              {calendario.map(c => <option key={c.id} value={c.id}>{nomeComp(c)}</option>)}
            </select>
            <input placeholder="Modalidade/prova (ex.: Kata Individual)" value={novoObjetivo.modalidade} onChange={e => setNovoObjetivo(o => ({ ...o, modalidade: e.target.value }))} style={{ ...inputPeq, flex: 1, minWidth: 170 }} />
            <input placeholder="Categoria (opcional)" value={novoObjetivo.categoria} onChange={e => setNovoObjetivo(o => ({ ...o, categoria: e.target.value }))} style={{ ...inputPeq, width: 150 }} />
          </>)}
          <button type="button" style={btnVerde} onClick={async () => {
            if (await executar(() => axios.post(`${base}/objetivos`, novoObjetivo))) setNovoObjetivo(o => ({ ...o, modalidade: '', categoria: '', texto_livre: '' }));
          }}>+ Adicionar</button>
        </div>
        {calendario.length === 0 && <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Nenhuma competição de {new Date().getFullYear() + 1} em diante — cadastre na aba "Calendário" do Incentivo ao Esporte.</p>}

        {/* COMPETIÇÕES PREVISTAS */}
        <div style={subtitulo}>Competições previstas ({f.competicoes.length})</div>
        {f.competicoes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ color: '#888', textAlign: 'left' }}><th>Evento</th><th>Período/data</th><th>Local</th><th /></tr></thead>
            <tbody>
              {f.competicoes.map(c => {
                const prevista = dados.competicoes_previstas.find(p => p.competicao_id === c.id);
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '4px 0' }}>{c.evento}</td><td>{c.periodo}</td><td>{c.local}</td>
                    <td style={{ textAlign: 'right' }}>
                      {prevista
                        ? <button type="button" onClick={() => executar(() => axios.delete(`${base}/competicoes/${prevista.id}`))} style={btnX}>✕</button>
                        : <span style={{ fontSize: 10, color: '#888' }}>via objetivo</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <select value={novaPrevista} onChange={e => setNovaPrevista(e.target.value)} style={{ ...inputPeq, flex: 1 }}>
            <option value="">Adicionar competição do Calendário...</option>
            {calendario.map(c => <option key={c.id} value={c.id}>{nomeComp(c)}</option>)}
          </select>
          <button type="button" disabled={!novaPrevista} style={btnVerde}
            onClick={async () => { if (await executar(() => axios.post(`${base}/competicoes`, { competicao_id: novaPrevista }))) setNovaPrevista(''); }}>+ Adicionar</button>
        </div>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>As competições dos objetivos entram aqui automaticamente.</p>

        {/* LOCAIS */}
        <div style={subtitulo}>Locais de treinamento ({dados.locais.length})</div>
        {dados.locais.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ color: '#888', textAlign: 'left' }}><th>Endereço</th><th>Dia</th><th>Início</th><th>Fim</th><th /></tr></thead>
            <tbody>
              {dados.locais.map(l => (
                <tr key={l.id} style={{ borderTop: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '4px 0' }}>{l.texto_local}</td><td>{DIAS[l.dia_semana]}</td>
                  <td>{String(l.hora_inicio).slice(0, 5)}</td><td>{String(l.hora_fim).slice(0, 5)}</td>
                  <td style={{ textAlign: 'right' }}><button type="button" onClick={() => executar(() => axios.delete(`${base}/locais/${l.id}`))} style={btnX}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <select value={novoLocal.local_id} onChange={e => setNovoLocal(l => ({ ...l, local_id: e.target.value }))} style={{ ...inputPeq, flex: 2, minWidth: 220 }}>
            <option value="">Local (aba Locais)...</option>
            {cadastroLocais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
          <select value={novoLocal.dia_semana} onChange={e => setNovoLocal(l => ({ ...l, dia_semana: e.target.value }))} style={{ ...inputPeq, width: 140 }}>
            {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input type="time" value={novoLocal.hora_inicio} onChange={e => setNovoLocal(l => ({ ...l, hora_inicio: e.target.value }))} style={{ ...inputPeq, width: 110 }} />
          <input type="time" value={novoLocal.hora_fim} onChange={e => setNovoLocal(l => ({ ...l, hora_fim: e.target.value }))} style={{ ...inputPeq, width: 110 }} />
          <button type="button" style={btnVerde} onClick={async () => {
            if (await executar(() => axios.post(`${base}/locais`, novoLocal))) setNovoLocal(l => ({ ...l, hora_inicio: '', hora_fim: '' }));
          }}>+ Adicionar</button>
          {participante.aluno_id && (
            <button type="button" style={btnAzul} onClick={() => executar(() => axios.post(`${base}/locais/importar-turmas`), r => r.data.mensagem)}>Importar das turmas do aluno</button>
          )}
        </div>
        {cadastroLocais.length === 0 && <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Nenhum local cadastrado — cadastre na aba "Locais" do Incentivo ao Esporte.</p>}
      </div>
    </div>
  );
}
