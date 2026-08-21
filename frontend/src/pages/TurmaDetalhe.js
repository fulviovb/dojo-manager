import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Avatar from '../components/Avatar';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const COR_FAIXA = {
  branca: '#f5f5f5', cinza: '#9e9e9e', azul: '#1565c0', amarela: '#fbc02d',
  vermelha: '#c62828', laranja: '#ef6c00', verde: '#2e7d32', roxa: '#6a1b9a',
  marrom: '#5d4037', preta: '#212121',
};

function corDaFaixa(faixa) {
  if (!faixa) return '#ccc';
  if (faixa.cor && faixa.cor.toLowerCase() !== '#808080') return faixa.cor;
  const chave = Object.keys(COR_FAIXA).find(k => faixa.nome?.toLowerCase().includes(k));
  return chave ? COR_FAIXA[chave] : '#808080';
}

function calcularIdade(dataNascimentoIso) {
  if (!dataNascimentoIso) return null;
  const hoje = new Date();
  const nascimento = new Date(dataNascimentoIso + 'T00:00:00');
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario = hoje.getMonth() < nascimento.getMonth()
    || (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

function Badge({ faixa }) {
  if (!faixa) return <span style={{ color: '#aaa', fontSize: 12 }}>—</span>;
  const cor = corDaFaixa(faixa);
  const textoEscuro = ['branca', 'amarela'].some(k => faixa.nome?.toLowerCase().includes(k));
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12,
      background: cor, color: textoEscuro ? '#333' : '#fff',
      border: textoEscuro ? '1px solid #ddd' : 'none',
    }}>
      {faixa.nome}
    </span>
  );
}

const cardEstilo = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' };
const cabecalhoCard = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #eee' };
const thEstilo = { padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 };

