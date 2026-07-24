import React, { useState, useEffect } from 'react';
import axios from 'axios';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const estiloBtnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

export default function Configuracoes() {
  const [escola, setEscola] = useState(null);
  const [threshold, setThreshold] = useState(40);
  const [artes, setArtes] = useState([]);
  const [faixas, setFaixas] = useState([]);
  const [criterios, setCriterios] = useState([]);
  const [salas, setSalas] = useState([]);
  const [msgEscola, setMsgEscola] = useState('');
  const [formArte, setFormArte] = useState('');
  const [formFaixa, setFormFaixa] = useState({ arte_marcial_id: '', nome: '', cor: '#ffffff', ordem: 1 });
  const [formCriterio, setFormCriterio] = useState({ arte_marcial_id: '', faixa_id: '', min_aulas: 30 });
  const [formSala, setFormSala] = useState('');
  const [erro, setErro] = useState('');

  const carregar = () => {
    axios.get('/escolas').then(r => { if (r.data[0]) { setEscola(r.data[0]); setThreshold(r.data[0].threshold_falta_vermelho); } });
    axios.get('/artes-marciais').then(r => setArtes(r.data));
    axios.get('/criterios-graduacao').then(r => setCriterios(r.data));
    axios.get('/salas').then(r => setSalas(r.data));
  };
  useEffect(carregar, []);

  useEffect(() => {
    if (formFaixa.arte_marcial_id) axios.get('/faixas?arte_marcial_id=' + formFaixa.arte_marcial_id).then(r => setFaixas(r.data));
    if (formCriterio.arte_marcial_id) axios.get('/faixas?arte_marcial_id=' + formCriterio.arte_marcial_id).then(r => setFaixas(r.data));
  }, [formFaixa.arte_marcial_id, formCriterio.arte_marcial_id]);

  const salvarThreshold = async () => {
    try {
      await axios.put('/escolas/' + escola.id, { threshold_falta_vermelho: threshold });
      setMsgEscola('Salvo!');
      setTimeout(() => setMsgEscola(''), 2000);
    } catch { setMsgEscola('Erro ao salvar.'); }
  };

  const addArte = async (e) => {
    e.preventDefault(); setErro('');
    try { await axios.post('/artes-marciais', { nome: formArte }); setFormArte(''); carregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  const addFaixa = async (e) => {
    e.preventDefault(); setErro('');
    try { await axios.post('/faixas', formFaixa); setFormFaixa(f => ({ ...f, nome: '', ordem: f.ordem + 1 })); carregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  const addCriterio = async (e) => {
    e.preventDefault(); setErro('');
    try { await axios.post('/criterios-graduacao', formCriterio); carregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  const addSala = async (e) => {
    e.preventDefault(); setErro('');
    try { await axios.post('/salas', { nome: formSala }); setFormSala(''); carregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  const Secao = ({ titulo, children }) => (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>{titulo}</h3>
      {children}
    </div>
  );

  return (
    <div>
      <Secao titulo="Parametros da Escola">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 14 }}>Threshold vermelho (% de faltas):</label>
          <input type="number" min={1} max={100} value={threshold} onChange={e => setThreshold(e.target.value)}
            style={{ ...estiloInput, width: 80 }} />
          <button style={estiloBtnPrimario} onClick={salvarThreshold}>Salvar</button>
          {msgEscola && <span style={{ color: '#2e7d32', fontSize: 13 }}>{msgEscola}</span>}
        </div>
      </Secao>

      <Secao titulo="Artes Marciais">
        <form onSubmit={addArte} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input required placeholder="Nome da arte marcial" value={formArte} onChange={e => setFormArte(e.target.value)} style={{ ...estiloInput, maxWidth: 260 }} />
          <button type="submit" style={estiloBtnPrimario}>Adicionar</button>
        </form>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {artes.map(a => (
            <span key={a.id} style={{ background: '#e8eaf6', padding: '6px 14px', borderRadius: 20, fontSize: 13 }}>{a.nome}</span>
          ))}
        </div>
      </Secao>

      <Secao titulo="Faixas">
        <form onSubmit={addFaixa} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Arte Marcial</label>
            <select required value={formFaixa.arte_marcial_id} onChange={e => setFormFaixa(f => ({ ...f, arte_marcial_id: e.target.value }))}
              style={{ ...estiloInput, width: 160 }}>
              <option value="">Selecione...</option>
              {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Nome</label>
            <input required placeholder="Ex: Branca" value={formFaixa.nome} onChange={e => setFormFaixa(f => ({ ...f, nome: e.target.value }))} style={{ ...estiloInput, width: 120 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Cor</label>
            <input type="color" value={formFaixa.cor} onChange={e => setFormFaixa(f => ({ ...f, cor: e.target.value }))} style={{ height: 36, width: 48, border: '1px solid #ddd', borderRadius: 4, padding: 2 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Ordem</label>
            <input type="number" min={1} required value={formFaixa.ordem} onChange={e => setFormFaixa(f => ({ ...f, ordem: Number(e.target.value) }))} style={{ ...estiloInput, width: 70 }} />
          </div>
          <button type="submit" style={estiloBtnPrimario}>Adicionar</button>
        </form>
        {artes.map(a => {
          const fs = (a.Faixas || []).sort((x, y) => x.ordem - y.ordem);
          if (fs.length === 0) return null;
          return (
            <div key={a.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{a.nome}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {fs.map(f => (
                  <span key={f.id} style={{ background: f.cor, border: '1px solid #ddd', padding: '4px 12px', borderRadius: 20, fontSize: 12, color: '#333' }}>
                    {f.ordem}. {f.nome}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </Secao>

      <Secao titulo="Criterios de Graduacao">
        <form onSubmit={addCriterio} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Arte Marcial</label>
            <select required value={formCriterio.arte_marcial_id} onChange={e => setFormCriterio(f => ({ ...f, arte_marcial_id: e.target.value, faixa_id: '' }))}
              style={{ ...estiloInput, width: 160 }}>
              <option value="">Selecione...</option>
              {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Faixa</label>
            <select required value={formCriterio.faixa_id} onChange={e => setFormCriterio(f => ({ ...f, faixa_id: e.target.value }))}
              style={{ ...estiloInput, width: 140 }} disabled={!formCriterio.arte_marcial_id}>
              <option value="">Selecione...</option>
              {faixas.filter(f => f.arte_marcial_id === formCriterio.arte_marcial_id).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Min. aulas</label>
            <input type="number" min={1} required value={formCriterio.min_aulas} onChange={e => setFormCriterio(f => ({ ...f, min_aulas: Number(e.target.value) }))} style={{ ...estiloInput, width: 80 }} />
          </div>
          <button type="submit" style={estiloBtnPrimario}>Adicionar</button>
        </form>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {criterios.length === 0 && <tr><td style={{ color: '#888', fontSize: 13 }}>Nenhum criterio cadastrado.</td></tr>}
            {criterios.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 0', fontSize: 14 }}>{c.ArteMarcial?.nome}</td>
                <td style={{ padding: '8px 0', fontSize: 14, color: '#555' }}>{c.Faixa?.nome}</td>
                <td style={{ padding: '8px 0', fontSize: 14, color: '#555' }}>{c.min_aulas} aulas</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      <Secao titulo="Salas e QR Codes">
        <form onSubmit={addSala} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input required placeholder="Nome da sala" value={formSala} onChange={e => setFormSala(e.target.value)} style={{ ...estiloInput, maxWidth: 260 }} />
          <button type="submit" style={estiloBtnPrimario}>Adicionar</button>
        </form>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 13 }}>Sala</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 13 }}>URL do Check-in</th>
            </tr>
          </thead>
          <tbody>
            {salas.length === 0 && <tr><td colSpan={2} style={{ padding: 16, color: '#888', fontSize: 13 }}>Nenhuma sala cadastrada.</td></tr>}
            {salas.map(s => (
              <tr key={s.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px' }}>{s.nome}</td>
                <td style={{ padding: '10px 12px' }}>
                  <code style={{ fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
                    {window.location.origin}/checkin/{s.qr_token}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
    </div>
  );
}
