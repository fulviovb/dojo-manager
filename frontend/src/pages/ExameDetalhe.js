import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { corDaFaixa } from '../utils/faixaCores';
import { AbaCandidatos, AbaFaixas, AbaFinanceiro, AbaChamada, AbaResultado, Sobreposicoes } from '../components/exame/GestaoExame';
import { Modal, Campo, CamposGestao, camposGestaoDe, PrecosExame, camposPrecosDe } from '../components/exame/ui';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const estiloBtnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnLink = (cor) => ({ background: 'none', border: 'none', color: cor, cursor: 'pointer', fontSize: 12, padding: 0, marginRight: 10 });
const cardEstilo = { background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 };
const thEstilo = { padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#888', textTransform: 'uppercase' };

const STATUS_LABEL = { planejamento: 'Planejamento', em_andamento: 'Em andamento', finalizado: 'Finalizado', cancelado: 'Cancelado' };
const ABAS_GESTAO = [['candidatos', 'Candidatos'], ['faixas', 'Faixas'], ['financeiro', 'Financeiro'], ['chamada', 'Lista de chamada'], ['resultado', 'Resultado']];
const ABAS_AVALIACAO = [['roteiro', 'Roteiro'], ['avaliadores', 'Avaliadores'], ['sorteio', 'Sorteio'], ['progresso', 'Progresso']];
const STATUS_AVALIACAO_LABEL = { pendente: 'Pendente', em_andamento: 'Em andamento', finalizada: 'Finalizada' };
const STATUS_AVALIACAO_COR = { pendente: '#888', em_andamento: '#1565c0', finalizada: '#2e7d32' };

// Estilo de "chip" colorido com a cor da faixa — usado tanto no roteiro
// (Avalia/Não avalia este critério) quanto no sorteio (aluno
// selecionado/não). Faixa branca (#ffffff) some no fundo branco, então
// usa contorno cinza como fallback e, quando "ativo", preenche de cinza
// claro em vez de continuar branco — senão os estados ativo/inativo ficam
// visualmente idênticos e parece que o clique não fez nada.
function estiloChipFaixa(faixa, ativo) {
  const cor = faixa ? corDaFaixa(faixa.nome, faixa.cor) : '#ccc';
  const ehBranca = cor.toLowerCase() === '#ffffff';
  const corBorda = ehBranca ? '#bbb' : cor;
  const corPreenchimento = ehBranca ? '#e0e0e0' : cor;
  const textoEscuro = !faixa || ehBranca || faixa.nome?.toLowerCase().includes('amarela');
  return {
    border: `2px solid ${corBorda}`,
    background: ativo ? corPreenchimento : '#fff',
    color: ativo ? (textoEscuro ? '#333' : '#fff') : '#555',
  };
}

export default function ExameDetalhe({ exameId, onVoltar }) {
  const [exame, setExame] = useState(null);
  const [dados, setDados] = useState(null); // gestão: candidatos + totais
  const [aba, setAba] = useState('candidatos');
  const [candidatoAberto, setCandidatoAberto] = useState(null); // { id, pagamento }
  const [adicionando, setAdicionando] = useState(false);
  const [formGestao, setFormGestao] = useState(null);
  const [faixasArte, setFaixasArte] = useState([]);
  const [formAvaliadorNome, setFormAvaliadorNome] = useState('');
  const [faseSorteioId, setFaseSorteioId] = useState('');
  const [participantesSelecionados, setParticipantesSelecionados] = useState([]);
  const [resultadoSorteio, setResultadoSorteio] = useState(null);
  const [erro, setErro] = useState('');
  const [formFase, setFormFase] = useState({ nome: '', ordem: 1 });
  const [faseEditandoId, setFaseEditandoId] = useState(null);
  const [edicaoFase, setEdicaoFase] = useState({ nome: '', ordem: 1 });
  const [formCriterioPorFase, setFormCriterioPorFase] = useState({});

  const carregar = useCallback(async () => {
    try {
      const [e, g] = await Promise.all([axios.get(`/exames/${exameId}`), axios.get(`/exames/${exameId}/candidatos`)]);
      setExame(e.data); setDados(g.data);
    } catch (ex) { setErro(ex.response?.data?.erro || 'Não foi possível carregar o exame.'); }
  }, [exameId]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (exame?.arte_marcial_id) axios.get(`/faixas?arte_marcial_id=${exame.arte_marcial_id}`).then((r) => setFaixasArte(r.data));
  }, [exame?.arte_marcial_id]);

  if (!exame || !dados) return erro ? <p style={{ color: '#c62828' }}>{erro}</p> : <p style={{ color: '#888' }}>Carregando...</p>;

  const admin = JSON.parse(localStorage.getItem('usuario') || 'null')?.role === 'admin';
  const normal = exame.tipo === 'normal';
  const abas = [...(normal ? ABAS_GESTAO : []), ...(!normal ? ABAS_AVALIACAO.slice(0, 1) : exame.usa_avaliacao ? ABAS_AVALIACAO : [])];
  const abaAtiva = abas.some(([id]) => id === aba) ? aba : abas[0][0];
  const abrirCandidato = (id, pagamento) => setCandidatoAberto({ id, pagamento: !!pagamento });

  const salvarGestao = async (e) => {
    e.preventDefault(); setErro('');
    try { await axios.put(`/exames/${exameId}/gestao`, formGestao); setFormGestao(null); carregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  const cancelarExame = () => {
    if (window.confirm(`Cancelar o exame "${exame.nome}"? As indicações ficam livres e os pagamentos continuam registrados.`)) mudarStatus('cancelado');
  };

  // Sorteio: com presença marcada, só os presentes; antes disso, todos os não desistentes
  const naoDesistiu = (exame.participantes || []).filter((p) => p.status_inscricao !== 'desistiu');
  const presentes = naoDesistiu.filter((p) => p.presenca === 'presente');
  const sorteaveis = presentes.length ? presentes : naoDesistiu.filter((p) => p.presenca !== 'ausente');

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
    const ids = participantesSelecionados.filter((id) => sorteaveis.some((p) => p.id === id));
    if (!faseSorteioId || ids.length === 0) { setErro('Selecione a fase e ao menos um aluno.'); return; }
    try {
      const { data } = await axios.post(`/exames/${exameId}/sorteio`, { fase_exame_id: faseSorteioId, participante_ids: ids });
      setResultadoSorteio(data);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao sortear'); }
  };

  const reabrirAvaliacao = async (avaliacaoId) => {
    if (!window.confirm('Reabrir esta avaliação pra correção?')) return;
    await axios.patch(`/exames/${exameId}/avaliacoes/${avaliacaoId}/reabrir`);
    carregar();
  };

  const avaliacaoDe = (faseId, participanteId) => (exame.avaliacoes || [])
    .find((a) => a.fase_exame_id === faseId && a.exame_participante_id === participanteId);

  return (
    <div>
      <button onClick={onVoltar} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 10 }}>
        ← Voltar para Exames
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {exame.nome}
            {exame.tipo === 'roteiro_padrao' && (
              <span style={{ fontSize: 12, color: '#a15c00', background: '#fff3cd', padding: '2px 10px', borderRadius: 20 }}>🌟 Roteiro Padrão</span>
            )}
          </h2>
          <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
            {exame.ArteMarcial?.nome} · {new Date(exame.data + 'T00:00:00').toLocaleDateString('pt-BR')} · {STATUS_LABEL[exame.status]}
            {exame.horario && ` · ${exame.horario.slice(0, 5)}`}{exame.local && ` · ${exame.local}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {exame.status !== 'cancelado' && <button style={{ background: 'none', border: '1px solid #ddd', color: '#555', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }} onClick={() => { setErro(''); setFormGestao({ nome: exame.nome, data: exame.data, ...camposGestaoDe(exame), ...(exame.tipo === 'normal' ? camposPrecosDe(exame) : {}) }); }}>Editar dados</button>}
          {exame.tipo === 'roteiro_padrao'
            ? <button style={{ background: 'none', border: '1px solid #ddd', color: '#555', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }} onClick={() => mudarTipo('normal')}>Desmarcar como Roteiro Padrão</button>
            : exame.usa_avaliacao && !dados.candidatos.length && <button style={{ background: 'none', border: '1px solid #ddd', color: '#555', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }} onClick={() => mudarTipo('roteiro_padrao')}>🌟 Marcar como Roteiro Padrão</button>}
          {normal && exame.status === 'planejamento' && <button style={estiloBtnPrimario} onClick={() => mudarStatus('em_andamento')}>Iniciar exame</button>}
          {exame.status === 'em_andamento' && <button style={{ ...estiloBtnPrimario, background: '#2e7d32' }} onClick={() => mudarStatus('finalizado')}>Finalizar exame</button>}
          {exame.status === 'finalizado' && <button style={{ ...estiloBtnPrimario, background: '#888' }} onClick={() => mudarStatus('em_andamento')}>Reabrir exame</button>}
          {exame.status === 'cancelado' && <button style={{ ...estiloBtnPrimario, background: '#888' }} onClick={() => mudarStatus('planejamento')}>Reabrir exame</button>}
          {normal && ['planejamento', 'em_andamento'].includes(exame.status) && <button style={{ background: 'none', border: '1px solid #ef6c00', color: '#ef6c00', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }} onClick={cancelarExame}>Cancelar exame</button>}
          {exame.tipo !== 'roteiro_padrao' && !dados.candidatos.some((c) => c.pagamentos.length || c.graduado) && (
            <button title="Excluir exame" style={{ background: 'none', border: '1px solid #c62828', color: '#c62828', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }} onClick={excluirExame}>
              Excluir
            </button>
          )}
        </div>
      </div>

      {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}

      <div role="tablist" style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: '1px solid #ddd', marginBottom: 16 }}>
        {abas.map(([id, rotulo]) => (
          <button key={id} role="tab" aria-selected={abaAtiva === id} onClick={() => setAba(id)}
            style={{ background: 'none', border: 'none', borderBottom: abaAtiva === id ? '3px solid #1565c0' : '3px solid transparent', color: abaAtiva === id ? '#1565c0' : '#555', fontWeight: abaAtiva === id ? 700 : 400, padding: '10px 12px', cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>
            {rotulo}
          </button>
        ))}
      </div>

      {abaAtiva === 'candidatos' && <AbaCandidatos dados={dados} recarregar={carregar} onAbrir={abrirCandidato} onAdicionar={() => setAdicionando(true)} />}
      {abaAtiva === 'faixas' && <AbaFaixas dados={dados} recarregar={carregar} onAbrir={abrirCandidato} />}
      {abaAtiva === 'financeiro' && <AbaFinanceiro dados={dados} onAbrir={abrirCandidato} />}
      {abaAtiva === 'chamada' && <AbaChamada dados={dados} recarregar={carregar} />}
      {abaAtiva === 'resultado' && <AbaResultado dados={dados} recarregar={carregar} />}
      <Sobreposicoes admin={admin} faixas={faixasArte} dados={dados} recarregar={carregar} aberto={candidatoAberto} setAberto={setCandidatoAberto} adicionando={adicionando} setAdicionando={setAdicionando} />

      {formGestao && (
        <Modal titulo="Dados do exame" onFechar={() => setFormGestao(null)}>
          <form onSubmit={salvarGestao}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
              <Campo rotulo="Nome"><input required value={formGestao.nome} onChange={(e) => setFormGestao((f) => ({ ...f, nome: e.target.value }))} style={estiloInput} /></Campo>
              <Campo rotulo="Data"><input required type="date" value={formGestao.data} onChange={(e) => setFormGestao((f) => ({ ...f, data: e.target.value }))} style={estiloInput} /></Campo>
            </div>
            <CamposGestao form={formGestao} set={(v) => setFormGestao((f) => ({ ...f, ...v }))} />
            {normal && <PrecosExame form={formGestao} set={(v) => setFormGestao((f) => ({ ...f, ...v }))} faixas={faixasArte} />}
            <p style={{ fontSize: 12, color: '#888' }}>Mudar as taxas vale para todos os candidatos sem taxa individual. Pedidos de faixa já feitos mantêm o valor.</p>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <button type="submit" style={estiloBtnPrimario}>Salvar</button>
          </form>
        </Modal>
      )}

      {abaAtiva === 'roteiro' && (
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
                              fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: roteiroEditavel ? 'pointer' : 'default',
                              ...estiloChipFaixa(fx, true),
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
                              fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: roteiroEditavel ? 'pointer' : 'default',
                              ...estiloChipFaixa(fx, false),
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
      )}

      {abaAtiva === 'avaliadores' && (
      <div style={cardEstilo}>
        <h3 style={{ marginTop: 0 }}>Avaliadores</h3>
        <p style={{ fontSize: 12, color: '#888', marginTop: -8 }}>
          Repasse o PIN pro avaliador acessar <code>/exame-avaliador/{exame.codigo}</code> no celular dele.
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
      )}

      {abaAtiva === 'sorteio' && (
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
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Alunos sendo avaliados neste momento{presentes.length > 0 ? ' (presentes na chamada)' : ''}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sorteaveis.map((p) => {
              const faixa = p.FaixaAtual || p.FaixaPretendida;
              const selecionado = participantesSelecionados.includes(p.id);
              return (
                <button key={p.id} type="button" onClick={() => toggleParticipanteSorteio(p.id)}
                  style={{
                    fontSize: 13, padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: selecionado ? 600 : 400,
                    ...estiloChipFaixa(faixa, selecionado),
                  }}>
                  {selecionado ? '✓ ' : ''}{p.Aluno?.nome}
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
      )}

      {abaAtiva === 'progresso' && (
      <div style={cardEstilo}>
        <h3 style={{ marginTop: 0 }}>Progresso</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9f9f9' }}>
              <th style={thEstilo}>Aluno</th>
              {(exame.fases || []).map((f) => <th key={f.id} style={thEstilo}>{f.nome}</th>)}
            </tr></thead>
            <tbody>
              {naoDesistiu.map((p) => (
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
      )}
    </div>
  );
}
