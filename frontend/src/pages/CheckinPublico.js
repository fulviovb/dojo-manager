import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CheckinPublico({ qrToken }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [checkinFeito, setCheckinFeito] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    axios.get(`/checkin/${qrToken}`)
      .then(({ data }) => setDados(data))
      .catch(() => setErro('QR Code inválido ou erro de conexão.'))
      .finally(() => setCarregando(false));
  }, [qrToken]);

  const fazerCheckin = async (alunoId, nomeAluno) => {
    try {
      await axios.post(`/checkin/${qrToken}`, { aluno_id: alunoId });
      setCheckinFeito(nomeAluno);
      setDados((prev) => ({
        ...prev,
        alunos: prev.alunos.map((a) => a.id === alunoId ? { ...a, checkin_feito: true } : a),
      }));
    } catch {
      setErro('Erro ao registrar check-in. Tente novamente.');
    }
  };

  if (carregando) return <Tela><p>Carregando...</p></Tela>;
  if (erro) return <Tela><p style={{ color: 'red' }}>{erro}</p></Tela>;
  if (!dados?.aula_ativa) return <Tela><p style={{ color: '#888', fontSize: 18 }}>⏰ Nenhuma aula em andamento no momento.</p></Tela>;

  if (checkinFeito) return (
    <Tela>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>✅</div>
        <h2 style={{ color: '#2e7d32' }}>Check-in confirmado!</h2>
        <p style={{ color: '#555' }}>{checkinFeito}</p>
        <p style={{ color: '#888', fontSize: 14 }}>Aula: {dados.aula.turma}</p>
      </div>
    </Tela>
  );

  return (
    <Tela>
      <h2 style={{ textAlign: 'center', marginBottom: 8 }}>🥋 {dados.aula.turma}</h2>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: 24, fontSize: 14 }}>
        {dados.aula.hora_inicio} – {dados.aula.hora_fim} · Toque seu nome
      </p>
      <div>
        {dados.alunos.map((aluno) => (
          <button key={aluno.id} onClick={() => !aluno.checkin_feito && fazerCheckin(aluno.id, aluno.nome)}
            disabled={aluno.checkin_feito}
            style={{
              display: 'block', width: '100%', padding: '14px 16px', marginBottom: 10,
              background: aluno.checkin_feito ? '#e8f5e9' : '#fff',
              border: `2px solid ${aluno.checkin_feito ? '#4caf50' : '#ddd'}`,
              borderRadius: 8, fontSize: 16, textAlign: 'left', cursor: aluno.checkin_feito ? 'default' : 'pointer',
              color: aluno.checkin_feito ? '#2e7d32' : '#333',
            }}>
            {aluno.checkin_feito ? '✅ ' : ''}{aluno.nome}
          </button>
        ))}
      </div>
    </Tela>
  );
}

function Tela({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', background: '#f5f5f5', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', marginTop: 32 }}>
        {children}
      </div>
    </div>
  );
}
