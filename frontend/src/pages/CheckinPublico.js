import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CheckinPublico({ qrToken }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [checkinFeito, setCheckinFeito] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  useEffect(() => {
    axios.get(`/checkin/${qrToken}`)
      .then(({ data }) => setDados(data))
      .catch(() => setErro('QR Code inválido ou erro de conexão.'))
      .finally(() => setCarregando(false));
  }, [qrToken]);

  const fazerCheckin = async (alunoId, nomeAluno) => {
    setAlunoSelecionado(null);
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

  if (alunoSelecionado) return (
    <Tela>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🥋</div>
        <h2 style={{ margin: '8px 0' }}>Confirma o check-in de</h2>
        <p style={{ fontSize: 20, fontWeight: 'bold', color: '#1e2a38', margin: '4px 0 24px' }}>{alunoSelecionado.nome}?</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => setAlunoSelecionado(null)}
            style={{ padding: '12px 20px', borderRadius: 8, fontSize: 15, border: '2px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => fazerCheckin(alunoSelecionado.id, alunoSelecionado.nome)}
            style={{ padding: '12px 20px', borderRadius: 8, fontSize: 15, border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
            Sim, confirmar
          </button>
        </div>
      </div>
    </Tela>
  );

  const pendentes = dados.alunos.filter((a) => !a.checkin_feito);

  return (
    <Tela>
      <h2 style={{ textAlign: 'center', marginBottom: 8 }}>🥋 {dados.aula.turma}</h2>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: 24, fontSize: 14 }}>
        {dados.aula.hora_inicio} – {dados.aula.hora_fim} · Toque seu nome
      </p>
      {pendentes.length === 0
        ? <p style={{ color: '#888', fontSize: 16, textAlign: 'center' }}>✅ Todos os alunos já fizeram check-in.</p>
        : (
          <div>
            {pendentes.map((aluno) => (
              <button key={aluno.id} onClick={() => setAlunoSelecionado(aluno)}
                style={{
                  display: 'block', width: '100%', padding: '14px 16px', marginBottom: 10,
                  background: '#fff', border: '2px solid #ddd',
                  borderRadius: 8, fontSize: 16, textAlign: 'left', cursor: 'pointer', color: '#333',
                }}>
                {aluno.nome}
              </button>
            ))}
          </div>
        )}
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
