import React, { useState, useEffect } from 'react';
import axios from 'axios';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const estiloBtnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function Modal({ titulo, onFechar, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 480, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{titulo}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Turmas() {
  const [turmas, setTurmas] = useState([]);
  const [artes, setArtes] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [salas, setSalas] = useState([]);
  const [turmaAtiva, setTurmaAtiva] = useState(null);
  const [modalTurma, setModalTurma] = useState(false);
  const [modalHorario, setModalHorario] = useState(false);
  const [formTurma, setFormTurma] = useState({ nome: '', arte_marcial_id: '', professor_id: '' });
  const [formHorario, setFormHorario] = useState({ dia_semana: 1, hora_inicio: '18:00', hora_fim: '19:30', sala_id: '' });
  const [erro, setErro] = useState('');

  const carregar = () => axios.get('/turmas').then(r => setTurmas(r.data));
  useEffect(() => {
    carregar();
    axios.get('/artes-marciais').then(r => setArtes(r.data));
    axios.get('/usuarios?role=professor').then(r => setProfessores(r.data));
    axios.get('/salas').then(r => setSalas(r.data));
  }, []);

  const salvarTurma = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await axios.post('/turmas', formTurma);
      setModalTurma(false);
      setFormTurma({ nome: '', arte_marcial_id: '', professor_id: '' });
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  const salvarHorario = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await axios.post('/horarios', { ...formHorario, turma_id: turmaAtiva.id, hora_inicio: formHorario.hora_inicio + ':00', hora_fim: formHorario.hora_fim + ':00' });
      setModalHorario(false);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={estiloBtnPrimario} onClick={() => setModalTurma(true)}>+ Nova Turma</button>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {turmas.length === 0 && <p style={{ color: '#888' }}>Nenhuma turma cadastrada.</p>}
        {turmas.map(t => (
          <div key={t.id} style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{t.nome}</strong>
                <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
                  {t.ArteMarcial?.nome} · Prof. {t.Professor?.nome}
                </div>
              </div>
              <button style={{ ...estiloBtnPrimario, fontSize: 12 }}
                onClick={() => { setTurmaAtiva(t); setModalHorario(true); }}>
                + Horário
              </button>
            </div>
            {t.HorarioTurmas?.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {t.HorarioTurmas.map(h => (
                  <span key={h.id} style={{ background: '#e8eaf6', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
                    {DIAS[h.dia_semana]} {h.hora_inicio.slice(0,5)}–{h.hora_fim.slice(0,5)} ({h.Sala?.nome})
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {modalTurma && (
        <Modal titulo="Nova Turma" onFechar={() => setModalTurma(false)}>
          <form onSubmit={salvarTurma}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Nome</label>
              <input required value={formTurma.nome} onChange={e => setFormTurma(p => ({ ...p, nome: e.target.value }))} style={estiloInput} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Arte Marcial</label>
              <select required value={formTurma.arte_marcial_id} onChange={e => setFormTurma(p => ({ ...p, arte_marcial_id: e.target.value }))} style={estiloInput}>
                <option value="">Selecione...</option>
                {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Professor</label>
              <select required value={formTurma.professor_id} onChange={e => setFormTurma(p => ({ ...p, professor_id: e.target.value }))} style={estiloInput}>
                <option value="">Selecione...</option>
                {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setModalTurma(false)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={estiloBtnPrimario}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {modalHorario && turmaAtiva && (
        <Modal titulo={"Horário — " + turmaAtiva.nome} onFechar={() => setModalHorario(false)}>
          <form onSubmit={salvarHorario}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Dia da Semana</label>
              <select value={formHorario.dia_semana} onChange={e => setFormHorario(p => ({ ...p, dia_semana: Number(e.target.value) }))} style={estiloInput}>
                {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Início</label>
                <input type="time" required value={formHorario.hora_inicio} onChange={e => setFormHorario(p => ({ ...p, hora_inicio: e.target.value }))} style={estiloInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Fim</label>
                <input type="time" required value={formHorario.hora_fim} onChange={e => setFormHorario(p => ({ ...p, hora_fim: e.target.value }))} style={estiloInput} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Sala</label>
              <select required value={formHorario.sala_id} onChange={e => setFormHorario(p => ({ ...p, sala_id: e.target.value }))} style={estiloInput}>
                <option value="">Selecione...</option>
                {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setModalHorario(false)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={estiloBtnPrimario}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
