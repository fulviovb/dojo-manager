import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnCinza = { background: 'none', border: '1px solid #ccc', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnVerde = { background: '#2e7d32', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnPerigo = { background: '#c62828', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };

const NIVEL_LABEL = { municipal: 'Municipal', estadual: 'Estadual', nacional: 'Nacional', panamericano: 'Panamericano', mundial: 'Mundial' };
const NIVEL_COR = { municipal: '#607d8b', estadual: '#1565c0', nacional: '#2e7d32', panamericano: '#ef6c00', mundial: '#c62828' };
const MEDALHA = { 1: '🥇', 2: '🥈', 3: '🥉' };

function localCompeticao(c) {
  return [c.cidade, c.estado, c.pais && c.pais !== 'Brasil' ? c.pais : null].filter(Boolean).join(' / ');
}

function Modal({ titulo, onFechar, largura = 480, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '32px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 8, width: largura, maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{titulo}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, color: '#888' }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function ModalNovaConquista({ onFechar, onSalvo }) {
  const [competicoes, setCompeticoes] = useState([]);
  const [artes, setArtes] = useState([]);
  const [faixas, setFaixas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [novaCompeticao, setNovaCompeticao] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    aluno_id: '', nome_atleta: '', competicao_id: '', arte_marcial_id: '',
    faixa_id: '', colocacao: '', modalidade: '', categoria: '',
  });
  const [formComp, setFormComp] = useState({
    ano: new Date().getFullYear(), nome: '', etapa: '', nivel: 'estadual',
    entidade: '', cidade: '', estado: '', pais: 'Brasil',
  });

  useEffect(() => {
    axios.get('/conquistas/competicoes').then(r => setCompeticoes(r.data));
    axios.get('/artes-marciais').then(r => setArtes(r.data));
    axios.get('/usuarios', { params: { role: 'aluno', ativo: 'todos' } }).then(r => setAlunos(r.data));
  }, []);

  useEffect(() => {
    if (!form.arte_marcial_id) { setFaixas([]); return; }
    axios.get('/faixas', { params: { arte_marcial_id: form.arte_marcial_id } }).then(r => setFaixas(r.data));
  }, [form.arte_marcial_id]);

  const selecionarAluno = (id) => {
    const a = alunos.find(x => x.id === id);
    setForm(f => ({ ...f, aluno_id: id, nome_atleta: a ? a.nome : f.nome_atleta }));
  };

  const salvar = async () => {
    setErro('');
    if (!form.nome_atleta.trim()) { setErro('Informe o nome do atleta'); return; }
    if (!form.modalidade.trim()) { setErro('Informe a modalidade'); return; }
    setSalvando(true);
    try {
      let competicaoId = form.competicao_id;
      if (novaCompeticao) {
        if (!formComp.nome.trim() || !formComp.ano) { setErro('Preencha ano e nome da competição'); setSalvando(false); return; }
        const r = await axios.post('/conquistas/competicoes', formComp);
        competicaoId = r.data.id;
      }
      if (!competicaoId) { setErro('Selecione ou cadastre uma competição'); setSalvando(false); return; }

      await axios.post('/conquistas', {
        aluno_id: form.aluno_id || null,
        nome_atleta: form.nome_atleta.trim(),
        competicao_id: competicaoId,
        arte_marcial_id: form.arte_marcial_id || null,
        faixa_id: form.faixa_id || null,
        colocacao: form.colocacao === '' ? null : parseInt(form.colocacao, 10),
        modalidade: form.modalidade.trim(),
        categoria: form.categoria.trim() || null,
      });
      onSalvo();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao salvar');
    } finally { setSalvando(false); }
  };

  return (
    <Modal titulo="Nova Conquista" onFechar={onFechar} largura={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Atleta *</label>
          <input value={form.nome_atleta} onChange={e => setForm(f => ({ ...f, nome_atleta: e.target.value, aluno_id: '' }))}
            style={estiloInput} placeholder="Nome do atleta" list="lista-alunos" />
          <datalist id="lista-alunos">
            {alunos.map(a => <option key={a.id} value={a.nome} />)}
          </datalist>
          <select value={form.aluno_id} onChange={e => selecionarAluno(e.target.value)} style={{ ...estiloInput, marginTop: 6 }}>
            <option value="">Sem vínculo com cadastro de Aluno (afastado/nome livre)</option>
            {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}{!a.ativo ? ' (inativo)' : ''}</option>)}
          </select>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ fontSize: 12 }}>Competição *</label>
            <button type="button" style={{ ...btnCinza, fontSize: 11, padding: '2px 8px' }}
              onClick={() => setNovaCompeticao(v => !v)}>
              {novaCompeticao ? 'Usar existente' : '+ Nova competição'}
            </button>
          </div>

          {!novaCompeticao ? (
            <select value={form.competicao_id} onChange={e => setForm(f => ({ ...f, competicao_id: e.target.value }))} style={estiloInput}>
              <option value="">Selecione...</option>
              {competicoes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.ano} — {c.nome}{c.etapa ? ` (${c.etapa})` : ''} — {localCompeticao(c) || NIVEL_LABEL[c.nivel]}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f9f9f9', padding: 10, borderRadius: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" placeholder="Ano *" value={formComp.ano} onChange={e => setFormComp(f => ({ ...f, ano: e.target.value }))} style={{ ...estiloInput, width: 90 }} />
                <select value={formComp.nivel} onChange={e => setFormComp(f => ({ ...f, nivel: e.target.value }))} style={estiloInput}>
                  {Object.entries(NIVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <input placeholder="Nome da competição *" value={formComp.nome} onChange={e => setFormComp(f => ({ ...f, nome: e.target.value }))} style={estiloInput} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Etapa (opcional)" value={formComp.etapa} onChange={e => setFormComp(f => ({ ...f, etapa: e.target.value }))} style={estiloInput} />
                <input placeholder="Entidade (opcional)" value={formComp.entidade} onChange={e => setFormComp(f => ({ ...f, entidade: e.target.value }))} style={estiloInput} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Cidade" value={formComp.cidade} onChange={e => setFormComp(f => ({ ...f, cidade: e.target.value }))} style={estiloInput} />
                <input placeholder="UF" value={formComp.estado} onChange={e => setFormComp(f => ({ ...f, estado: e.target.value }))} style={{ ...estiloInput, width: 60 }} />
                <input placeholder="País" value={formComp.pais} onChange={e => setFormComp(f => ({ ...f, pais: e.target.value }))} style={estiloInput} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Arte marcial</label>
            <select value={form.arte_marcial_id} onChange={e => setForm(f => ({ ...f, arte_marcial_id: e.target.value, faixa_id: '' }))} style={estiloInput}>
              <option value="">—</option>
              {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Graduação na época</label>
            <select value={form.faixa_id} onChange={e => setForm(f => ({ ...f, faixa_id: e.target.value }))} style={estiloInput} disabled={!form.arte_marcial_id}>
              <option value="">—</option>
              {faixas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Modalidade *</label>
            <input value={form.modalidade} onChange={e => setForm(f => ({ ...f, modalidade: e.target.value }))} style={estiloInput} placeholder="Ex: Kata Individual" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Colocação</label>
            <input type="number" min={1} value={form.colocacao} onChange={e => setForm(f => ({ ...f, colocacao: e.target.value }))} style={estiloInput} placeholder="1" />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Categoria</label>
          <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={estiloInput} placeholder="Ex: 12-13 anos" />
        </div>

        {erro && <p style={{ color: 'red', fontSize: 12, margin: 0 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={btnCinza} onClick={onFechar}>Cancelar</button>
          <button style={btnVerde} disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function Conquistas({ onVerAluno }) {
  const [conquistas, setConquistas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [ano, setAno] = useState('');
  const [nivel, setNivel] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = () => {
    setCarregando(true);
    axios.get('/conquistas').then(r => setConquistas(r.data)).finally(() => setCarregando(false));
  };

  useEffect(() => { carregar(); }, []);

  const anos = useMemo(() => [...new Set(conquistas.map(c => c.Competicao?.ano))].filter(Boolean).sort((a, b) => b - a), [conquistas]);

  const filtradas = conquistas.filter(c => {
    if (ano && String(c.Competicao?.ano) !== String(ano)) return false;
    if (nivel && c.Competicao?.nivel !== nivel) return false;
    if (busca) {
      const alvo = `${c.nome_atleta} ${c.Competicao?.nome} ${c.modalidade}`.toLowerCase();
      if (!alvo.includes(busca.toLowerCase())) return false;
    }
    return true;
  });

  const remover = async (id) => {
    if (!window.confirm('Remover esta conquista?')) return;
    await axios.delete(`/conquistas/${id}`);
    carregar();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Buscar por atleta, competição ou modalidade..." value={busca}
            onChange={e => setBusca(e.target.value)} style={{ ...estiloInput, maxWidth: 300 }} />
          <select value={ano} onChange={e => setAno(e.target.value)} style={{ ...estiloInput, width: 100 }}>
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={nivel} onChange={e => setNivel(e.target.value)} style={{ ...estiloInput, width: 150 }}>
            <option value="">Todos os níveis</option>
            {Object.entries(NIVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#888', whiteSpace: 'nowrap' }}>{filtradas.length} conquista{filtradas.length !== 1 ? 's' : ''}</span>
          <button style={btnPrimario} onClick={() => setModalAberto(true)}>+ Nova Conquista</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {['', 'Ano', 'Atleta', 'Competição', 'Nível', 'Local', 'Modalidade', 'Categoria', ''].map((h, i) => (
                <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Carregando...</td></tr>
            )}
            {!carregando && filtradas.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhuma conquista encontrada.</td></tr>
            )}
            {filtradas.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 0 10px 16px', fontSize: 18, textAlign: 'center', width: 30 }}>
                  {MEDALHA[c.colocacao] || (c.colocacao ? `${c.colocacao}º` : '—')}
                </td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{c.Competicao?.ano}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>
                  {c.aluno_id ? (
                    <button onClick={() => onVerAluno?.(c.aluno_id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#1565c0', padding: 0, textAlign: 'left' }}>
                      {c.nome_atleta}
                    </button>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{c.nome_atleta}</span>
                  )}
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>
                  {c.Competicao?.nome}{c.Competicao?.etapa ? ` — ${c.Competicao.etapa}` : ''}
                </td>
                <td style={{ padding: '10px 16px', fontSize: 12 }}>
                  {c.Competicao?.nivel && (
                    <span style={{ background: NIVEL_COR[c.Competicao.nivel] + '20', color: NIVEL_COR[c.Competicao.nivel], padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      {NIVEL_LABEL[c.Competicao.nivel]}
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{localCompeticao(c.Competicao || {}) || '—'}</td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{c.modalidade}</td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{c.categoria || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <button onClick={() => remover(c.id)} style={btnPerigo}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <ModalNovaConquista onFechar={() => setModalAberto(false)} onSalvo={() => { setModalAberto(false); carregar(); }} />
      )}
    </div>
  );
}
