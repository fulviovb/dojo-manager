import React, { useState, useEffect } from 'react';
import axios from 'axios';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const estiloBtnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const estiloBtnSecundario = { background: '#fff', color: '#1e2a38', border: '1px solid #1e2a38', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

const STATUS_LABEL = { planejamento: 'Planejamento', em_andamento: 'Em andamento', finalizado: 'Finalizado' };
const STATUS_COR = { planejamento: '#888', em_andamento: '#1565c0', finalizado: '#2e7d32' };

function Modal({ titulo, onFechar, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 440, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{titulo}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Exames({ onVerExame }) {
  const [exames, setExames] = useState([]);
  const [artes, setArtes] = useState([]);
  // null | 'novo' | 'roteiro-padrao' — os dois fluxos de criação reaproveitam o mesmo formulário
  const [modalTipo, setModalTipo] = useState(null);
  const [form, setForm] = useState({ arte_marcial_id: '', nome: '', data: '' });
  const [erro, setErro] = useState('');

  const carregar = () => axios.get('/exames').then(r => setExames(r.data));
  useEffect(() => { carregar(); }, []);
  useEffect(() => { axios.get('/artes-marciais').then(r => setArtes(r.data)); }, []);

  const abrirModal = (tipo) => { setModalTipo(tipo); setErro(''); setForm({ arte_marcial_id: '', nome: '', data: '' }); };

  const salvar = async (e) => {
    e.preventDefault(); setErro('');
    const endpoint = modalTipo === 'roteiro-padrao' ? '/exames/comecar-com-roteiro-padrao' : '/exames';
    try {
      const { data } = await axios.post(endpoint, form);
      setModalTipo(null);
      carregar();
      onVerExame?.(data.id);
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', gap: 12 }}>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
          Módulo opcional pra apoiar a avaliação no dia do exame de faixa. O roteiro (fases/critérios) é montado
          dentro de cada exame, enquanto ele está em planejamento.
        </p>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button style={estiloBtnSecundario} onClick={() => abrirModal('roteiro-padrao')}>🌟 Começar com base em roteiro padrão</button>
          <button style={estiloBtnPrimario} onClick={() => abrirModal('novo')}>+ Novo Exame</button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {exames.length === 0 && <p style={{ color: '#888' }}>Nenhum exame cadastrado.</p>}
        {exames.map(ex => (
          <div key={ex.id} style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <button onClick={() => onVerExame?.(ex.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontSize: 16, fontWeight: 600, color: '#1565c0' }}>
                  {ex.nome}
                </button>
                {ex.tipo === 'roteiro_padrao' && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#a15c00', background: '#fff3cd', padding: '2px 8px', borderRadius: 20 }}>🌟 Roteiro Padrão</span>
                )}
                <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
                  {ex.ArteMarcial?.nome} · {new Date(ex.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              </div>
              <span style={{ background: STATUS_COR[ex.status], color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
                {STATUS_LABEL[ex.status] || ex.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {modalTipo && (
        <Modal titulo={modalTipo === 'roteiro-padrao' ? 'Começar exame com base em Roteiro Padrão' : 'Novo Exame de Faixa'} onFechar={() => setModalTipo(null)}>
          <form onSubmit={salvar}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Arte Marcial</label>
              <select required value={form.arte_marcial_id} onChange={e => setForm(f => ({ ...f, arte_marcial_id: e.target.value }))} style={estiloInput}>
                <option value="">Selecione...</option>
                {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Nome</label>
              <input required placeholder="Ex: Exame de Faixa — Agosto/2026" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={estiloInput} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Data</label>
              <input required type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={estiloInput} />
            </div>
            <p style={{ fontSize: 12, color: '#888' }}>
              {modalTipo === 'roteiro-padrao'
                ? 'O roteiro (fases/critérios) do Roteiro Padrão dessa arte marcial será copiado pra cá — dá pra ajustar livremente depois.'
                : 'O roteiro (fases/critérios) do exame mais recente dessa arte marcial, se existir, será copiado pra cá — é só um ponto de partida, dá pra ajustar livremente depois.'}
            </p>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setModalTipo(null)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={estiloBtnPrimario}>Criar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
