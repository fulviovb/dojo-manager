import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Avatar from '../components/Avatar';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const estiloInput = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnVerde = { background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnAzul = { background: '#1565c0', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnPerigo = { background: '#c62828', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const cardEstilo = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' };
const thEstilo = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 };

function diaSemanaDe(dataStr) {
  return (new Date(dataStr + 'T00:00:00').getDay());
}

function Modal({ titulo, onFechar, children, largura = 420 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: largura, maxWidth: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{titulo}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Lista geral de aulas ────────────────────────────────────────────────────

function ListaAulas({ aulas, turmas, busca, setBusca, onAbrir, onExcluir, onNovaAula, onSincronizar, sincronizando }) {
  const [pagina, setPagina] = useState(1);
  const POR_PAG = 10;

  const filtradas = aulas.filter(a =>
    (a.Turma?.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (a.data || '').includes(busca)
  );
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAG));
  const slice = filtradas.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <input placeholder="Pesquisar por turma ou data..." value={busca}
          onChange={e => { setBusca(e.target.value); setPagina(1); }}
          style={{ ...estiloInput, maxWidth: 300, flex: 1 }} />
        <button style={btnAzul} onClick={onSincronizar} disabled={sincronizando}>
          {sincronizando ? 'Sincronizando...' : 'Sincronizar Check-in Online'}
        </button>
        <button style={btnVerde} onClick={onNovaAula}>+ Registrar Aula &amp; Frequência</button>
      </div>

      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={thEstilo}>Data</th>
              <th style={thEstilo}>Dia</th>
              <th style={thEstilo}>Turma</th>
              <th style={thEstilo}>Frequência</th>
              <th style={thEstilo}></th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhuma aula encontrada.</td></tr>
            )}
            {slice.map(a => (
              <tr key={a.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{a.data.split('-').reverse().join('/')}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{DIAS[diaSemanaDe(a.data)]}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{a.Turma?.nome?.split('\n')[0] || '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>
                  <span style={{ color: '#2e7d32' }}>{a.presentes} presentes</span>{' · '}
                  <span style={{ color: '#c62828' }}>{a.ausentes} ausentes</span>
                  {a.status === 'aberta' && <span style={{ marginLeft: 8, background: '#fff3e0', color: '#ef6c00', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>ABERTA</span>}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onAbrir(a.id)} style={btnAzul} title="Ver / registrar frequência">Ver</button>
                    <button onClick={() => onExcluir(a)} style={btnPerigo} title="Excluir">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#888' }}>
          <span>{filtradas.length} aula{filtradas.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)} style={{ ...estiloInput, cursor: pagina <= 1 ? 'default' : 'pointer', opacity: pagina <= 1 ? 0.4 : 1 }}>‹</button>
            <span>{pagina} / {totalPaginas}</span>
            <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)} style={{ ...estiloInput, cursor: pagina >= totalPaginas ? 'default' : 'pointer', opacity: pagina >= totalPaginas ? 0.4 : 1 }}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detalhe de uma aula: presença/ausência, validação, fechamento ──────────

function NomeAluno({ id, nome, fotoUrl, onVerAluno }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Avatar fotoUrl={fotoUrl} nome={nome} tamanho={24} />
      <button onClick={() => onVerAluno?.(id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1565c0', fontSize: 14, textAlign: 'left' }}>
        {nome}
      </button>
    </span>
  );
}

function DetalheAula({ aulaId, onVoltar, onFechada, onVerAluno }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [alunosEscola, setAlunosEscola] = useState([]);
  const [buscaExtra, setBuscaExtra] = useState('');

  const carregar = () => {
    axios.get(`/chamadas?aula_id=${aulaId}`).then(r => setDados(r.data));
  };
  useEffect(carregar, [aulaId]);
  useEffect(() => { axios.get('/usuarios?role=aluno').then(r => setAlunosEscola(r.data)); }, []);

  const marcarPresenca = async (alunoId) => {
    await axios.post('/chamadas', { aula_id: aulaId, aluno_id: alunoId });
    carregar();
  };

  const adicionarExtra = async (alunoId) => {
    await marcarPresenca(alunoId);
    setBuscaExtra('');
  };

  const marcarTodosPresentes = async () => {
    await Promise.all(dados.ausentes.map(a => axios.post('/chamadas', { aula_id: aulaId, aluno_id: a.id })));
    carregar();
  };

  const validar = async (chamadaId) => {
    await axios.put(`/chamadas/${chamadaId}/validar`);
    carregar();
  };

  const validarTodos = async () => {
    await Promise.all(dados.chamadas
      .filter(c => c.origem === 'qrcode' && !c.validado_por)
      .map(c => axios.put(`/chamadas/${c.id}/validar`)));
    carregar();
  };

  const remover = async (chamadaId) => {
    await axios.delete(`/chamadas/${chamadaId}`);
    carregar();
  };

  const fecharAula = async () => {
    setErro('');
    try {
      await axios.post(`/chamadas/fechar/${aulaId}`);
      carregar();
      onFechada?.();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao fechar a aula'); }
  };

  if (!dados) return <p style={{ color: '#888' }}>Carregando...</p>;

  const { aula, chamadas, ausentes } = dados;
  const pendentesQR = chamadas.filter(c => c.origem === 'qrcode' && !c.validado_por);
  const validadas = chamadas.filter(c => !(c.origem === 'qrcode' && !c.validado_por));
  const aberta = aula.status === 'aberta';

  // Alunos de outras turmas (ex: mesma modalidade em outro horário) que vieram
  // treinar nesta aula mas não estão matriculados nela — não aparecem em
  // "Ausentes" porque esse card só lista matriculados. Busca por nome entre
  // todos os alunos da escola, exceto quem já está presente/ausente aqui.
  const idsJaNaAula = new Set([...chamadas.map(c => c.aluno_id), ...ausentes.map(a => a.id)]);
  const resultadosExtra = buscaExtra.trim()
    ? alunosEscola.filter(a => !idsJaNaAula.has(a.id) && a.nome.toLowerCase().includes(buscaExtra.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div>
      <button onClick={onVoltar} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 10 }}>
        ← Voltar para Aulas
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 20 }}>{aula.Turma?.nome?.split('\n')[0]}</h2>
          <div style={{ color: '#888', fontSize: 13 }}>
            {aula.data.split('-').reverse().join('/')} · {aula.hora_inicio?.slice(0, 5)}–{aula.hora_fim?.slice(0, 5)}
            {aula.Sala?.qr_token && (
              <>
                {' · '}QR Code: <code style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 3 }}>{window.location.origin}/checkin/{aula.Sala.qr_token}</code>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {aberta
            ? <span style={{ background: '#fff3e0', color: '#ef6c00', fontSize: 12, padding: '4px 10px', borderRadius: 10, fontWeight: 700 }}>ABERTA</span>
            : <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 12, padding: '4px 10px', borderRadius: 10, fontWeight: 700 }}>FECHADA</span>}
          {aberta && <button style={{ ...btnPrimario, background: '#c62828' }} onClick={fecharAula}>Fechar Aula</button>}
        </div>
      </div>
      {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}

      {pendentesQR.length > 0 && (
        <div style={{ ...cardEstilo, padding: 16, marginBottom: 16, border: '1px solid #ffe0b2', background: '#fffaf0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13, color: '#ef6c00' }}>⏳ Check-ins por QR Code aguardando sua validação</strong>
            <button onClick={validarTodos} style={btnVerde}>✓ Validar Todos</button>
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            {pendentesQR.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #ffe8c4' }}>
                <span style={{ fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}><NomeAluno id={c.aluno_id} nome={c.Aluno?.nome} fotoUrl={c.Aluno?.foto_url} onVerAluno={onVerAluno} /> <span style={{ fontSize: 11, color: '#ef6c00' }}>📱 QR — pendente</span></span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => validar(c.id)} style={btnVerde}>✓ Validar</button>
                  <button onClick={() => remover(c.id)} style={btnPerigo}>✕ Remover</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardEstilo}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
            <strong style={{ fontSize: 14, color: '#2e7d32' }}>✅ Presentes ({validadas.length})</strong>
          </div>
          <div style={{ padding: '4px 16px' }}>
            {validadas.length === 0 && <p style={{ color: '#aaa', fontSize: 13, padding: '12px 0' }}>Nenhuma presença confirmada ainda.</p>}
            {validadas.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 14 }}>
                  <NomeAluno id={c.aluno_id} nome={c.Aluno?.nome} fotoUrl={c.Aluno?.foto_url} onVerAluno={onVerAluno} />
                  <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>{c.origem === 'qrcode' ? '📱 QR' : '✍️ manual'}</span>
                </span>
                <button onClick={() => remover(c.id)} style={btnPerigo}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div style={cardEstilo}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 14, color: '#c62828' }}>❌ Ausentes ({ausentes.length})</strong>
            {ausentes.length > 0 && (
              <button onClick={marcarTodosPresentes} style={btnVerde}>Marcar todos presentes</button>
            )}
          </div>
          <div style={{ padding: '4px 16px' }}>
            {ausentes.length === 0 && <p style={{ color: '#aaa', fontSize: 13, padding: '12px 0' }}>Todos os matriculados já estão presentes.</p>}
            {ausentes.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <NomeAluno id={a.id} nome={a.nome} fotoUrl={a.foto_url} onVerAluno={onVerAluno} />
                <button onClick={() => marcarPresenca(a.id)} style={btnVerde}>+ Presença</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...cardEstilo, padding: 16, marginTop: 16 }}>
        <strong style={{ fontSize: 14 }}>🔍 Adicionar aluno de outra turma</strong>
        <div style={{ fontSize: 12, color: '#888', margin: '4px 0 10px' }}>
          Para alunos da mesma modalidade (ou de outra turma) que treinaram nesta aula sem estar matriculados nela.
        </div>
        <input placeholder="Buscar aluno pelo nome..." value={buscaExtra}
          onChange={e => setBuscaExtra(e.target.value)}
          style={{ ...estiloInput, width: '100%', maxWidth: 320 }} />
        {buscaExtra.trim() && (
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            {resultadosExtra.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>Nenhum aluno encontrado.</p>}
            {resultadosExtra.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Avatar fotoUrl={a.foto_url} nome={a.nome} tamanho={24} />
                  {a.nome}
                </span>
                <button onClick={() => adicionarExtra(a.id)} style={btnVerde}>+ Presença</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Treinos Extras ──────────────────────────────────────────────────────────

function ModalTreinoExtra({ treino, artes, turmas, alunosEscola, onFechar, onSalvo }) {
  const [arteMarcialId, setArteMarcialId] = useState(treino?.arte_marcial?.id || '');
  const [data, setData] = useState(treino?.data || new Date().toISOString().slice(0, 10));
  const [quantidade, setQuantidade] = useState(treino?.quantidade || 1);
  const [alunoIds, setAlunoIds] = useState(new Set((treino?.alunos || []).map(a => a.id)));
  const [busca, setBusca] = useState('');
  const [turmaFiltroId, setTurmaFiltroId] = useState('');
  const [idsDaTurma, setIdsDaTurma] = useState(null); // null = filtro de turma desligado
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Filtro de Turma é só uma lupa pra achar mais rápido — não some com o
  // aluno já selecionado, e não afeta o que é salvo (só a lista exibida).
  useEffect(() => {
    if (!turmaFiltroId) { setIdsDaTurma(null); return; }
    axios.get('/matriculas', { params: { turma_id: turmaFiltroId } })
      .then(r => setIdsDaTurma(new Set(r.data.map(m => m.aluno_id))));
  }, [turmaFiltroId]);

  const alunosFiltrados = alunosEscola.filter(a =>
    (!busca.trim() || a.nome.toLowerCase().includes(busca.toLowerCase())) &&
    (!idsDaTurma || idsDaTurma.has(a.id))
  );

  const alternarAluno = (id) => {
    setAlunoIds(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  };

  const salvar = async () => {
    setErro('');
    if (!treino && !arteMarcialId) return setErro('Selecione a modalidade');
    if (alunoIds.size === 0) return setErro('Selecione ao menos um aluno presente');
    setSalvando(true);
    try {
      const payload = { data, aluno_ids: [...alunoIds], quantidade };
      if (!treino) payload.arte_marcial_id = arteMarcialId;
      if (treino) await axios.put(`/treinos-extras/${treino.id}`, payload);
      else await axios.post('/treinos-extras', payload);
      onSalvo();
    } catch (ex) {
      setErro(ex.response?.data?.erro || 'Erro ao salvar treino extra');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={treino ? 'Editar Treino Extra' : 'Novo Treino Extra'} onFechar={onFechar} largura={540}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Modalidade</label>
          <select value={arteMarcialId} onChange={e => setArteMarcialId(e.target.value)} style={{ ...estiloInput, width: '100%' }} disabled={!!treino}>
            <option value="">Selecione...</option>
            {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ ...estiloInput, width: '100%' }} />
        </div>
        <div style={{ width: 110 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }} title="Quantos treinos seguidos você deu nessa data, com esses mesmos alunos (ex: 2 se fez 2 treinos no mesmo dia)">
            Nº de treinos
          </label>
          <input type="number" min={1} max={20} value={quantidade}
            onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value, 10) || 1))}
            style={{ ...estiloInput, width: '100%' }} />
        </div>
      </div>

      <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
        Alunos presentes ({alunoIds.size} selecionado{alunoIds.size !== 1 ? 's' : ''})
        {quantidade > 1 && ` · vale ${quantidade} aulas de carência cada`}
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <select value={turmaFiltroId} onChange={e => setTurmaFiltroId(e.target.value)} style={{ ...estiloInput, width: 180 }}>
          <option value="">Filtrar por turma...</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome.split('\n')[0]}</option>)}
        </select>
        <input placeholder="Buscar aluno pelo nome..." value={busca} onChange={e => setBusca(e.target.value)}
          style={{ ...estiloInput, flex: 1 }} />
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4 }}>
        {alunosFiltrados.length === 0 && <p style={{ color: '#aaa', fontSize: 13, padding: 12 }}>Nenhum aluno encontrado.</p>}
        {alunosFiltrados.map(a => (
          <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={alunoIds.has(a.id)} onChange={() => alternarAluno(a.id)} />
            <Avatar fotoUrl={a.foto_url} nome={a.nome} tamanho={22} />
            {a.nome}
          </label>
        ))}
      </div>

      {erro && <p style={{ color: 'red', fontSize: 13, marginTop: 10 }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onFechar} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer', background: '#fff' }}>Cancelar</button>
        <button onClick={salvar} disabled={salvando} style={btnPrimario}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </Modal>
  );
}