export default function TurmaDetalhe({ turmaId, onVoltar, onVerAluno }) {
  const [turma, setTurma] = useState(null);
  const [matriculas, setMatriculas] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [alunosAtivos, setAlunosAtivos] = useState([]);
  const [faixasArte, setFaixasArte] = useState([]);
  const [buscaAluno, setBuscaAluno] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [alunoEscolhido, setAlunoEscolhido] = useState('');
  const [faixaEscolhida, setFaixaEscolhida] = useState('');
  const [graduacoesEscola, setGraduacoesEscola] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [editandoProfessor, setEditandoProfessor] = useState(false);
  const [professorEscolhido, setProfessorEscolhido] = useState('');
  const [erro, setErro] = useState('');
  const [salas, setSalas] = useState([]);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEditado, setNomeEditado] = useState('');
  const [erroNome, setErroNome] = useState('');
  const [modalHorario, setModalHorario] = useState(false);
  const [horarioEditando, setHorarioEditando] = useState(null); // null = novo horário
  const [formHorario, setFormHorario] = useState({ dia_semana: 1, hora_inicio: '18:00', hora_fim: '19:30', sala_id: '' });
  const [erroHorario, setErroHorario] = useState('');

  const carregar = () => {
    axios.get(`/turmas/${turmaId}`).then(r => setTurma(r.data));
    axios.get(`/matriculas?turma_id=${turmaId}`).then(r => setMatriculas(r.data));
    axios.get(`/aulas?turma_id=${turmaId}`).then(r => setAulas(r.data));
  };
  useEffect(carregar, [turmaId]);
  useEffect(() => { axios.get('/usuarios?role=aluno').then(r => setAlunosAtivos(r.data)); }, []);
  useEffect(() => { axios.get('/usuarios?role=professor').then(r => setProfessores(r.data)); }, []);
  useEffect(() => { axios.get('/graduacoes').then(r => setGraduacoesEscola(r.data)); }, []);
  useEffect(() => { axios.get('/salas').then(r => setSalas(r.data)); }, []);
  useEffect(() => {
    if (turma?.arte_marcial_id) axios.get(`/faixas?arte_marcial_id=${turma.arte_marcial_id}`).then(r => setFaixasArte(r.data));
  }, [turma?.arte_marcial_id]);

  const idsMatriculados = useMemo(() => new Set(matriculas.map(m => m.aluno_id)), [matriculas]);
  const disponiveis = alunosAtivos.filter(a => !idsMatriculados.has(a.id));
  const disponiveisFiltrados = disponiveis.filter(a => a.nome.toLowerCase().includes(buscaAluno.toLowerCase()));

  // Graduações já carregadas por inteiro (mesma abordagem da coluna "Artes
  // Marciais" em Alunos.js) — a seleção do aluno preenche a faixa na hora,
  // sem depender de uma requisição assíncrona que poderia perder a corrida
  // contra um clique rápido em "Matricular".
  const faixaAtualDoAluno = (alunoId) => {
    if (!turma?.arte_marcial_id) return '';
    const daArte = graduacoesEscola.filter(g => g.aluno_id === alunoId && g.arte_marcial_id === turma.arte_marcial_id);
    const atual = daArte.find(g => g.atual) || daArte[daArte.length - 1] || null;
    return atual ? atual.faixa_id : '';
  };

  const escolherAluno = (id) => {
    setAlunoEscolhido(id);
    setFaixaEscolhida(faixaAtualDoAluno(id));
  };

  const abrirModalNovo = () => {
    setAlunoEscolhido('');
    setFaixaEscolhida('');
    setBuscaAluno('');
    setErro('');
    setModalNovo(true);
  };

  const matricular = async () => {
    if (!alunoEscolhido) return setErro('Selecione um aluno');
    try {
      await axios.post('/matriculas', {
        aluno_id: alunoEscolhido,
        turma_id: turmaId,
        graduacao_atual_faixa_id: faixaEscolhida || null,
      });
      setModalNovo(false);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao matricular'); }
  };

  const desmatricular = async (matriculaId) => {
    await axios.delete(`/matriculas/${matriculaId}`);
    carregar();
  };

  const abrirEdicaoProfessor = () => {
    const atualEhOpcaoValida = professores.some(p => p.id === turma.professor_id);
    setProfessorEscolhido(atualEhOpcaoValida ? turma.professor_id : '');
    setEditandoProfessor(true);
  };

  const salvarProfessor = async () => {
    if (!professorEscolhido) return;
    await axios.put(`/turmas/${turmaId}`, { professor_id: professorEscolhido });
    setEditandoProfessor(false);
    carregar();
  };

  if (!turma) return <p style={{ color: '#888' }}>Carregando...</p>;

  const [tituloTurma, ...restoNome] = turma.nome.split('\n');
  const subtituloTurma = restoNome.join(' ').trim();

  const abrirEdicaoNome = () => {
    setNomeEditado(tituloTurma);
    setErroNome('');
    setEditandoNome(true);
  };

  const salvarNome = async () => {
    const novoTitulo = nomeEditado.trim();
    if (!novoTitulo) return setErroNome('Nome não pode ficar em branco');
    setErroNome('');
    try {
      const novoNomeCompleto = subtituloTurma ? `${novoTitulo}\n${subtituloTurma}` : novoTitulo;
      await axios.put(`/turmas/${turmaId}`, { nome: novoNomeCompleto });
      setEditandoNome(false);
      carregar();
    } catch (ex) { setErroNome(ex.response?.data?.erro || 'Erro ao salvar nome'); }
  };

  const abrirModalNovoHorario = () => {
    setHorarioEditando(null);
    setFormHorario({ dia_semana: 1, hora_inicio: '18:00', hora_fim: '19:30', sala_id: salas[0]?.id || '' });
    setErroHorario('');
    setModalHorario(true);
  };

  const abrirModalEdicaoHorario = (h) => {
    setHorarioEditando(h);
    setFormHorario({ dia_semana: h.dia_semana, hora_inicio: h.hora_inicio.slice(0, 5), hora_fim: h.hora_fim.slice(0, 5), sala_id: h.sala_id });
    setErroHorario('');
    setModalHorario(true);
  };

  const salvarHorario = async (e) => {
    e.preventDefault();
    setErroHorario('');
    const dados = { ...formHorario, hora_inicio: formHorario.hora_inicio + ':00', hora_fim: formHorario.hora_fim + ':00' };
    try {
      if (horarioEditando) {
        await axios.put(`/horarios/${horarioEditando.id}`, dados);
      } else {
        await axios.post('/horarios', { ...dados, turma_id: turmaId });
      }
      setModalHorario(false);
      carregar();
    } catch (ex) { setErroHorario(ex.response?.data?.erro || 'Erro ao salvar horário'); }
  };

  const removerHorario = async (h) => {
    await axios.delete(`/horarios/${h.id}`);
    carregar();
  };
  const primeiroHorario = turma.HorarioTurmas?.[0];

  return (
    <div>
      <button onClick={onVoltar} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 10 }}>
        ← Voltar para Turmas
      </button>
      {editandoNome ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <input value={nomeEditado} onChange={e => setNomeEditado(e.target.value)} autoFocus
            style={{ fontSize: 20, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, flex: 1, maxWidth: 480 }} />
          <button onClick={salvarNome} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Salvar</button>
          <button onClick={() => setEditandoNome(false)} style={{ background: 'none', border: '1px solid #ddd', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{tituloTurma}</h2>
          <button onClick={abrirEdicaoNome} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 12, padding: 0 }}>Editar</button>
        </div>
      )}
      {erroNome && <p style={{ color: 'red', fontSize: 13, margin: '2px 0' }}>{erroNome}</p>}
      {subtituloTurma && <div style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>{subtituloTurma}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Alunos matriculados */}
        <div style={cardEstilo}>
          <div style={cabecalhoCard}>
            <strong style={{ fontSize: 14 }}>Alunos Matriculados na Turma</strong>
            <button onClick={abrirModalNovo} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              + Novo
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={thEstilo}></th>
                <th style={thEstilo}>Aluno</th>
                <th style={thEstilo}>Idade</th>
                <th style={thEstilo}>Graduação</th>
                <th style={thEstilo}></th>
              </tr>
            </thead>
            <tbody>
              {matriculas.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>Nenhum aluno matriculado.</td></tr>
              )}
              {matriculas.map(m => (
                <tr key={m.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 0 8px 16px' }}>
                    <Avatar fotoUrl={m.Aluno?.foto_url} nome={m.Aluno?.nome} tamanho={28} />
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                    <button onClick={() => onVerAluno?.(m.aluno_id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1565c0', fontSize: 13, textAlign: 'left' }}>
                      {m.Aluno?.nome}
                    </button>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>
                    {calcularIdade(m.Aluno?.data_nascimento) ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}><Badge faixa={m.FaixaAtual} /></td>
                  <td style={{ padding: '10px 16px' }}>
                    <button onClick={() => desmatricular(m.id)}
                      style={{ background: '#c62828', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      Desmatricular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Coluna direita */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...cardEstilo, padding: 16 }}>
            <strong style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>Informações Gerais</strong>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {editandoProfessor ? (
                  <>
                    <span>Professor:</span>
                    <select value={professorEscolhido} onChange={e => setProfessorEscolhido(e.target.value)}
                      style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}>
                      <option value="" disabled hidden>Selecione...</option>
                      {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    <button onClick={salvarProfessor} disabled={!professorEscolhido} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: professorEscolhido ? 'pointer' : 'not-allowed', fontSize: 12, opacity: professorEscolhido ? 1 : 0.6 }}>Salvar</button>
                    <button onClick={() => setEditandoProfessor(false)} style={{ background: 'none', border: '1px solid #ddd', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <span>Professor: {turma.Professor?.nome || '—'}</span>
                    <button onClick={abrirEdicaoProfessor} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 12, padding: 0 }}>Editar</button>
                  </>
                )}
              </div>
              {primeiroHorario?.Sala && <div>Local: {primeiroHorario.Sala.nome}</div>}
              <div>Arte marcial: {turma.ArteMarcial?.nome || '—'}</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
              {matriculas.length} aluno{matriculas.length !== 1 ? 's' : ''} matriculado{matriculas.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={cardEstilo}>
            <div style={cabecalhoCard}>
              <strong style={{ fontSize: 14 }}>Horários de Treino</strong>
              <button onClick={abrirModalNovoHorario} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                + Novo
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(!turma.HorarioTurmas || turma.HorarioTurmas.length === 0) && (
                  <tr><td style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>Nenhum horário cadastrado.</td></tr>
                )}
                {turma.HorarioTurmas?.map(h => (
                  <tr key={h.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>
                      {DIAS[h.dia_semana]} {h.hora_inicio.slice(0, 5)}–{h.hora_fim.slice(0, 5)}
                      <div style={{ color: '#888', fontSize: 12 }}>{h.Sala?.nome?.split('\n')[0]}</div>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => abrirModalEdicaoHorario(h)}
                        style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 12, padding: '0 8px' }}>
                        Editar
                      </button>
                      <button onClick={() => removerHorario(h)}
                        style={{ background: '#c62828', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={cardEstilo}>
            <div style={cabecalhoCard}>
              <strong style={{ fontSize: 14 }}>Aulas</strong>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={thEstilo}>Data</th>
                  <th style={thEstilo}>Frequência</th>
                </tr>
              </thead>
              <tbody>
                {aulas.length === 0 && (
                  <tr><td colSpan={2} style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>Nenhuma aula registrada ainda.</td></tr>
                )}
                {aulas.map(a => (
                  <tr key={a.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>{a.data.split('-').reverse().join('/')}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>
                      <span style={{ color: '#2e7d32' }}>{a.presentes} presentes</span>{' · '}
                      <span style={{ color: '#c62828' }}>{a.ausentes} ausentes</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: matricular aluno */}
      {modalNovo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 420, maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Matricular aluno</h3>
              <button onClick={() => setModalNovo(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <input placeholder="Buscar aluno..." value={buscaAluno} onChange={e => setBuscaAluno(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, marginBottom: 10, boxSizing: 'border-box' }} />
            <select size={6} value={alunoEscolhido} onChange={e => escolherAluno(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}>
              {/* opção vazia correspondente ao estado inicial — sem ela, o navegador
                  seleciona sozinho a 1ª opção da lista filtrada sem disparar onChange */}
              <option value="" disabled hidden>Selecione um aluno...</option>
              {disponiveisFiltrados.length === 0 && <option disabled>Nenhum aluno disponível</option>}
              {disponiveisFiltrados.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Graduação atual {alunoEscolhido && <span style={{ color: '#888', fontWeight: 400 }}>(preenchida pelo histórico do aluno — pode trocar)</span>}
            </label>
            <select value={faixaEscolhida} onChange={e => setFaixaEscolhida(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, marginBottom: 16, boxSizing: 'border-box' }}>
              <option value="">—</option>
              {faixasArte.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalNovo(false)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer', background: '#fff' }}>Cancelar</button>
              <button onClick={matricular} style={{ background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>Matricular</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: novo/editar horário */}
      {modalHorario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 420, maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{horarioEditando ? 'Editar horário' : 'Novo horário'}</h3>
              <button onClick={() => setModalHorario(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={salvarHorario}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Dia da Semana</label>
                <select value={formHorario.dia_semana} onChange={e => setFormHorario(p => ({ ...p, dia_semana: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }}>
                  {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Início</label>
                  <input type="time" required value={formHorario.hora_inicio} onChange={e => setFormHorario(p => ({ ...p, hora_inicio: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Fim</label>
                  <input type="time" required value={formHorario.hora_fim} onChange={e => setFormHorario(p => ({ ...p, hora_fim: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Sala</label>
                <select required value={formHorario.sala_id} onChange={e => setFormHorario(p => ({ ...p, sala_id: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }}>
                  <option value="">Selecione...</option>
                  {salas.map(s => <option key={s.id} value={s.id}>{s.nome.split('\n')[0]}</option>)}
                </select>
              </div>
              {erroHorario && <p style={{ color: 'red', fontSize: 13 }}>{erroHorario}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" onClick={() => setModalHorario(false)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer', background: '#fff' }}>Cancelar</button>
                <button type="submit" style={{ background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
