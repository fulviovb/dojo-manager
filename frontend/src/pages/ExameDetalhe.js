import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { corDaFaixa } from '../utils/faixaCores';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const estiloBtnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnLink = (cor) => ({ background: 'none', border: 'none', color: cor, cursor: 'pointer', fontSize: 12, padding: 0, marginRight: 10 });
const cardEstilo = { background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 };
const thEstilo = { padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#888', textTransform: 'uppercase' };

const STATUS_LABEL = { planejamento: 'Planejamento', em_andamento: 'Em andamento', finalizado: 'Finalizado' };
const STATUS_AVALIACAO_LABEL = { pendente: 'Pendente', em_andamento: 'Em andamento', finalizada: 'Finalizada' };
const STATUS_AVALIACAO_COR = { pendente: '#888', em_andamento: '#1565c0', finalizada: '#2e7d32' };

function FaixaBadge({ faixa }) {
  if (!faixa) return <span style={{ color: '#aaa', fontSize: 12 }}>—</span>;
  const cor = corDaFaixa(faixa.nome, faixa.cor);
  const textoEscuro = ['branca', 'amarela'].some((k) => faixa.nome?.toLowerCase().includes(k));
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, background: cor, color: textoEscuro ? '#333' : '#fff', border: textoEscuro ? '1px solid #ddd' : 'none' }}>
      {faixa.nome}
    </span>
  );
}