function ListaTreinosExtras({ onVerAluno }) {
  const [treinos, setTreinos] = useState([]);
  const [artes, setArtes] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [alunosEscola, setAlunosEscola] = useState([]);
  const [modalTreino, setModalTreino] = useState(null); // null = fechado, {} = novo, objeto = editar
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    setCarregando(true);
    axios.get('/treinos-extras').then(r => setTreinos(r.data)).finally(() => setCarregando(false));
  };
  useEffect(carregar, []);
  useEffect(() => { axios.get('/artes-marciais').then(r => setArtes(r.data)); }, []);
  useEffect(() => { axios.get('/turmas').then(r => setTurmas(r.data)); }, []);
  useEffect(() => { axios.get('/usuarios?role=aluno').then(r => setAlunosEscola(r.data)); }, []);

  const excluir = async (treino) => {
    if (!window.confirm(`Excluir o treino extra de ${treino.data.split('-').reverse().join('/')}? As presenças registradas serão removidas.`)) return;
    await axios.delete(`/treinos-extras/${treino.id}`);
    carregar();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#888', maxWidth: 480 }}>
          Registre um treino extra oferecido fora da grade normal (ex: treino de competidores).
          A presença conta na carência de aulas pra troca de faixa, na modalidade escolhida.
        </p>
        <button style={btnVerde} onClick={() => setModalTreino({})}>+ Novo Treino Extra</button>
      </div>

      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={thEstilo}>Data</th>
              <th style={thEstilo}>Modalidade</th>
              <th style={thEstilo}>Treinos</th>
              <th style={thEstilo}>Alunos presentes</th>
              <th style={thEstilo}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Carregando...</td></tr>
            )}
            {!carregando && treinos.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhum treino extra registrado.</td></tr>
            )}
            {treinos.map(t => (
              <tr key={t.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{t.data.split('-').reverse().join('/')}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{t.arte_marcial?.nome}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>
                  {t.quantidade > 1 ? <span title="Presença vale essa quantidade de aulas de carência" style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{t.quantidade}x</span> : '1x'}
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {t.alunos.map(a => (
                      <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <NomeAluno id={a.id} nome={a.nome} fotoUrl={a.foto_url} onVerAluno={onVerAluno} />
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setModalTreino(t)} style={btnAzul}>✎ Editar</button>
                    <button onClick={() => excluir(t)} style={btnPerigo}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalTreino && (
        <ModalTreinoExtra
          treino={modalTreino.id ? modalTreino : null}
          artes={artes}
          turmas={turmas}
          alunosEscola={alunosEscola}
          onFechar={() => setModalTreino(null)}
          onSalvo={() => { setModalTreino(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ─── Modal: registrar nova aula manualmente ──────────────────────────────────

function ModalNovaAula({ turmas, onFechar, onCriada }) {
  const [turmaId, setTurmaId] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const criar = async () => {
    if (!turmaId) return setErro('Selecione a turma');
    setSalvando(true);
    setErro('');
    try {
      const horarios = (await axios.get(`/horarios?turma_id=${turmaId}`)).data;
      const diaSemana = diaSemanaDe(data);
      const horario = horarios.find(h => h.dia_semana === diaSemana) || horarios[0];
      if (!horario) {
        setErro('Essa turma ainda não tem horário/sala configurados (tela Turmas → + Horário).');
        setSalvando(false);
        return;
      }
      const r = await axios.post('/aulas', {
        turma_id: turmaId,
        sala_id: horario.sala_id,
        data,
        hora_inicio: horario.hora_inicio,
        hora_fim: horario.hora_fim,
      });
      onCriada(r.data.id);
    } catch (ex) {
      setErro(ex.response?.data?.erro || 'Erro ao registrar aula');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal titulo="Registrar Aula & Frequência" onFechar={onFechar}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Turma</label>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} style={{ ...estiloInput, width: '100%' }}>
          <option value="">Selecione...</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome.split('\n')[0]}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Data</label>
        <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ ...estiloInput, width: '100%' }} />
      </div>
      {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onFechar} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer', background: '#fff' }}>Cancelar</button>
        <button onClick={criar} disabled={salvando} style={btnPrimario}>{salvando ? 'Registrando...' : 'Registrar e abrir chamada'}</button>
      </div>
    </Modal>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Chamadas({ onVerAluno }) {
  const [aba, setAba] = useState('aulas');
  const [aulas, setAulas] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [busca, setBusca] = useState('');
  const [aulaAbertaId, setAulaAbertaId] = useState(null);
  const [modalNova, setModalNova] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const carregarAulas = () => { axios.get('/aulas').then(r => setAulas(r.data)); };
  useEffect(carregarAulas, []);
  useEffect(() => { axios.get('/turmas').then(r => setTurmas(r.data)); }, []);

  const sincronizarOnline = async () => {
    setSincronizando(true);
    try {
      const { data } = await axios.post('/checkin-online/sincronizar');
      let msg = `Sincronização concluída: ${data.novos_checkins} novo(s) check-in(s).`;
      if (data.nao_reconciliados > 0) {
        msg += `\n\n⚠ ${data.nao_reconciliados} check-in(s) não encontraram aula correspondente (ex: horário da aula desatualizado) e continuam pendentes — corrija e sincronize de novo.`;
      }
      alert(msg);
      carregarAulas();
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao sincronizar check-in online');
    } finally {
      setSincronizando(false);
    }
  };

  const excluirAula = async (aula) => {
    await axios.delete(`/aulas/${aula.id}`);
    carregarAulas();
  };

  const abrirAula = (id) => setAulaAbertaId(id);
  const voltarLista = () => { setAulaAbertaId(null); carregarAulas(); };

  if (aulaAbertaId) {
    return <DetalheAula aulaId={aulaAbertaId} onVoltar={voltarLista} onFechada={carregarAulas} onVerAluno={onVerAluno} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', width: 'fit-content', marginBottom: 20 }}>
        {[['aulas', 'Aulas'], ['extras', 'Treinos Extras']].map(([valor, rotulo]) => (
          <button key={valor} onClick={() => setAba(valor)}
            style={{
              padding: '9px 22px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: aba === valor ? '#1e2a38' : '#fff', color: aba === valor ? '#fff' : '#555',
            }}>
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'aulas' && (
        <>
          <ListaAulas
            aulas={aulas}
            turmas={turmas}
            busca={busca}
            setBusca={setBusca}
            onAbrir={abrirAula}
            onExcluir={excluirAula}
            onNovaAula={() => setModalNova(true)}
            onSincronizar={sincronizarOnline}
            sincronizando={sincronizando}
          />

          {modalNova && (
            <ModalNovaAula
              turmas={turmas}
              onFechar={() => setModalNova(false)}
              onCriada={(novaAulaId) => { setModalNova(false); carregarAulas(); abrirAula(novaAulaId); }}
            />
          )}
        </>
      )}

      {aba === 'extras' && <ListaTreinosExtras onVerAluno={onVerAluno} />}
    </div>
  );
}
