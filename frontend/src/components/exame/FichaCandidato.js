import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Faixa, Selo, FormExterno, Campo, btnVerde, btnCinza, btnLink, btnPrimario, estiloInput } from './ui';
import { moeda, formatData, SITUACAO, INSCRICAO, FORMAS, textoCarencia, textoCobranca, copiarTexto, saldoTotal } from '../../utils/gestaoExame';

const secao = { borderTop: '1px solid #eee', padding: '14px 0' };
const h4 = { margin: '0 0 10px', fontSize: 14 };

// Painel lateral do candidato. No celular ocupa a tela inteira (é no fim da
// aula, no telefone, que o pagamento é registrado).
export default function FichaCandidato({ exame, candidato: c, faixas, hoje, admin, abrirPagamento, onFechar, onMudou }) {
  const base = `/exames/${exame.id}`;
  const formDe = () => ({ valor_taxa: c.taxa_propria ?? '', desconto: c.desconto || '', motivo_desconto: c.motivo_desconto || '', isento: c.isento });
  const pedidoDe = () => ({
    quer_comprar: c.quer_comprar, faixa_id: c.pedido?.faixa?.id || c.faixa_pretendida?.id || '',
    tamanho: c.pedido?.tamanho || '', tipo: c.pedido?.tipo || '', valor: c.pedido?.valor ?? (exame.tipos_faixa?.length ? '' : exame.preco_faixa_padrao) ?? '',
  });
  const pagamentoDe = (ref) => ({
    referente: ref, valor: c.financeiro[ref].saldo ? c.financeiro[ref].saldo.toFixed(2) : '', data: hoje, forma: 'pix', observacao: '', comprovante_url: '',
  });
  const refInicial = c.financeiro.taxa.saldo > 0 || c.financeiro.faixa.saldo <= 0 ? 'taxa' : 'faixa';
  const [taxa, setTaxa] = useState(formDe);
  const [pedido, setPedido] = useState(pedidoDe);
  const [obs, setObs] = useState(c.observacoes || '');
  const [pag, setPag] = useState(abrirPagamento ? pagamentoDe(refInicial) : null);
  const [estorno, setEstorno] = useState(null); // { id, motivo }
  const [confirmar, setConfirmar] = useState(null); // 'desistir' | 'remover'
  const [historico, setHistorico] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onFechar]);

  const executar = async (fn, msg) => {
    if (salvando) return false;
    setSalvando(true); setErro(''); setAviso('');
    try { await fn(); await onMudou(); setAviso(msg); setHistorico(null); return true; }
    catch (ex) { setErro(ex.response?.data?.erro || 'Não foi possível salvar.'); return false; }
    finally { setSalvando(false); }
  };

  const tipos = exame.tipos_faixa || [];
  const { taxa: ft, faixa: ff } = c.financeiro;
  const cancelado = exame.status === 'cancelado';
  const aberto = ['planejamento', 'em_andamento'].includes(exame.status);

  const salvarPagamento = async (e) => {
    e.preventDefault();
    if (await executar(() => axios.post(`${base}/pagamentos`, { ...pag, exame_participante_id: c.id }), 'Pagamento registrado.')) setPag(null);
  };

  return (
    <>
      <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2000 }} />
      <div role="dialog" aria-label={`Candidato ${c.aluno.nome}`} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, maxWidth: '100%', background: '#fff', zIndex: 2001, overflowY: 'auto', padding: '16px 18px', boxSizing: 'border-box', boxShadow: '-4px 0 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{c.aluno.nome}</div>
            <div style={{ fontSize: 13, margin: '4px 0' }}><Faixa faixa={c.faixa_atual} /> → <Faixa faixa={c.faixa_pretendida} /></div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {c.aluno.idade != null && `${c.aluno.idade} anos · `}{c.externo ? `Externo${c.externo.origem ? ` (${c.externo.origem})` : ''}` : c.turma?.nome || 'Sem turma'} · carência {textoCarencia(c.carencia)}<br />
              Responsável: {c.responsavel}{c.aluno.telefone && ` · ${c.aluno.telefone}`}
            </div>
            <div style={{ marginTop: 6 }}><Selo cor={INSCRICAO[c.status_inscricao].cor}>{INSCRICAO[c.status_inscricao].label}</Selo></div>
          </div>
          <button onClick={onFechar} aria-label="Fechar" style={{ background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', alignSelf: 'flex-start', lineHeight: 1 }}>×</button>
        </div>
        <div aria-live="polite">
          {erro && <p style={{ color: '#c62828', fontSize: 13, background: '#ffebee', padding: 8, borderRadius: 4 }}>{erro}</p>}
          {aviso && <p style={{ color: '#2e7d32', fontSize: 13, background: '#e8f5e9', padding: 8, borderRadius: 4 }}>{aviso}</p>}
        </div>

        {c.externo && admin && !cancelado && (
          <details style={{ margin: '10px 0', fontSize: 13 }}>
            <summary style={{ cursor: 'pointer', color: '#1565c0', marginBottom: 8 }}>Editar dados do externo</summary>
            <FormExterno faixas={faixas} rotulo="Salvar dados" salvando={salvando}
              inicial={{ nome: c.aluno.nome, telefone: c.aluno.telefone, ...c.externo, faixa_atual_id: c.faixa_atual?.id, faixa_pretendida_id: c.faixa_pretendida?.id }}
              onSalvar={(f) => executar(() => axios.put(`${base}/externos/${c.id}`, f), 'Dados salvos.')} />
          </details>
        )}

        <div style={{ ...secao, marginTop: 10 }}>
          <h4 style={h4}>Pagamentos</h4>
          {[['Taxa', ft], ['Faixa', ff]].map(([rotulo, f]) => (f.situacao !== 'nao_pediu' || f.pago > 0) && (
            <div key={rotulo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6, gap: 8 }}>
              <span><strong>{rotulo}</strong> {moeda(f.pago)} de {moeda(f.devido)}{f.saldo > 0 && <> · saldo <strong>{moeda(f.saldo)}</strong></>}</span>
              <Selo cor={SITUACAO[f.situacao].cor}>{SITUACAO[f.situacao].label}</Selo>
            </div>
          ))}
          {ft.credito + ff.credito > 0 && <p style={{ color: '#c62828', fontSize: 12, fontWeight: 600 }}>⚠ Crédito a devolver: {moeda(ft.credito + ff.credito)}</p>}
          {c.status_inscricao === 'desistiu' && ft.pago + ff.pago > 0 && <p style={{ color: '#c62828', fontSize: 12 }}>Desistente com {moeda(ft.pago + ff.pago)} pagos.</p>}

          {c.pagamentos.map((p) => (
            <div key={p.id} style={{ fontSize: 12, padding: '6px 0', borderTop: '1px solid #f5f5f5', color: p.estornado_em ? '#999' : '#333' }}>
              <span style={{ textDecoration: p.estornado_em ? 'line-through' : 'none' }}>{formatData(p.data)} · {p.referente} · {FORMAS[p.forma]} · <strong>{moeda(p.valor)}</strong></span>
              {' '}{!p.estornado_em && <button style={btnLink('#c62828')} onClick={() => setEstorno({ id: p.id, motivo: '' })}>estornar</button>}
              <div style={{ color: '#888' }}>por {p.registrado_por || '—'}{p.observacao && ` · ${p.observacao}`}{p.comprovante_url && <> · <a href={p.comprovante_url} target="_blank" rel="noreferrer">comprovante</a></>}{p.estornado_em && ` · estornado: ${p.motivo_estorno}`}</div>
              {estorno?.id === p.id && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input autoFocus placeholder="Motivo do estorno" value={estorno.motivo} onChange={(e) => setEstorno({ ...estorno, motivo: e.target.value })} style={estiloInput} />
                  <button style={btnCinza} disabled={!estorno.motivo.trim() || salvando} onClick={async () => { if (await executar(() => axios.delete(`${base}/pagamentos/${p.id}`, { data: { motivo: estorno.motivo } }), 'Pagamento estornado.')) setEstorno(null); }}>Estornar</button>
                </div>
              )}
            </div>
          ))}

          {!pag ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button style={{ ...btnVerde, padding: '10px 16px' }} onClick={() => setPag(pagamentoDe(refInicial))}>Registrar pagamento</button>
              {saldoTotal(c) > 0 && c.status_inscricao !== 'desistiu' && <button style={btnCinza} onClick={async () => { const ok = await copiarTexto(textoCobranca(exame, c)); setErro(ok ? '' : 'Não foi possível copiar.'); setAviso(ok ? 'Cobrança copiada. É só colar no WhatsApp.' : ''); }}>Copiar cobrança</button>}
            </div>
          ) : (
            <form onSubmit={salvarPagamento} style={{ background: '#f7f9f7', borderRadius: 6, padding: 12, marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo rotulo="Referente a"><select value={pag.referente} onChange={(e) => setPag({ ...pag, referente: e.target.value, valor: pagamentoDe(e.target.value).valor })} style={{ ...estiloInput, fontSize: 16 }}><option value="taxa">Taxa</option><option value="faixa">Faixa</option></select></Campo>
              <Campo rotulo="Valor (R$)"><input required type="number" inputMode="decimal" min="0.01" step="0.01" value={pag.valor} onChange={(e) => setPag({ ...pag, valor: e.target.value })} style={{ ...estiloInput, fontSize: 16 }} /></Campo>
              <Campo rotulo="Forma"><select value={pag.forma} onChange={(e) => setPag({ ...pag, forma: e.target.value })} style={{ ...estiloInput, fontSize: 16 }}>{Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
              <Campo rotulo="Data"><input required type="date" max={hoje} value={pag.data} onChange={(e) => setPag({ ...pag, data: e.target.value })} style={{ ...estiloInput, fontSize: 16 }} /></Campo>
              <Campo rotulo="Observação" style={{ gridColumn: '1 / -1' }}><input maxLength={255} value={pag.observacao} onChange={(e) => setPag({ ...pag, observacao: e.target.value })} style={estiloInput} /></Campo>
              <Campo rotulo="Link do comprovante (opcional)" style={{ gridColumn: '1 / -1' }}><input type="url" placeholder="https://" value={pag.comprovante_url} onChange={(e) => setPag({ ...pag, comprovante_url: e.target.value })} style={estiloInput} /></Campo>
              <button type="button" style={btnCinza} onClick={() => setPag(null)}>Cancelar</button>
              <button type="submit" disabled={salvando} style={{ ...btnVerde, padding: 12 }}>{salvando ? 'Salvando...' : 'Confirmar'}</button>
            </form>
          )}
        </div>

        {!cancelado && (
          <div style={secao}>
            <h4 style={h4}>Pedido de faixa</h4>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[['sim', 'Sim'], ['nao', 'Não'], ['sem_resposta', 'Sem resposta']].map(([v, r]) => <button key={v} onClick={() => setPedido({ ...pedido, quer_comprar: v })} style={{ ...btnCinza, ...(pedido.quer_comprar === v ? { background: '#1e2a38', color: '#fff' } : {}) }}>{r}</button>)}
            </div>
            {pedido.quer_comprar === 'sim' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 10 }}>
                <Campo rotulo="Cor"><select value={pedido.faixa_id} onChange={(e) => setPedido({ ...pedido, faixa_id: e.target.value })} style={estiloInput}>{faixas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></Campo>
                <Campo rotulo="Tamanho *"><input maxLength={30} value={pedido.tamanho} onChange={(e) => setPedido({ ...pedido, tamanho: e.target.value })} style={estiloInput} /></Campo>
                {(tipos.length > 0 || pedido.tipo) && (
                  <Campo rotulo="Tipo *"><select value={pedido.tipo} onChange={(e) => { const t = tipos.find((x) => x.nome === e.target.value); setPedido({ ...pedido, tipo: e.target.value, valor: t ? t.preco : pedido.valor }); }} style={estiloInput}>
                    <option value="">Selecione...</option>
                    {tipos.map((t) => <option key={t.nome} value={t.nome}>{t.nome} ({moeda(t.preco)})</option>)}
                    {pedido.tipo && !tipos.some((t) => t.nome === pedido.tipo) && <option value={pedido.tipo}>{pedido.tipo}</option>}
                  </select></Campo>
                )}
                <Campo rotulo="Valor (R$) *"><input type="number" inputMode="decimal" min="0" step="0.01" value={pedido.valor} onChange={(e) => setPedido({ ...pedido, valor: e.target.value })} style={estiloInput} /></Campo>
              </div>
            )}
            <button style={btnPrimario} disabled={salvando} onClick={() => executar(() => axios.put(`${base}/pedidos-faixa/${c.id}`, pedido.quer_comprar === 'sim' ? pedido : { quer_comprar: pedido.quer_comprar }), 'Pedido salvo.')}>Salvar pedido</button>
            {c.quer_comprar === 'sim' && (
              <label style={{ fontSize: 13, marginLeft: 14 }}><input type="checkbox" disabled={salvando} checked={!!c.pedido.entregue} onChange={(e) => executar(() => axios.put(`${base}/pedidos-faixa/${c.id}`, { entregue: e.target.checked }), 'Entrega atualizada.')} /> Entregue{c.pedido.entregue_em && ` em ${formatData(c.pedido.entregue_em)}`}</label>
            )}
          </div>
        )}

        {!cancelado && (
          <div style={secao}>
            <h4 style={h4}>Taxa</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <Campo rotulo="Taxa (R$)"><input type="number" inputMode="decimal" min="0" step="0.01" placeholder={c.taxa_herdada == null ? 'faixa sem taxa' : `da faixa: ${moeda(c.taxa_herdada)}`} value={taxa.valor_taxa} onChange={(e) => setTaxa({ ...taxa, valor_taxa: e.target.value })} style={estiloInput} /></Campo>
              <Campo rotulo="Desconto (R$)"><input type="number" inputMode="decimal" min="0" step="0.01" value={taxa.desconto} onChange={(e) => setTaxa({ ...taxa, desconto: e.target.value })} style={estiloInput} /></Campo>
            </div>
            <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}><input type="checkbox" checked={taxa.isento} onChange={(e) => setTaxa({ ...taxa, isento: e.target.checked })} /> Isento</label>
            {(taxa.isento || Number(taxa.desconto) > 0) && <Campo rotulo="Motivo *" style={{ marginBottom: 8 }}><input maxLength={255} value={taxa.motivo_desconto} onChange={(e) => setTaxa({ ...taxa, motivo_desconto: e.target.value })} style={estiloInput} /></Campo>}
            <button style={btnPrimario} disabled={salvando} onClick={() => executar(() => axios.patch(`${base}/candidatos/${c.id}`, taxa), 'Taxa salva.')}>Salvar taxa</button>
          </div>
        )}

        {!cancelado && (
          <div style={secao}>
            <h4 style={h4}>Observações</h4>
            <textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} style={{ ...estiloInput, marginBottom: 8 }} />
            <button style={btnPrimario} disabled={salvando} onClick={() => executar(() => axios.patch(`${base}/candidatos/${c.id}`, { observacoes: obs }), 'Observações salvas.')}>Salvar observações</button>
          </div>
        )}

        <div style={secao}>
          <h4 style={h4}>Inscrição</h4>
          {aberto && !c.graduado && c.status_inscricao !== 'desistiu' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {c.status_inscricao === 'indicado'
                ? <button style={btnVerde} disabled={salvando} onClick={() => executar(() => axios.patch(`${base}/candidatos/${c.id}`, { status_inscricao: 'confirmado' }), 'Inscrição confirmada.')}>Confirmar inscrição</button>
                : <button style={btnCinza} disabled={salvando} onClick={() => executar(() => axios.patch(`${base}/candidatos/${c.id}`, { status_inscricao: 'indicado' }), 'Confirmação desfeita.')}>Desfazer confirmação</button>}
              <button style={btnCinza} onClick={() => setConfirmar('desistir')}>Desistiu</button>
              {!c.pagamentos.length && !c.resultado && <button style={{ ...btnCinza, color: '#c62828' }} onClick={() => setConfirmar('remover')}>Remover da lista</button>}
            </div>
          )}
          {c.status_inscricao === 'desistiu' && c.externo && aberto && <button style={btnCinza} disabled={salvando} onClick={() => executar(() => axios.patch(`${base}/candidatos/${c.id}`, { status_inscricao: 'indicado' }), 'Voltou ao exame.')}>Voltar ao exame</button>}
          {c.status_inscricao === 'desistiu' && !c.externo && <p style={{ fontSize: 12, color: '#888' }}>Para voltar ao exame, inclua o aluno de novo em "Adicionar candidatos".</p>}
          {confirmar && (
            <div style={{ background: '#fff8e1', padding: 10, borderRadius: 6, marginTop: 10, fontSize: 13 }}>
              {confirmar === 'desistir' ? `Os pagamentos são mantidos${c.externo ? '.' : ' e a indicação fica livre para o próximo exame.'}` : `Use só para inclusão por engano.${c.externo ? '' : ' A indicação do aluno continua aberta.'}`}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={btnCinza} onClick={() => setConfirmar(null)}>Voltar</button>
                <button style={{ ...btnPrimario, background: '#c62828' }} disabled={salvando} onClick={async () => {
                  const ok = confirmar === 'desistir'
                    ? await executar(() => axios.patch(`${base}/candidatos/${c.id}`, { status_inscricao: 'desistiu' }), 'Desistência registrada.')
                    : await executar(() => axios.delete(`${base}/candidatos/${c.id}`), '');
                  if (ok && confirmar === 'remover') onFechar(); else setConfirmar(null);
                }}>{confirmar === 'desistir' ? 'Registrar desistência' : 'Remover'}</button>
              </div>
            </div>
          )}
        </div>

        <div style={secao}>
          <button style={btnLink()} onClick={() => (historico ? setHistorico(null) : axios.get(`${base}/historico`, { params: { candidato_id: c.id } }).then((r) => setHistorico(r.data)).catch(() => setErro('Não foi possível carregar o histórico.')))}>{historico ? 'Ocultar histórico' : 'Ver histórico de alterações'}</button>
          {historico?.map((h) => <div key={h.id} style={{ fontSize: 12, padding: '4px 0', color: '#555' }}>{new Date(h.em).toLocaleString('pt-BR')} · {h.usuario} · {h.descricao}</div>)}
        </div>
      </div>
    </>
  );
}
