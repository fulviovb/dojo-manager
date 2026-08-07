import React, { useState } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alunos from './pages/Alunos';
import AlunoDetalhe from './pages/AlunoDetalhe';
import Turmas from './pages/Turmas';
import TurmaDetalhe from './pages/TurmaDetalhe';
import Chamadas from './pages/Chamadas';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';
import CheckinPublico from './pages/CheckinPublico';
import ReciboPage from './pages/ReciboPage';
import Relatorios from './pages/Relatorios';
import RelatorioPage from './pages/RelatorioPage';
import Exames from './pages/Exames';
import ExameDetalhe from './pages/ExameDetalhe';
import AvaliadorExame from './pages/AvaliadorExame';
import ExameFichaPage from './pages/ExameFichaPage';
import ExameRelatorioPage from './pages/ExameRelatorioPage';

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
  { id: 'exames', label: 'Exames', icon: '🎖️' },
  { id: 'relatorios', label: 'Relatórios', icon: '📄' },
  { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
];

const PAGINAS = { dashboard: Dashboard, alunos: Alunos, turmas: Turmas, chamadas: Chamadas, financeiro: Financeiro, exames: Exames, relatorios: Relatorios, configuracoes: Configuracoes };

export default function App() {
  const checkinMatch = window.location.pathname.match(/^\/checkin\/([^/]+)/);
  if (checkinMatch) return <CheckinPublico qrToken={checkinMatch[1]} />;
  const reciboMatch = window.location.pathname.match(/^\/recibo\/([^/]+)/);
  if (reciboMatch) return <ReciboPage mensalidadeId={reciboMatch[1]} />;
  const relatorioMatch = window.location.pathname.match(/^\/relatorio\/([^/]+)/);
  if (relatorioMatch) return <RelatorioPage tipo={relatorioMatch[1]} />;
  const avaliadorMatch = window.location.pathname.match(/^\/exame-avaliador\/([^/]+)/);
  if (avaliadorMatch) return <AvaliadorExame exameId={avaliadorMatch[1]} />;
  const fichaMatch = window.location.pathname.match(/^\/exame\/([^/]+)\/ficha\/([^/]+)/);
  if (fichaMatch) return <ExameFichaPage exameId={fichaMatch[1]} participanteId={fichaMatch[2]} />;
  const relatorioExameMatch = window.location.pathname.match(/^\/exame\/([^/]+)\/relatorio-impressao/);
  if (relatorioExameMatch) return <ExameRelatorioPage exameId={relatorioExameMatch[1]} />;
  return <AppInterna />;
}

function AppInterna() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [usuario, setUsuario] = useState(JSON.parse(localStorage.getItem('usuario') || 'null'));
  const [paginaAtiva, setPaginaAtiva] = useState('dashboard');
  const [menuAberto, setMenuAberto] = useState(true);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(null);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState(null);
  const [exameSelecionadoId, setExameSelecionadoId] = useState(null);

  const navegarParaAluno = (id) => setAlunoSelecionadoId(id);
  const voltarDaAluno = () => setAlunoSelecionadoId(null);
  const navegarParaTurma = (id) => setTurmaSelecionadaId(id);
  const voltarDaTurma = () => setTurmaSelecionadaId(null);
  const navegarParaExame = (id) => setExameSelecionadoId(id);
  const voltarDoExame = () => setExameSelecionadoId(null);

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
    setTurmaSelecionadaId(null);
    setExameSelecionadoId(null);
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
          {alunoSelecionadoId && <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>/ Perfil</span>}
          {!alunoSelecionadoId && paginaAtiva === 'turmas' && turmaSelecionadaId && <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>/ Turma</span>}
          {!alunoSelecionadoId && paginaAtiva === 'exames' && exameSelecionadoId && <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>/ Exame</span>}
        </header>
        <main style={{ flex: 1, overflow: 'auto', padding: 24, background: '#f5f5f5' }}>
          {/* O perfil do aluno pode ser aberto a partir de qualquer tela (nomes
              clicáveis em Turmas, Chamadas, Dashboard, Financeiro...), então
              tem prioridade sobre a página ativa e sobre a turma aberta. */}
          {alunoSelecionadoId
            ? <AlunoDetalhe alunoId={alunoSelecionadoId} onVoltar={voltarDaAluno} />
            : paginaAtiva === 'turmas' && turmaSelecionadaId
            ? <TurmaDetalhe turmaId={turmaSelecionadaId} onVoltar={voltarDaTurma} onVerAluno={navegarParaAluno} />
            : paginaAtiva === 'exames' && exameSelecionadoId
            ? <ExameDetalhe exameId={exameSelecionadoId} onVoltar={voltarDoExame} />
            : <PaginaAtual usuario={usuario} onVerAluno={navegarParaAluno} onVerTurma={navegarParaTurma} onVerExame={navegarParaExame} />
          }
        </main>
      </div>
    </div>
  );
}
