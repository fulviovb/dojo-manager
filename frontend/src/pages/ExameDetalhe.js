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
  const [formFase, setFormFase] = useState({ nome: '', ordem: 1 });
  const [faseEditandoId, setFaseEditandoId] = useState(null);
  const [edicaoFase, setEdicaoFase] = useState({ nome: '', ordem: 1 });
  const [formCriterioPorFase, setFormCriterioPorFase] = useState({});

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

  const roteiroEditavel = exame.status === 'planejamento';

  const addFase = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await axios.post(`/exames/${exameId}/fases`, formFase);
      setFormFase((f) => ({ nome: '', ordem: f.ordem + 1 }));
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  const iniciarEdicaoFase = (fase) => { setFaseEditandoId(fase.id); setEdicaoFase({ nome: fase.nome, ordem: fase.ordem }); };
  const salvarEdicaoFase = async (fase) => {
    setErro('');
    try {
      await axios.put(`/exames/${exameId}/fases/${fase.id}`, edicaoFase);
      setFaseEditandoId(null);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar fase'); }
  };
  const removerFase = async (fase) => {
    if (!window.confirm(`Remover a fase "${fase.nome}" e todos os seus critérios?`)) return;
    await axios.delete(`/exames/${exameId}/fases/${fase.id}`);
    carregar();
  };

  const addCriterio = async (e, fase) => {
    e.preventDefault(); setErro('');
    const dados = formCriterioPorFase[fase.id] || { nome: '', ordem: 1 };
    try {
      await axios.post(`/exames/${exameId}/fases/${fase.id}/criterios`, dados);
      setFormCriterioPorFase((v) => ({ ...v, [fase.id]: { nome: '', ordem: (dados.ordem || 1) + 1 } }));
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro'); }
  };

  const removerCriterio = async (criterio) => {
    if (!window.confirm(`Remover o critério "${criterio.nome}"?`)) return;
    await axios.delete(`/exames/${exameId}/criterios/${criterio.id}`);
    carregar();
  };

  // Clique único move a faixa entre as duas listas (mesmo padrão de
  // Presentes/Ausentes da tela de Chamadas) — sem checkbox, sem modo de
  // edição separado, sempre disponível enquanto o roteiro está editável.
  const toggleFaixaCriterio = async (criterio, faixaId, incluir) => {
    const novosFaixaIds = incluir
      ? [...criterio.faixa_ids, faixaId]
      : criterio.faixa_ids.filter((id) => id !== faixaId);
    try {
      await axios.put(`/exames/${exameId}/criterios/${criterio.id}/faixas`, { faixa_ids: novosFaixaIds });
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao atualizar faixas'); }
  };

  const mudarStatus = async (status) => {
    setErro('');
    try { await axios.patch(`/exames/${exameId}/status`, { status }); carregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao mudar status'); }
  };

  const mudarTipo = async (tipo) => {
    setErro('');
    if (tipo === 'roteiro_padrao' && !window.confirm(
      `Marcar "${exame.nome}" como Roteiro Padrão de ${exame.ArteMarcial?.nome}? Se já existir outro, ele deixa de ser.`
    )) return;
    try { await axios.patch(`/exames/${exameId}/tipo`, { tipo }); carregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao mudar tipo'); }
  };

  const excluirExame = async () => {
    if (!window.confirm(`Excluir o exame "${exame.nome}"? Participantes, avaliadores e avaliações dele somem junto. Essa ação não pode ser desfeita.`)) return;
    setErro('');
    try { await axios.delete(`/exames/${exameId}`); onVoltar?.(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao excluir exame'); }
  };

  // Ao escolher o aluno, já puxa a faixa atual dele (GraduacaoAluno com
  // atual=true nessa arte marcial) e sugere a próxima faixa da sequência
  // como pretendida — o professor só ajusta se for um caso fora do padrão.
  const selecionarAluno = async (alunoId) => {
    setFormParticipante({ aluno_id: alunoId, faixa_atual_id: '', faixa_pretendida_id: '' });
    if (!alunoId) return;
    try {
      const { data } = await axios.get(`/graduacoes?aluno_id=${alunoId}`);
      const atual = data.find((g) => g.arte_marcial_id === exame.arte_marcial_id && g.atual);
      const faixaAtualId = atual?.faixa_id || '';
      const ordenadas = [...faixasArte].sort((a, b) => a.ordem - b.ordem);
      const idxAtual = ordenadas.findIndex((f) => f.id === faixaAtualId);
      const faixaPretendidaId = faixaAtualId
        ? (ordenadas[idxAtual + 1]?.id || '')
        : (ordenadas[0]?.id || '');
      setFormParticipante({ aluno_id: alunoId, faixa_atual_id: faixaAtualId, faixa_pretendida_id: faixaPretendidaId });
    } catch (ex) { /* prefill é só conveniência — se falhar, professor escolhe manualmente */ }
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
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {exame.nome}
            {exame.tipo === 'roteiro_padrao' && (
              <span style={{ fontSize: 12, color: '#a15c00', background: '#fff3cd', padding: '2px 10px', borderRadius: 20 }}>🌟 Roteiro Padrão</span>
            )}
          </h2>
          <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
            {exame.ArteMarcial?.nome} · {new Date(exame.data + 'T00:00:00').toLocaleDateString('pt-BR')} · {STATUS_LABEL[exame.status]}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {exame.tipo === 'roteiro_padrao'
            ? <button style={{ background: 'none', border: '1px solid #ddd', color: '#555', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }} onClick={() => mudarTipo('normal')}>Desmarcar como Roteiro Padrão</button>
            : <button style={{ background: 'none', border: '1px solid #ddd', color: '#555', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }} onClick={() => mudarTipo('roteiro_padrao')}>🌟 Marcar como Roteiro Padrão</button>}
          {exame.status === 'planejamento' && <button style={estiloBtnPrimario} onClick={() => mudarStatus('em_andamento')}>Iniciar exame</button>}
          {exame.status === 'em_andamento' && <button style={{ ...estiloBtnPrimario, background: '#2e7d32' }} onClick={() => mudarStatus('finalizado')}>Finalizar exame</button>}
          {exame.status === 'finalizado' && <button style={{ ...estiloBtnPrimario, background: '#888' }} onClick={() => mudarStatus('em_andamento')}>Reabrir exame</button>}
          {exame.tipo !== 'roteiro_padrao' && (
            <button title="Excluir exame" style={{ background: 'none', border: '1px solid #c62828', color: '#c62828', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }} onClick={excluirExame}>
              Excluir
            </button>
          )}
        </div>
      </div>

      {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}

      <div style={cardEstilo}>
        <h3 style={{ marginTop: 0 }}>Roteiro do Exame</h3>
        <p style={{ fontSize: 12, color: '#888', marginTop: -8, marginBottom: 16 }}>
          {roteiroEditavel
            ? 'Fases (provas) e critérios de avaliação — copiado do exame mais recente dessa arte marcial, se existir. Ajuste livremente antes de iniciar o exame.'
            : 'Roteiro travado: só é editável enquanto o exame está em Planejamento.'}
        </p>

        {roteiroEditavel && (
          <form onSubmit={addFase} style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Nova fase (prova)</label>
              <input required placeholder="Ex: Kihon" value={formFase.nome} onChange={(e) => setFormFase((f) => ({ ...f, nome: e.target.value }))} style={{ ...estiloInput, width: 180 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Ordem</label>
              <input type="number" min={1} value={formFase.ordem} onChange={(e) => setFormFase((f) => ({ ...f, ordem: Number(e.target.value) }))} style={{ ...estiloInput, width: 70 }} />
            </div>
            <button type="submit" style={estiloBtnPrimario}>Adicionar fase</button>
          </form>
        )}

        {(exame.fases || []).length === 0 && <p style={{ fontSize: 13, color: '#888' }}>Nenhuma fase cadastrada ainda.</p>}

        {[...(exame.fases || [])].sort((a, b) => a.ordem - b.ordem).map((fase) => (
          <div key={fase.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              {faseEditandoId === fase.id ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={edicaoFase.nome} onChange={(e) => setEdicaoFase((v) => ({ ...v, nome: e.target.value }))} style={{ ...estiloInput, width: 160 }} />
                  <input type="number" min={1} value={edicaoFase.ordem} onChange={(e) => setEdicaoFase((v) => ({ ...v, ordem: Number(e.target.value) }))} style={{ ...estiloInput, width: 60 }} />
                  <button onClick={() => salvarEdicaoFase(fase)} style={btnLink('#2e7d32')}>Salvar</button>
                  <button onClick={() => setFaseEditandoId(null)} style={btnLink('#888')}>Cancelar</button>
                </div>
              ) : (
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fase.ordem}. {fase.nome}</div>
              )}
              {roteiroEditavel && (
                <div>
                  <button onClick={() => iniciarEdicaoFase(fase)} style={btnLink('#1565c0')}>Editar</button>
                  <button onClick={() => removerFase(fase)} style={btnLink('#c62828')}>Remover</button>
                </div>
              )}
            </div>

            {fase.criterios.length === 0 && <p style={{ fontSize: 12, color: '#888' }}>Nenhum critério.</p>}

            {[...fase.criterios].sort((a, b) => a.ordem - b.ordem).map((criterio) => {
              const avalia = faixasArte.filter((fx) => criterio.faixa_ids.includes(fx.id));
              const naoAvalia = faixasArte.filter((fx) => !criterio.faixa_ids.includes(fx.id));
              return (
                <div key={criterio.id} style={{ borderTop: '1px solid #f5f5f5', paddingTop: 8, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>{criterio.nome}</strong>
                    {roteiroEditavel && (
                      <button onClick={() => removerCriterio(criterio)} style={{ ...btnLink('#c62828'), marginRight: 0 }}>remover critério</button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#2e7d32', marginBottom: 4 }}>✅ Avalia este critério</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {avalia.length === 0 && <span style={{ fontSize: 11, color: '#aaa' }}>nenhuma</span>}
                        {avalia.map((fx) => (
                          <button key={fx.id} disabled={!roteiroEditavel} onClick={() => toggleFaixaCriterio(criterio, fx.id, false)}
                            style={{
                              fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid #2e7d32',
                              background: '#e8f5e9', color: '#2e7d32', cursor: roteiroEditavel ? 'pointer' : 'default',
                            }}>
                            {fx.nome}{roteiroEditavel ? ' ✕' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Não avalia (nota cheia automática)</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {naoAvalia.map((fx) => (
                          <button key={fx.id} disabled={!roteiroEditavel} onClick={() => toggleFaixaCriterio(criterio, fx.id, true)}
                            style={{
                              fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid #ddd',
                              background: '#fafafa', color: '#888', cursor: roteiroEditavel ? 'pointer' : 'default',
                            }}>
                            {fx.nome}{roteiroEditavel ? ' +' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {roteiroEditavel && (
              <form onSubmit={(e) => addCriterio(e, fase)} style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
                <input required placeholder="Novo critério" value={formCriterioPorFase[fase.id]?.nome || ''}
                  onChange={(e) => setFormCriterioPorFase((v) => ({ ...v, [fase.id]: { ...(v[fase.id] || { ordem: 1 }), nome: e.target.value } }))}
                  style={{ ...estiloInput, width: 180 }} />
                <button type="submit" style={{ ...estiloBtnPrimario, fontSize: 12, padding: '6px 12px' }}>Adicionar critério</button>
              </form>
            )}
          </div>
        ))}
      </div>

      <div style={cardEstilo}>
        <h3 style={{ marginTop: 0 }}>Participantes</h3>
        <form onSubmit={addParticipante} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Aluno</label>
            <select required value={formParticipante.aluno_id} onChange={(e) => selecionarAluno(e.target.value)} style={{ ...estiloInput, width: 200 }}>
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(exame.participantes || []).map((p) => {
              const faixa = p.FaixaAtual || p.FaixaPretendida;
              const cor = faixa ? corDaFaixa(faixa.nome, faixa.cor) : '#ccc';
              const corBorda = cor.toLowerCase() === '#ffffff' ? '#ccc' : cor;
              const textoEscuro = !faixa || ['branca', 'amarela'].some((k) => faixa.nome?.toLowerCase().includes(k));
              const selecionado = participantesSelecionados.includes(p.id);
              return (
                <button key={p.id} type="button" onClick={() => toggleParticipanteSorteio(p.id)}
                  style={{
                    fontSize: 13, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    border: `2px solid ${corBorda}`, background: selecionado ? cor : '#fff',
                    color: selecionado ? (textoEscuro ? '#333' : '#fff') : '#333',
                  }}>
                  {p.Aluno?.nome}
                </button>
              );
            })}
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
