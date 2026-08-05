import React, { useState, useEffect } from 'react';
import axios from 'axios';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnVerde = { background: '#2e7d32', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const cardEstilo = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' };
const cardHeader = { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 14, color: '#1e2a38' };
const cardBody = { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 };
const rotulo = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 };
const linhaRadio = { display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 };

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function abrirRelatorio(tipo, params) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))).toString();
  window.open(`${window.location.origin}/relatorio/${tipo}?${qs}`, '_blank');
}

function Card({ titulo, children }) {
  return (
    <div style={cardEstilo}>
      <div style={cardHeader}>{titulo}</div>
      <div style={cardBody}>{children}</div>
    </div>
  );
}

function RadioSimNao({ label, value, onChange }) {
  return (
    <div>
      <span style={rotulo}>{label}</span>
      <div style={linhaRadio}>
        <label><input type="radio" checked={value === true} onChange={() => onChange(true)} /> Sim</label>
        <label><input type="radio" checked={value === false} onChange={() => onChange(false)} /> Não</label>
      </div>
    </div>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────────

function CardAlunosPorGraduacao({ artes }) {
  const [arteId, setArteId] = useState('');
  const [exibirTurmas, setExibirTurmas] = useState(false);
  return (
    <Card titulo="Alunos por Graduação">
      <div>
        <span style={rotulo}>Programa Marcial</span>
        <select value={arteId} onChange={e => setArteId(e.target.value)} style={estiloInput}>
          <option value="">Todas</option>
          {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <RadioSimNao label="Exibir Turmas?" value={exibirTurmas} onChange={setExibirTurmas} />
      <button style={btnVerde} onClick={() => abrirRelatorio('alunos-por-graduacao', { arte_marcial_id: arteId, exibir_turmas: exibirTurmas })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardAlunosPorTurma({ turmas }) {
  const [turmaId, setTurmaId] = useState('');
  const [comPlano, setComPlano] = useState(false);
  return (
    <Card titulo="Alunos por Turma-Horário">
      <div>
        <span style={rotulo}>Turma de Treino</span>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} style={estiloInput}>
          <option value="">Selecione...</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome.split('\n')[0]}</option>)}
        </select>
      </div>
      <RadioSimNao label="Plano de Pagamento?" value={comPlano} onChange={setComPlano} />
      <button style={btnVerde} disabled={!turmaId} onClick={() => abrirRelatorio('alunos-por-turma', { turma_id: turmaId, plano_pagamento: comPlano })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardFichaCadastral({ alunos }) {
  const [alunoId, setAlunoId] = useState('');
  return (
    <Card titulo="Ficha Cadastral Resumida">
      <div>
        <span style={rotulo}>Pessoa</span>
        <select value={alunoId} onChange={e => setAlunoId(e.target.value)} style={estiloInput}>
          <option value="">Selecione...</option>
          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}{a.matricula ? ` (${a.matricula})` : ''}</option>)}
        </select>
      </div>
      <button style={btnVerde} disabled={!alunoId} onClick={() => abrirRelatorio('ficha-cadastral', { aluno_id: alunoId })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardFrequenciaTurma({ turmas }) {
  const [turmaId, setTurmaId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [modo, setModo] = useState('quantitativo');
  return (
    <Card titulo="Aulas & Frequências (Turma)">
      <div>
        <span style={rotulo}>Turma de Treino</span>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} style={estiloInput}>
          <option value="">Selecione...</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome.split('\n')[0]}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Início</span>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={estiloInput} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Fim</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={estiloInput} />
        </div>
      </div>
      <div>
        <span style={rotulo}>Formato</span>
        <div style={linhaRadio}>
          <label><input type="radio" checked={modo === 'relacao'} onChange={() => setModo('relacao')} /> Relação</label>
          <label><input type="radio" checked={modo === 'quantitativo'} onChange={() => setModo('quantitativo')} /> Quantitativo</label>
        </div>
      </div>
      <button style={btnVerde} disabled={!turmaId} onClick={() => abrirRelatorio('frequencia-turma', { turma_id: turmaId, inicio, fim, modo })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardFrequenciaAluno({ alunos }) {
  const [alunoId, setAlunoId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  return (
    <Card titulo="Aulas & Frequências (Alunos)">
      <div>
        <span style={rotulo}>Pessoa</span>
        <select value={alunoId} onChange={e => setAlunoId(e.target.value)} style={estiloInput}>
          <option value="">Selecione...</option>
          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Início</span>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={estiloInput} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Fim</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={estiloInput} />
        </div>
      </div>
      <button style={btnVerde} disabled={!alunoId} onClick={() => abrirRelatorio('frequencia-aluno', { aluno_id: alunoId, inicio, fim })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardAniversariantes() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  return (
    <Card titulo="Aniversariantes por mês">
      <div>
        <span style={rotulo}>Mês</span>
        <select value={mes} onChange={e => setMes(e.target.value)} style={estiloInput}>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>
      <button style={btnVerde} onClick={() => abrirRelatorio('aniversariantes', { mes })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardPresencaMinima({ artes }) {
  const [arteId, setArteId] = useState('');
  return (
    <Card titulo="Frequência: Presença Mínima">
      <div>
        <span style={rotulo}>Programa Marcial</span>
        <select value={arteId} onChange={e => setArteId(e.target.value)} style={estiloInput}>
          <option value="">Todas</option>
          {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Alunos que atingiram a frequência mínima da graduação.</p>
      <button style={btnVerde} onClick={() => abrirRelatorio('presenca-minima', { arte_marcial_id: arteId })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardFrequenciaPercentual({ artes }) {
  const [arteId, setArteId] = useState('');
  return (
    <Card titulo="Frequência: % de Presença">
      <div>
        <span style={rotulo}>Programa Marcial</span>
        <select value={arteId} onChange={e => setArteId(e.target.value)} style={estiloInput}>
          <option value="">Todas</option>
          {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Todos os alunos ativos e o % de presença atual de cada um.</p>
      <button style={btnVerde} onClick={() => abrirRelatorio('frequencia-percentual', { arte_marcial_id: arteId })}>+ Gerar Relatório</button>
    </Card>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Relatorios() {
  const [artes, setArtes] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    axios.get('/artes-marciais').then(r => setArtes(r.data));
    axios.get('/turmas').then(r => setTurmas(r.data));
    axios.get('/usuarios?role=aluno').then(r => setAlunos(r.data));
  }, []);

  const relatorios = [
    { titulo: 'Alunos por Graduação', node: <CardAlunosPorGraduacao artes={artes} /> },
    { titulo: 'Alunos por Turma-Horário', node: <CardAlunosPorTurma turmas={turmas} /> },
    { titulo: 'Ficha Cadastral Resumida', node: <CardFichaCadastral alunos={alunos} /> },
    { titulo: 'Aulas & Frequências (Turma)', node: <CardFrequenciaTurma turmas={turmas} /> },
    { titulo: 'Aulas & Frequências (Alunos)', node: <CardFrequenciaAluno alunos={alunos} /> },
    { titulo: 'Aniversariantes por mês', node: <CardAniversariantes /> },
    { titulo: 'Frequência: Presença Mínima', node: <CardPresencaMinima artes={artes} /> },
    { titulo: 'Frequência: % de Presença', node: <CardFrequenciaPercentual artes={artes} /> },
  ];
  const filtrados = relatorios.filter(r => r.titulo.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <input placeholder="Buscar relatório..." value={busca} onChange={e => setBusca(e.target.value)}
        style={{ ...estiloInput, maxWidth: 320, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtrados.length === 0 && <p style={{ color: '#888' }}>Nenhum relatório encontrado.</p>}
        {filtrados.map((r, i) => <React.Fragment key={i}>{r.node}</React.Fragment>)}
      </div>
    </div>
  );
}
