import React, { useState, useEffect } from 'react';
import axios from 'axios';

const estiloBtnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

export default function Chamadas() {
  const [turmas, setTurmas] = useState([]);
  const [turmaSel, setTurmaSel] = useState('');
  const [aulas, setAulas] = useState([]);
  const [aulaSel, setAulaSel] = useState('');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { axios.get('/turmas').then(r => setTurmas(r.data)); }, []);

  useEffect(() => {
    if (!turmaSel) return;
    axios.get('/aulas?turma_id=' + turmaSel).then(r => setAulas(r.data));
    setAulaSel(''); setDados(null);
  }, [turmaSel]);

  const carregarChamada = () => {
    if (!aulaSel) return;
    setCarregando(true);
    axios.get('/chamadas?aula_id=' + aulaSel)
      .then(r => setDados(r.data))
      .finally(() => setCarregando(false));
  };
  useEffect(carregarChamada, [aulaSel]);

  const lancarPresenca = async (alunoId) => {
    await axios.post('/chamadas', { aula_id: aulaSel, aluno_id: alunoId });
    carregarChamada();
  };

  const fecharAula = async () => {
    await axios.post('/chamadas/fechar/' + aulaSel);
    setMsg('Aula fechada com sucesso!');
    carregarChamada();
  };

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, minWidth: 200 }}>
            <option value="">Selecione a turma...</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <select value={aulaSel} onChange={e => setAulaSel(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, minWidth: 240 }}
            disabled={!turmaSel}>
            <option value="">Selecione a aula...</option>
            {aulas.map(a => <option key={a.id} value={a.id}>{a.data} {a.hora_inicio?.slice(0,5)}–{a.hora_fim?.slice(0,5)} [{a.status}]</option>)}
          </select>
          {dados?.aula?.status === 'aberta' && (
            <button style={{ ...estiloBtnPrimario, background: '#c62828' }} onClick={fecharAula}>Fechar Aula</button>
          )}
        </div>
        {msg && <p style={{ color: '#2e7d32', fontSize: 13, marginTop: 8 }}>{msg}</p>}
      </div>

      {carregando && <p>Carregando...</p>}

      {dados && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ marginTop: 0, color: '#2e7d32' }}>✅ Presentes ({dados.chamadas.length})</h3>
            {dados.chamadas.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>Nenhuma presença registrada.</p>}
            {dados.chamadas.map(c => (
              <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                {c.Aluno?.nome}
                <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{c.origem === 'qrcode' ? '📱 QR' : '👨‍🏫 Prof'}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ marginTop: 0, color: '#c62828' }}>❌ Ausentes ({dados.ausentes.length})</h3>
            {dados.ausentes.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>Todos presentes!</p>}
            {dados.ausentes.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                <span>{a.nome}</span>
                {dados.aula?.status === 'aberta' && (
                  <button onClick={() => lancarPresenca(a.id)}
                    style={{ fontSize: 12, padding: '4px 10px', background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: 4, cursor: 'pointer', color: '#2e7d32' }}>
                    + Presença
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
