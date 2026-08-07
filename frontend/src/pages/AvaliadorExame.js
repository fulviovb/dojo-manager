import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Instância própria — o avaliador tem um token JWT de escopo restrito,
// separado do `token` de staff (que fica no localStorage da SPA principal).
// Usar o axios global aqui deixaria o interceptor da SPA sobrescrever o
// Authorization com o token de staff sempre que os dois convivessem no
// mesmo navegador (ex: admin testando o fluxo do avaliador).
const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api' });

const estiloInput = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 16, boxSizing: 'border-box' };
const estiloBtnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 4, cursor: 'pointer', fontSize: 15, width: '100%' };
const cardEstilo = { background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 12 };

const STATUS_LABEL = { pendente: 'Pendente', em_andamento: 'Em andamento', finalizada: 'Finalizada' };
const STATUS_COR = { pendente: '#888', em_andamento: '#1565c0', finalizada: '#2e7d32' };

const CONCEITOS = [
  { valor: '+', label: '+', cor: '#2e7d32' },
  { valor: '+-', label: '+ -', cor: '#f9a825' },
  { valor: '-', label: '-', cor: '#c62828' },
];

export default function AvaliadorExame({ exameId }) {
  const tokenKey = `avaliador_token_${exameId}`;
  const [token, setToken] = useState(localStorage.getItem(tokenKey));
  const [avaliador, setAvaliador] = useState(null);
  const [exame, setExame] = useState(null);
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [avaliacaoAtiva, setAvaliacaoAtiva] = useState(null);
  const [carregandoAvaliacao, setCarregandoAvaliacao] = useState(false);

  const carregarMinhasAvaliacoes = useCallback(() => {
    api.get('/avaliacao-publica/minhas-avaliacoes', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setAvaliacoes(r.data));
  }, [token]);

  useEffect(() => { if (token) carregarMinhasAvaliacoes(); }, [token, carregarMinhasAvaliacoes]);

  const login = async (e) => {
    e.preventDefault(); setErro('');
    try {
      const { data } = await api.post(`/avaliacao-publica/exames/${exameId}/login`, { pin });
      localStorage.setItem(tokenKey, data.token);
      setToken(data.token);
      setAvaliador(data.avaliador);
      setExame(data.exame);
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao entrar'); }
  };

  const sair = () => {
    localStorage.removeItem(tokenKey);
    setToken(null); setAvaliador(null); setExame(null); setAvaliacaoAtiva(null);
  };

  const abrirAvaliacao = async (id) => {
    setErro(''); setCarregandoAvaliacao(true);
    try {
      const { data } = await api.get(`/avaliacao-publica/avaliacoes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setAvaliacaoAtiva(data);
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao abrir avaliação'); }
    finally { setCarregandoAvaliacao(false); }
  };

  const responder = async (criterioId, conceito) => {
    setAvaliacaoAtiva((a) => ({ ...a, criterios: a.criterios.map((c) => c.id === criterioId ? { ...c, conceito } : c) }));
    try {
      await api.put(`/avaliacao-publica/avaliacoes/${avaliacaoAtiva.id}/criterios/${criterioId}`, { conceito }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar resposta'); }
  };

  const finalizar = async () => {
    setErro('');
    try {
      await api.post(`/avaliacao-publica/avaliacoes/${avaliacaoAtiva.id}/finalizar`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setAvaliacaoAtiva(null);
      carregarMinhasAvaliacoes();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao finalizar'); }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: 16 }}>
        <div style={{ ...cardEstilo, width: '100%', maxWidth: 360 }}>
          <h2 style={{ marginTop: 0 }}>🎖️ Avaliador de Exame</h2>
          <p style={{ color: '#888', fontSize: 13 }}>Digite o PIN que o professor te passou.</p>
          <form onSubmit={login}>
            <input required autoFocus inputMode="numeric" maxLength={6} placeholder="PIN" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              style={{ ...estiloInput, textAlign: 'center', letterSpacing: 4, fontSize: 24, marginBottom: 12 }} />
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <button type="submit" style={estiloBtnPrimario}>Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  if (carregandoAvaliacao) {
    return <div style={{ padding: 24, fontFamily: 'sans-serif', color: '#888' }}>Carregando...</div>;
  }

  if (avaliacaoAtiva) {
    const finalizada = avaliacaoAtiva.status === 'finalizada';
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif', padding: 16 }}>
        <button onClick={() => setAvaliacaoAtiva(null)} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 12 }}>
          ← Minhas avaliações
        </button>
        <div style={cardEstilo}>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>{avaliacaoAtiva.aluno?.nome}</h3>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>{avaliacaoAtiva.fase?.nome} · Faixa pretendida: {avaliacaoAtiva.faixa_pretendida?.nome}</div>
          {finalizada && <p style={{ color: '#2e7d32', fontSize: 13 }}>Avaliação finalizada. Peça pro professor reabrir se precisar corrigir.</p>}
        </div>

        {avaliacaoAtiva.criterios.filter((c) => c.aplicavel).map((c) => (
          <div key={c.id} style={cardEstilo}>
            <div style={{ fontSize: 15, marginBottom: 10 }}>{c.nome}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {CONCEITOS.map((op) => (
                <button key={op.valor} disabled={finalizada} onClick={() => responder(c.id, op.valor)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 6, cursor: finalizada ? 'default' : 'pointer', fontSize: 16, fontWeight: 600,
                    border: `2px solid ${op.cor}`, background: c.conceito === op.valor ? op.cor : '#fff', color: c.conceito === op.valor ? '#fff' : op.cor,
                  }}>
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
        {!finalizada && <button style={estiloBtnPrimario} onClick={finalizar}>Finalizar avaliação</button>}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Olá{avaliador?.nome ? `, ${avaliador.nome}` : ''}</h2>
          <div style={{ color: '#888', fontSize: 13 }}>{exame?.nome}</div>
        </div>
        <button onClick={sair} style={{ background: 'none', border: '1px solid #ccc', color: '#555', padding: '6px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}>Sair</button>
      </div>

      {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
      {avaliacoes.length === 0 && <p style={{ color: '#888' }}>Nenhuma avaliação atribuída pra você ainda.</p>}
      {avaliacoes.map((a) => (
        <div key={a.id} onClick={() => abrirAvaliacao(a.id)} style={{ ...cardEstilo, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{a.aluno?.nome}</div>
            <div style={{ color: '#888', fontSize: 13 }}>{a.fase?.nome} · Faixa pretendida: {a.faixa_pretendida?.nome}</div>
          </div>
          <span style={{ background: STATUS_COR[a.status], color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>{STATUS_LABEL[a.status]}</span>
        </div>
      ))}
    </div>
  );
}