export default function ExameDetalhe({ exameId, onVoltar }) {
  const [exame, setExame] = useState(null);
  const [relatorio, setRelatorio] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [faixasArte, setFaixasArte] = useState([]);
  const [formParticipante, setFormParticipante] = useState({ aluno_id: '', faixa_atual_id: '', faixa_pretendida_id: '' });
  const [formAvaliadorNome, setFormAvaliadorNome] = useState('');
  const [faseSorteioId, setFaseSorteioId] = useState('');
  const [participantesSelecionados, setParticipantesSelecionados] = useState([]);
  const [resultadoSorteio, setResultadoSorteio] = useState(null);
  const [confirmadas, setConfirmadas] = useState([]);
  const [erro, setErro] = useState('');

  const carregar = () => {
    axios.get(`/exames/${exameId}`).then((r) => setExame(r.data));
    axios.get(`/exames/${exameId}/relatorio`).then((r) => setRelatorio(r.data));
  };
  useEffect(carregar, [exameId]);
  useEffect(() => { axios.get('/usuarios?role=aluno').then((r) => setAlunos(r.data)); }, []);
  useEffect(() => {
    if (exame?.arte_marcial_id) axios.get(`/faixas?arte_marcial_id=${exame.arte_marcial_id}`).then((r) => setFaixasArte(r.data));
  }, [exame?.arte_marcial_id]);

  if (!exame) return <p style={{ color: '#888' }}>Carregando...</p>;

  const mudarStatus = async (status) => {
    setErro('');
    try { await axios.patch(`/exames/${exameId}/status`, { status }); carregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao mudar status'); }
  };

  const addParticipante = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await axios.post(`/exames/${exameId}/participantes`, formParticipante);
      setFormParticipante({ aluno_id: '', faixa_atual_id: '', faixa_pretendida_id: '' });
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  const removerParticipante = async (p) => {
    if (!window.confirm(`Remover ${p.Aluno?.nome} do exame?`)) return;
    await axios.delete(`/exames/${exameId}/participantes/${p.id}`);
    carregar();
  };

  const addAvaliador = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await axios.post(`/exames/${exameId}/avaliadores`, { nome: formAvaliadorNome });
      setFormAvaliadorNome('');
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  const revogarAvaliador = async (av) => {
    if (!window.confirm(`Revogar o acesso de ${av.nome}?`)) return;
    await axios.delete(`/exames/${exameId}/avaliadores/${av.id}`);
    carregar();
  };

  const toggleParticipanteSorteio = (id) => {
    setParticipantesSelecionados((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const sortear = async () => {
    setErro(''); setResultadoSorteio(null);
    if (!faseSorteioId || participantesSelecionados.length === 0) { setErro('Selecione a fase e ao menos um aluno.'); return; }
    try {
      const { data } = await axios.post(`/exames/${exameId}/sorteio`, { fase_exame_id: faseSorteioId, participante_ids: participantesSelecionados });
      setResultadoSorteio(data);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao sortear'); }
  };

  const reabrirAvaliacao = async (avaliacaoId) => {
    if (!window.confirm('Reabrir esta avaliação pra correção?')) return;
    await axios.patch(`/exames/${exameId}/avaliacoes/${avaliacaoId}/reabrir`);
    carregar();
  };

  const confirmarGraduacao = async (linha) => {
    setErro('');
    try {
      await axios.post('/graduacoes', {
        aluno_id: linha.aluno.id,
        arte_marcial_id: exame.arte_marcial_id,
        faixa_id: linha.faixa_pretendida.id,
        data_inicio: exame.data,
        atual: true,
        observacao: `Confirmado via Exame de Faixa: ${exame.nome}`,
        exame_participante_id: linha.participante_id,
        nota_exame: linha.nota_final,
      });
      setConfirmadas((c) => [...c, linha.participante_id]);
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao confirmar graduação'); }
  };

  const avaliacaoDe = (faseId, participanteId) => (exame.avaliacoes || [])
    .find((a) => a.fase_exame_id === faseId && a.exame_participante_id === participanteId);

  return (
    <div>
      <button onClick={onVoltar} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 10 }}>
        ← Voltar para Exames
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>{exame.nome}</h2>
          <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
            {exame.ArteMarcial?.nome} · {new Date(exame.data + 'T00:00:00').toLocaleDateString('pt-BR')} · {STATUS_LABEL[exame.status]}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {exame.status === 'planejamento' && <button style={estiloBtnPrimario} onClick={() => mudarStatus('em_andamento')}>Iniciar exame</button>}
          {exame.status === 'em_andamento' && <button style={{ ...estiloBtnPrimario, background: '#2e7d32' }} onClick={() => mudarStatus('finalizado')}>Finalizar exame</button>}
          {exame.status === 'finalizado' && <button style={{ ...estiloBtnPrimario, background: '#888' }} onClick={() => mudarStatus('em_andamento')}>Reabrir exame</button>}
        </div>
      </div>

      {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}

      <div style={cardEstilo}>
        <h3 style={{ marginTop: 0 }}>Participantes</h3>
        <form onSubmit={addParticipante} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Aluno</label>
            <select required value={formParticipante.aluno_id} onChange={(e) => setFormParticipante((f) => ({ ...f, aluno_id: e.target.value }))} style={{ ...estiloInput, width: 200 }}>
              <option value="">Selecione...</option>
              {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Faixa atual</label>
            <select value={formParticipante.faixa_atual_id} onChange={(e) => setFormParticipante((f) => ({ ...f, faixa_atual_id: e.target.value }))} style={{ ...estiloInput, width: 140 }}>
              <option value="">—</option>
              {faixasArte.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Faixa pretendida</label>
            <select required value={formParticipante.faixa_pretendida_id} onChange={(e) => setFormParticipante((f) => ({ ...f, faixa_pretendida_id: e.target.value }))} style={{ ...estiloInput, width: 140 }}>
              <option value="">Selecione...</option>
              {faixasArte.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <button type="submit" style={estiloBtnPrimario}>Adicionar</button>
        </form>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9f9f9' }}>
            <th style={thEstilo}>Aluno</th><th style={thEstilo}>Faixa atual</th><th style={thEstilo}>Faixa pretendida</th><th style={thEstilo}></th>
          </tr></thead>
          <tbody>
            {(exame.participantes || []).length === 0 && <tr><td colSpan={4} style={{ padding: 12, color: '#888', fontSize: 13 }}>Nenhum participante ainda.</td></tr>}
            {(exame.participantes || []).map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px', fontSize: 14 }}>{p.Aluno?.nome}</td>
                <td style={{ padding: '8px 12px' }}><FaixaBadge faixa={p.FaixaAtual} /></td>
                <td style={{ padding: '8px 12px' }}><FaixaBadge faixa={p.FaixaPretendida} /></td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  <button onClick={() => window.open(`/exame/${exameId}/ficha/${p.id}`, '_blank')} style={btnLink('#1565c0')}>Ficha</button>
                  <button onClick={() => removerParticipante(p)} style={btnLink('#c62828')}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={cardEstilo}>
        <h3 style={{ marginTop: 0 }}>Avaliadores</h3>
        <p style={{ fontSize: 12, color: '#888', marginTop: -8 }}>
          Repasse o PIN pro avaliador acessar <code>/exame-avaliador/{exameId}</code> no celular dele.
        </p>
        <form onSubmit={addAvaliador} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input required placeholder="Nome do avaliador" value={formAvaliadorNome} onChange={(e) => setFormAvaliadorNome(e.target.value)} style={{ ...estiloInput, maxWidth: 240 }} />
          <button type="submit" style={estiloBtnPrimario}>Adicionar</button>
        </form>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(exame.avaliadores || []).map((av) => (
            <span key={av.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #ddd', borderRadius: 20, padding: '6px 12px', fontSize: 13, opacity: av.ativo ? 1 : 0.4 }}>
              {av.nome} · PIN <code style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>{av.pin}</code>
              {av.ativo && <button onClick={() => revogarAvaliador(av)} style={{ ...btnLink('#c62828'), marginRight: 0 }}>revogar</button>}
            </span>
          ))}
        </div>
      </div>

      <div style={cardEstilo}>
        <h3 style={{ marginTop: 0 }}>Sorteio de avaliadores</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Fase (prova) sendo realizada agora</label>
          <select value={faseSorteioId} onChange={(e) => setFaseSorteioId(e.target.value)} style={{ ...estiloInput, width: 220 }}>
            <option value="">Selecione...</option>
            {(exame.fases || []).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Alunos sendo avaliados neste momento</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(exame.participantes || []).map((p) => (
              <label key={p.id} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={participantesSelecionados.includes(p.id)} onChange={() => toggleParticipanteSorteio(p.id)} />
                {p.Aluno?.nome}
              </label>
            ))}
          </div>
        </div>
        <button style={estiloBtnPrimario} onClick={sortear}>Sortear avaliadores</button>

        {resultadoSorteio && (
          <ul style={{ marginTop: 12, fontSize: 13 }}>
            {resultadoSorteio.map((r) => {
              const p = (exame.participantes || []).find((x) => x.id === r.participante_id);
              return (
                <li key={r.participante_id} style={{ color: r.erro ? '#c62828' : '#2e7d32' }}>
                  {p?.Aluno?.nome}: {r.erro || `sorteado(a) ${r.avaliador?.nome}`}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div style={cardEstilo}>
        <h3 style={{ marginTop: 0 }}>Progresso</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9f9f9' }}>
              <th style={thEstilo}>Aluno</th>
              {(exame.fases || []).map((f) => <th key={f.id} style={thEstilo}>{f.nome}</th>)}
            </tr></thead>
            <tbody>
              {(exame.participantes || []).map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', fontSize: 14 }}>{p.Aluno?.nome}</td>
                  {(exame.fases || []).map((f) => {
                    const av = avaliacaoDe(f.id, p.id);
                    if (!av) return <td key={f.id} style={{ padding: '8px 12px', fontSize: 12, color: '#aaa' }}>não sorteado</td>;
                    return (
                      <td key={f.id} style={{ padding: '8px 12px', fontSize: 12 }}>
                        <div style={{ color: STATUS_AVALIACAO_COR[av.status] }}>{STATUS_AVALIACAO_LABEL[av.status]}</div>
                        <div style={{ color: '#888' }}>{av.Avaliador?.nome}{av.nota != null ? ` · ${av.nota}` : ''}</div>
                        {av.status === 'finalizada' && <button onClick={() => reabrirAvaliacao(av.id)} style={{ ...btnLink('#1565c0'), marginRight: 0 }}>reabrir</button>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardEstilo}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Relatório final</h3>
          <button onClick={() => window.open(`/exame/${exameId}/relatorio-impressao`, '_blank')} style={{ ...estiloBtnPrimario, fontSize: 12, padding: '6px 12px' }}>Imprimir</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
          <thead><tr style={{ background: '#f9f9f9' }}>
            <th style={thEstilo}>Aluno</th><th style={thEstilo}>Faixa atual → pretendida</th><th style={thEstilo}>Fases</th><th style={thEstilo}>Nota final</th><th style={thEstilo}></th>
          </tr></thead>
          <tbody>
            {(relatorio?.participantes || []).map((linha) => (
              <tr key={linha.participante_id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px', fontSize: 14 }}>{linha.aluno?.nome}</td>
                <td style={{ padding: '8px 12px' }}><FaixaBadge faixa={linha.faixa_atual} /> → <FaixaBadge faixa={linha.faixa_pretendida} /></td>
                <td style={{ padding: '8px 12px', fontSize: 13 }}>{linha.fases_finalizadas}/{linha.fases_total}</td>
                <td style={{ padding: '8px 12px', fontSize: 14, fontWeight: 600 }}>{linha.nota_final != null ? linha.nota_final : '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  {linha.completo && linha.nota_final != null && (
                    confirmadas.includes(linha.participante_id)
                      ? <span style={{ color: '#2e7d32', fontSize: 12 }}>Confirmado ✓</span>
                      : <button onClick={() => confirmarGraduacao(linha)} style={btnLink('#2e7d32')}>Confirmar graduação</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
