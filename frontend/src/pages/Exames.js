import React, { useState, useEffect } from 'react';
import axios from 'axios';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const estiloBtnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

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
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ arte_marcial_id: '', nome: '', data: '' });
  const [erro, setErro] = useState('');

  const carregar = () => axios.get('/exames').then(r => setExames(r.data));
  useEffect(carregar, []);
  useEffect(() => { axios.get('/artes-marciais').then(r => setArtes(r.data)); }, []);

  const salvar = async (e) => {
    e.preventDefault(); setErro('');
    try {
      const { data } = await axios.post('/exames', form);
      setModalAberto(false);
      setForm({ arte_marcial_id: '', nome: '', data: '' });
      carregar();
      onVerExame?.(data.id);
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
          Módulo opcional pra apoiar a avaliação no dia do exame de faixa. O roteiro (fases/critérios) é configurado
          em Configurações → Exame de Faixa.
        </p>
        <button style={estiloBtnPrimario} onClick={() => setModalAberto(true)}>+ Novo Exame</button>
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

      {modalAberto && (
        <Modal titulo="Novo Exame de Faixa" onFechar={() => setModalAberto(false)}>
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
              As fases/critérios cadastrados em Configurações pra essa arte marcial serão copiados pro exame.
            </p>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={estiloBtnPrimario}>Criar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
