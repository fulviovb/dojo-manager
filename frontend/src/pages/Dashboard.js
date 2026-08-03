import React, { useState, useEffect } from 'react';
import axios from 'axios';

const COR_SEMAFORO = { amarelo: '#f9a825', laranja: '#e65100', vermelho: '#c62828' };
const BG_SEMAFORO  = { amarelo: '#fffde7', laranja: '#fbe9e7', vermelho: '#ffebee' };

function Card({ title, value, sub, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 160 }}>
      <div style={{ fontSize: 28, fontWeight: 'bold', color: color || '#1e2a38' }}>{value}</div>
      <div style={{ fontWeight: 600, marginTop: 4 }}>{title}</div>
      {sub && <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ onVerAluno }) {
  const [resumo, setResumo] = useState(null);
  const [semaforo, setSemaforo] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/dashboard').then(r => r.data),
      axios.get('/dashboard/semaforo').then(r => r.data.alertas),
    ]).then(([r, s]) => { setResumo(r); setSemaforo(s); })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <p>Carregando...</p>;
  if (!resumo) return <p style={{ color: 'red' }}>Erro ao carregar dashboard.</p>;

  const { alunos, turmas, frequencia, financeiro, periodo } = resumo;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <Card title="Alunos ativos" value={alunos.total} />
        <Card title="Turmas ativas" value={turmas.total} />
        <Card title="Aulas (30 dias)" value={frequencia.aulas_periodo} sub={"Média " + frequencia.media_presentes + " alunos/aula"} />
        <Card title="Mensalidades pendentes" value={financeiro.mensalidades_pendentes} color={financeiro.mensalidades_pendentes > 0 ? '#c62828' : undefined} />
        <Card title="Receita do mês" value={"R$ " + Number(financeiro.receita_mes).toFixed(2)} color="#2e7d32" />
      </div>

      <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Semáforo de Ausência</h3>
        {semaforo.length === 0 ? (
          <p style={{ color: '#888' }}>✅ Nenhum alerta de ausência no momento.</p>
        ) : (
          semaforo.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 6, marginBottom: 8, background: BG_SEMAFORO[a.cor], border: "1px solid " + COR_SEMAFORO[a.cor] }}>
              <span style={{ fontSize: 20 }}>{a.cor === 'amarelo' ? '🟡' : a.cor === 'laranja' ? '🟠' : '🔴'}</span>
              <div style={{ flex: 1 }}>
                <button onClick={() => onVerAluno?.(a.aluno.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: '#1565c0', fontWeight: 'bold' }}>
                  {a.aluno.nome}
                </button> <span style={{ color: '#666', fontSize: 13 }}>— {a.turma.nome}</span>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{a.motivo}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ color: '#aaa', fontSize: 12, marginTop: 12 }}>
        Período: {periodo.inicio} → {periodo.fim}
      </div>
    </div>
  );
}
