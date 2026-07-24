import React, { useState } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alunos from './pages/Alunos';
import AlunoDetalhe from './pages/AlunoDetalhe';
import Turmas from './pages/Turmas';
import Chamadas from './pages/Chamadas';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';
import CheckinPublico from './pages/CheckinPublico';

axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'alunos', label: 'Alunos', icon: '👥' },
  { id: 'turmas', label: 'Turmas', icon: '🥋' },
  { id: 'chamadas', label: 'Chamadas', icon: '✅' },
  { id: 'financeiro', label: 'Financeiro', icon: '💰' },
  { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
];

const PAGINAS = { dashboard: Dashboard, alunos: Alunos, turmas: Turmas, chamadas: Chamadas, financeiro: Financeiro, configuracoes: Configuracoes };

export default function App() {
  const checkinMatch = window.location.pathname.match(/^\/checkin\/([^/]+)/);
  if (checkinMatch) return <CheckinPublico qrToken={checkinMatch[1]} />;
  return <AppInterna />;
}

function AppInterna() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [usuario, setUsuario] = useState(JSON.parse(localStorage.getItem('usuario') || 'null'));
  const [paginaAtiva, setPaginaAtiva] = useState('dashboard');
  const [menuAberto, setMenuAberto] = useState(true);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(null);

  const navegarParaAluno = (id) => setAlunoSelecionadoId(id);
  const voltarDaAluno = () => setAlunoSelecionadoId(null);

  const handleLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;

  const PaginaAtual = PAGINAS[paginaAtiva] || Dashboard;

  const mudarPagina = (id) => {
    setPaginaAtiva(id);
    setAlunoSelecionadoId(null);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: menuAberto ? 220 : 60, background: '#1e2a38', color: '#fff', transition: 'width 0.2s', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #2d3f52', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {menuAberto && <span style={{ fontWeight: 'bold', fontSize: 14 }}>🥋 Escola AM</span>}
          <button onClick={() => setMenuAberto(!menuAberto)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>☰</button>
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {MENU.map((item) => (
            <button key={item.id} onClick={() => mudarPagina(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: paginaAtiva === item.id ? '#2d3f52' : 'none', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: 14 }}>
              <span>{item.icon}</span>
              {menuAberto && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid #2d3f52' }}>
          {menuAberto && <div style={{ fontSize: 12, marginBottom: 8, color: '#8899aa' }}>{usuario?.nome}</div>}
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #8899aa', color: '#8899aa', padding: '6px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 12, width: menuAberto ? '100%' : 'auto' }}>
            {menuAberto ? 'Sair' : '🚪'}
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e0e0e0', fontWeight: 'bold' }}>
          {MENU.find((m) => m.id === paginaAtiva)?.label}
          {paginaAtiva === 'alunos' && alunoSelecionadoId && <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>/ Perfil</span>}
        </header>
        <main style={{ flex: 1, overflow: 'auto', padding: 24, background: '#f5f5f5' }}>
          {paginaAtiva === 'alunos' && alunoSelecionadoId
            ? <AlunoDetalhe alunoId={alunoSelecionadoId} onVoltar={voltarDaAluno} />
            : <PaginaAtual usuario={usuario} onVerAluno={navegarParaAluno} />
          }
        </main>
      </div>
    </div>
  );
}
