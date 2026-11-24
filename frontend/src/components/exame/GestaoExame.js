import React, { useState } from 'react';
import axios from 'axios';
import AdicionarCandidatos from './AdicionarCandidatos';
import FichaCandidato from './FichaCandidato';
import { Faixa, Selo, Modal, Campo, useCelular, btnPrimario, btnVerde, btnCinza, btnLink, cardEstilo, estiloInput, thEstilo, tdEstilo } from './ui';
import {
  moeda, formatData, SITUACAO, INSCRICAO, PEDIDO, FORMAS, FILTROS_VAZIOS, filtrar, ordenar, textoCarencia, textoPedido, ativos, pendentes, saldoTotal, faixasSemTaxa,
  diasAtraso, consolidarFaixas, csvCandidatos, csvFaixas, textoCobranca, copiarTexto,
} from '../../utils/gestaoExame';

const abrirImpressao = (exameId, tipo, params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  window.open(`/exame/${exameId}/listas/${tipo}${qs ? `?${qs}` : ''}`, '_blank');
};

function Total({ rotulo, valor, sub, cor = '#1e2a38' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 11, color: '#888' }}>{rotulo}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: cor }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: '#888' }}>{sub}</div>}
    </div>
  );
}

function AvisoSemTaxa({ candidatos, onDefinir }) {
  const faixas = faixasSemTaxa(candidatos);
  if (!faixas.length) return null;
  const n = ativos(candidatos).filter((c) => c.financeiro.taxa.situacao === 'sem_taxa').length;
  return (
    <div role="alert" style={{ background: '#fce4ec', border: '1px solid #ad1457', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
      <strong>{n} candidato(s) sem taxa.</strong> Faixas sem valor: {faixas.map((f) => f.nome).join(', ')}.{' '}
      <button style={btnLink('#ad1457')} onClick={onDefinir}><u>Definir taxas</u></button>
    </div>
  );
}

function Totais({ t }) {
  const sub = (k) => `taxa ${moeda(t.taxa[k])} · faixa ${moeda(t.faixa[k])}`;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 10, marginBottom: 14 }}>
      <Total rotulo="Inscritos" valor={t.inscritos} sub={t.desistentes ? `${t.desistentes} desistente(s)` : null} />
      <Total rotulo="Confirmados" valor={t.confirmados} cor="#2e7d32" />
      <Total rotulo="Previsto" valor={moeda(t.taxa.previsto + t.faixa.previsto)} sub={sub('previsto')} />
      <Total rotulo="Recebido" valor={moeda(t.taxa.recebido + t.faixa.recebido)} sub={sub('recebido')} cor="#2e7d32" />
      <Total rotulo="Pendente" valor={moeda(t.taxa.pendente + t.faixa.pendente)} sub={sub('pendente')} cor="#ef6c00" />
      <Total rotulo="Faixas pedidas" valor={t.faixas_pedidas} />
      {t.credito_a_devolver > 0 && <Total rotulo="Crédito a devolver" valor={moeda(t.credito_a_devolver)} cor="#c62828" />}
      {t.pago_por_desistentes > 0 && <Total rotulo="Pago por desistentes" valor={moeda(t.pago_por_desistentes)} cor="#c62828" />}
    </div>
  );
}

function Filtros({ candidatos, f, setF }) {
  const unicos = (get) => [...new Map(candidatos.map(get).filter(Boolean).map((x) => [x.id, x])).values()];
  const sel = (k, rotulo, opcoes) => (
    <select aria-label={rotulo} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={{ ...estiloInput, width: 'auto', flex: '1 1 130px', fontSize: 12, background: f[k] ? '#e3f2fd' : '#fff' }}>
      <option value="">{rotulo}: todos</option>
      {opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const labels = (o) => Object.entries(o).map(([k, v]) => [k, v.label || v]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      <input placeholder="Buscar aluno..." value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} style={{ ...estiloInput, flex: '2 1 160px', width: 'auto', fontSize: 12 }} />
      {sel('turma', 'Turma', unicos((c) => c.turma).map((t) => [t.id, t.nome]))}
      {sel('faixa', 'Faixa pretendida', unicos((c) => c.faixa_pretendida).sort((a, b) => a.ordem - b.ordem).map((x) => [x.id, x.nome]))}
      {sel('inscricao', 'Inscrição', labels(INSCRICAO))}
      {sel('pagamento', 'Pagamento', labels(SITUACAO).filter(([k]) => k !== 'nao_pediu'))}
      {sel('pedido', 'Pedido de faixa', labels(PEDIDO))}
      {sel('carencia', 'Carência', [['ok', 'Cumprida'], ['abaixo', 'Abaixo do mínimo'], ['sem_criterio', 'Sem critério']])}
      {Object.values(f).some(Boolean) && <button style={btnLink()} onClick={() => setF(FILTROS_VAZIOS)}>Limpar filtros</button>}
    </div>
  );
}

const COLUNAS = [['aluno', 'Aluno'], ['turma', 'Turma'], ['faixa', 'Faixa atual → pretendida'], ['carencia', 'Carência'], ['taxa', 'Taxa'], ['pago', 'Pago'], ['situacao', 'Situação'], ['pedido', 'Faixa'], ['inscricao', 'Inscrição']];

const corCarencia = (c) => (c?.situacao === 'abaixo' ? '#c62828' : c?.situacao === 'ok' ? '#2e7d32' : '#888');

export function AbaCandidatos({ dados, recarregar, onAbrir, onAdicionar, onDefinirTaxas }) {
  const { exame, candidatos, totais } = dados;
  const [f, setF] = useState(FILTROS_VAZIOS);
  const [marcados, setMarcados] = useState(new Set());
  const [modalPagar, setModalPagar] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const celular = useCelular();
  const [ordem, setOrdem] = useState({ coluna: 'faixa', desc: false });
  const clicarColuna = (coluna) => setOrdem((o) => ({ coluna, desc: o.coluna === coluna ? !o.desc : false }));
  const visiveis = ordenar(filtrar(candidatos, f), ordem.coluna, ordem.desc);
  // só vale o que está visível: filtro nunca esconde um item marcado
  const sel = visiveis.filter((c) => marcados.has(c.id));
  const aberto = ['planejamento', 'em_andamento'].includes(exame.status);

  const acao = async (fn, msg) => {
    setSalvando(true); setErro(''); setAviso('');
    try { const r = await fn(); setMarcados(new Set()); await recarregar(); setAviso(typeof msg === 'function' ? msg(r) : msg); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Não foi possível concluir.'); }
    finally { setSalvando(false); }
  };
  const confirmar = () => acao(() => axios.patch(`/exames/${exame.id}/candidatos`, { ids: sel.filter((c) => c.status_inscricao === 'indicado').map((c) => c.id), status_inscricao: 'confirmado' }), 'Inscrições confirmadas.');
  const pagar = async () => {
    const { ids, forma, data } = modalPagar;
    setModalPagar(null);
    await acao(() => axios.post(`/exames/${exame.id}/pagamentos/lote`, { ids, forma, data }), (r) => `${r.data.registrados} pagamento(s) registrado(s).`);
  };
  const alternarFechadas = () => acao(() => axios.put(`/exames/${exame.id}/gestao`, { inscricoes_fechadas: !exame.inscricoes_fechadas }), exame.inscricoes_fechadas ? 'Inscrições reabertas.' : 'Inscrições fechadas.');
  const alternar = (id) => setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const aPagar = sel.filter((c) => c.status_inscricao !== 'desistiu' && c.financeiro.taxa.saldo > 0);

  return (
    <>
      <AvisoSemTaxa candidatos={candidatos} onDefinir={onDefinirTaxas} />
      <Totais t={totais} />
      <div style={cardEstilo}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          {aberto && <button style={{ ...btnVerde, opacity: exame.inscricoes_fechadas ? 0.5 : 1 }} disabled={exame.inscricoes_fechadas} onClick={onAdicionar}>+ Adicionar candidatos</button>}
          {aberto && <button style={btnCinza} disabled={salvando} onClick={alternarFechadas}>{exame.inscricoes_fechadas ? 'Reabrir inscrições' : 'Fechar inscrições'}</button>}
          <button style={btnCinza} onClick={() => csvCandidatos(exame, visiveis)}>CSV</button>
          <button style={btnCinza} onClick={() => abrirImpressao(exame.id, 'completa', { ...f, ordem: ordem.coluna, desc: ordem.desc ? '1' : '' })}>Imprimir / PDF</button>
          <button style={btnCinza} onClick={() => window.open(`/relatorio/exame-faixa?arte_marcial_id=${exame.arte_marcial_id}&exame_id=${exame.id}`, '_blank')}>Relatório de carência</button>
          {exame.inscricoes_fechadas && <Selo cor="#c62828">Inscrições fechadas</Selo>}
        </div>
        {erro && <p style={{ color: '#c62828', fontSize: 13 }}>{erro}</p>}
        {aviso && <p style={{ color: '#2e7d32', fontSize: 13 }}>{aviso}</p>}
        <Filtros candidatos={candidatos} f={f} setF={setF} />
        {sel.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#e3f2fd', padding: 8, borderRadius: 6, marginBottom: 8, flexWrap: 'wrap', fontSize: 13 }}>
            <strong>{sel.length} selecionado(s)</strong>
            {aberto && <button style={btnCinza} disabled={salvando || !sel.some((c) => c.status_inscricao === 'indicado')} onClick={confirmar}>Confirmar inscrição</button>}
            <button style={btnCinza} disabled={salvando || !aPagar.length} onClick={() => setModalPagar({ ids: aPagar.map((c) => c.id), total: aPagar.reduce((s, c) => s + c.financeiro.taxa.saldo, 0), forma: 'pix', data: dados.hoje })}>Marcar taxa como paga</button>
            <button style={btnCinza} onClick={() => csvCandidatos(exame, sel)}>Exportar CSV</button>
          </div>
        )}
        <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{visiveis.length} de {candidatos.length} candidato(s)</div>
        {candidatos.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>Nenhum candidato ainda. Use "+ Adicionar candidatos" para trazer os indicados de uma vez.</p>}

        {celular ? visiveis.map((c) => (
          <div key={c.id} style={{ borderTop: '1px solid #eee', padding: '10px 0', opacity: c.status_inscricao === 'desistiu' ? 0.5 : 1 }}>
            <div onClick={() => onAbrir(c.id)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ fontSize: 14 }}>{c.aluno.nome}</strong><Selo cor={SITUACAO[c.financeiro.taxa.situacao].cor}>{SITUACAO[c.financeiro.taxa.situacao].label}</Selo></div>
              <div style={{ fontSize: 12, margin: '4px 0' }}><Faixa faixa={c.faixa_atual} /> → <Faixa faixa={c.faixa_pretendida} /></div>
              <div style={{ fontSize: 12, color: '#666' }}><span style={{ color: corCarencia(c.carencia) }}>{textoCarencia(c.carencia)} aulas</span> · pago {moeda(c.financeiro.taxa.pago)} de {moeda(c.financeiro.taxa.devido)} · {INSCRICAO[c.status_inscricao].label}</div>
            </div>
            {c.status_inscricao !== 'desistiu' && saldoTotal(c) > 0 && <button style={{ ...btnVerde, marginTop: 8, width: '100%', padding: 10 }} onClick={() => onAbrir(c.id, true)}>Registrar pagamento ({moeda(saldoTotal(c))})</button>}
          </div>
        )) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f9f9f9' }}>
                <th style={thEstilo}><input type="checkbox" aria-label="Marcar todos" checked={visiveis.length > 0 && sel.length === visiveis.length} onChange={(e) => setMarcados(e.target.checked ? new Set(visiveis.map((c) => c.id)) : new Set())} /></th>
                {COLUNAS.map(([id, rotulo]) => {
                  const ativa = ordem.coluna === id;
                  return (
                    <th key={id} style={thEstilo} aria-sort={ativa ? (ordem.desc ? 'descending' : 'ascending') : 'none'}>
                      <button onClick={() => clicarColuna(id)} title="Clique para ordenar" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', textTransform: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', color: ativa ? '#1565c0' : 'inherit', fontWeight: ativa ? 700 : 'inherit' }}>
                        {rotulo} <span aria-hidden="true" style={{ opacity: ativa ? 1 : 0.35 }}>{ativa ? (ordem.desc ? '▼' : '▲') : '↕'}</span>
                      </button>
                    </th>
                  );
                })}
                <th style={thEstilo} />
              </tr></thead>
              <tbody>
                {visiveis.map((c) => (
                  <tr key={c.id} style={{ opacity: c.status_inscricao === 'desistiu' ? 0.5 : 1, background: c.carencia?.situacao === 'abaixo' ? '#fffaf5' : undefined }}>
                    <td style={tdEstilo}><input type="checkbox" aria-label={`Marcar ${c.aluno.nome}`} checked={marcados.has(c.id)} onChange={() => alternar(c.id)} /></td>
                    <td style={tdEstilo}><button style={{ ...btnLink(), fontSize: 13, textAlign: 'left' }} onClick={() => onAbrir(c.id)}>{c.aluno.nome}</button></td>
                    <td style={{ ...tdEstilo, fontSize: 12, color: '#666' }}>{c.externo ? `Externo${c.externo.origem ? ` (${c.externo.origem})` : ''}` : c.turma?.nome || '—'}</td>
                    <td style={{ ...tdEstilo, whiteSpace: 'nowrap' }}><Faixa faixa={c.faixa_atual} /> → <Faixa faixa={c.faixa_pretendida} /></td>
                    <td style={{ ...tdEstilo, color: corCarencia(c.carencia), fontWeight: c.carencia?.situacao === 'abaixo' ? 700 : 400, whiteSpace: 'nowrap' }}>{textoCarencia(c.carencia)}</td>
                    <td style={{ ...tdEstilo, whiteSpace: 'nowrap' }}>{moeda(c.financeiro.taxa.devido)}</td>
                    <td style={{ ...tdEstilo, whiteSpace: 'nowrap' }}>{moeda(c.financeiro.taxa.pago)}{c.financeiro.taxa.credito > 0 && <span title={`Crédito a devolver: ${moeda(c.financeiro.taxa.credito)}`} style={{ color: '#c62828' }}> ⚠</span>}</td>
                    <td style={tdEstilo}><Selo cor={SITUACAO[c.financeiro.taxa.situacao].cor}>{SITUACAO[c.financeiro.taxa.situacao].label}</Selo></td>
                    <td style={tdEstilo}>{textoPedido(c)}</td>
                    <td style={tdEstilo}><Selo cor={INSCRICAO[c.status_inscricao].cor}>{INSCRICAO[c.status_inscricao].label}</Selo></td>
                    <td style={{ ...tdEstilo, whiteSpace: 'nowrap' }}>{c.status_inscricao !== 'desistiu' && saldoTotal(c) > 0 && <button style={btnLink('#2e7d32')} onClick={() => onAbrir(c.id, true)}>Registrar pagamento</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modalPagar && (
        <Modal titulo="Marcar taxa como paga" largura={380} onFechar={() => setModalPagar(null)}>
          <p style={{ fontSize: 13, marginTop: 0 }}>Registra o saldo da taxa de {modalPagar.ids.length} candidato(s), total de <strong>{moeda(modalPagar.total)}</strong>.</p>
          <Campo rotulo="Forma"><select value={modalPagar.forma} onChange={(e) => setModalPagar({ ...modalPagar, forma: e.target.value })} style={estiloInput}>{Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
          <Campo rotulo="Data" style={{ margin: '10px 0' }}><input type="date" max={dados.hoje} value={modalPagar.data} onChange={(e) => setModalPagar({ ...modalPagar, data: e.target.value })} style={estiloInput} /></Campo>
          <button style={{ ...btnVerde, width: '100%' }} onClick={pagar}>Confirmar pagamentos</button>
        </Modal>
      )}
    </>
  );
}

export function AbaFaixas({ dados, recarregar, onAbrir }) {
  const { exame, candidatos } = dados;
  const [erro, setErro] = useState('');
  const grupos = consolidarFaixas(candidatos);
  const pedidos = ativos(candidatos).filter((c) => c.quer_comprar === 'sim');
  const semResposta = ativos(candidatos).filter((c) => c.quer_comprar === 'sem_resposta');
  const entregar = async (c, entregue) => {
    setErro('');
    try { await axios.put(`/exames/${exame.id}/pedidos-faixa/${c.id}`, { entregue }); await recarregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Não foi possível salvar.'); }
  };
  return (
    <>
      <div style={cardEstilo}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>Pedido consolidado</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnCinza} disabled={!grupos.length} onClick={() => csvFaixas(exame, candidatos)}>CSV</button>
            <button style={btnCinza} disabled={!grupos.length} onClick={() => abrirImpressao(exame.id, 'faixas')}>Imprimir / PDF</button>
          </div>
        </div>
        {exame.prazo_pedido_faixa && <p style={{ fontSize: 12, color: dados.hoje > exame.prazo_pedido_faixa ? '#c62828' : '#888' }}>Prazo do pedido: {formatData(exame.prazo_pedido_faixa)}</p>}
        {!grupos.length ? <p style={{ color: '#888', fontSize: 13 }}>Nenhum pedido de faixa ainda.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
            <thead><tr style={{ background: '#f9f9f9' }}>{['Cor', 'Tamanho', 'Tipo', 'Quantidade', 'Entregues', 'Total'].map((h) => <th key={h} style={thEstilo}>{h}</th>)}</tr></thead>
            <tbody>
              {grupos.map((g) => <tr key={`${g.faixa?.id}${g.tamanho}${g.tipo}`}><td style={tdEstilo}><Faixa faixa={g.faixa} /></td><td style={tdEstilo}>{g.tamanho}</td><td style={tdEstilo}>{g.tipo || '—'}</td><td style={tdEstilo}>{g.quantidade}</td><td style={tdEstilo}>{g.entregues}</td><td style={tdEstilo}>{moeda(g.total)}</td></tr>)}
              <tr style={{ fontWeight: 700 }}><td style={tdEstilo} colSpan={3}>Total</td><td style={tdEstilo}>{pedidos.length}</td><td style={tdEstilo}>{pedidos.filter((c) => c.pedido.entregue).length}</td><td style={tdEstilo}>{moeda(grupos.reduce((s, g) => s + g.total, 0))}</td></tr>
            </tbody>
          </table>
        )}
      </div>
      {pedidos.length > 0 && (
        <div style={cardEstilo}>
          <h3 style={{ marginTop: 0 }}>Entrega</h3>
          {erro && <p style={{ color: '#c62828', fontSize: 13 }}>{erro}</p>}
          {pedidos.map((c) => (
            <div key={c.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderTop: '1px solid #f0f0f0', padding: '8px 0', fontSize: 13 }}>
              <label style={{ flex: '1 1 200px' }}><input type="checkbox" disabled={exame.status === 'cancelado'} checked={c.pedido.entregue} onChange={(e) => entregar(c, e.target.checked)} /> {c.aluno.nome}</label>
              <Faixa faixa={c.pedido.faixa} /><span>tam. {c.pedido.tamanho}{c.pedido.tipo && ` · ${c.pedido.tipo}`}</span>
              <Selo cor={SITUACAO[c.financeiro.faixa.situacao].cor}>{SITUACAO[c.financeiro.faixa.situacao].label}</Selo>
              {c.pedido.entregue_em && <span style={{ color: '#888', fontSize: 12 }}>entregue em {formatData(c.pedido.entregue_em)}</span>}
            </div>
          ))}
        </div>
      )}
      {semResposta.length > 0 && (
        <div style={cardEstilo}>
          <h3 style={{ marginTop: 0 }}>Sem resposta ({semResposta.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{semResposta.map((c) => <button key={c.id} style={btnCinza} onClick={() => onAbrir(c.id)}>{c.aluno.nome}</button>)}</div>
        </div>
      )}
    </>
  );
}

export function AbaFinanceiro({ dados, onAbrir, onDefinirTaxas }) {
  const { exame, candidatos, totais, hoje } = dados;
  const [copiado, setCopiado] = useState(null);
  const lista = pendentes(candidatos);
  const atraso = diasAtraso(exame, hoje);
  return (
    <>
      <AvisoSemTaxa candidatos={candidatos} onDefinir={onDefinirTaxas} />
      <Totais t={totais} />
      <div style={cardEstilo}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Pendências ({lista.length})</h3>
          <button style={btnCinza} disabled={!lista.length} onClick={() => abrirImpressao(exame.id, 'pendencias')}>Imprimir / PDF</button>
        </div>
        {!lista.length ? <p style={{ color: '#888', fontSize: 13 }}>Nenhuma pendência.</p> : (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f9f9f9' }}>{['Aluno', 'Responsável', 'Telefone', 'Devido', 'Pago', 'Saldo', 'Atraso', ''].map((h, i) => <th key={i} style={thEstilo}>{h}</th>)}</tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td style={tdEstilo}><button style={{ ...btnLink(), fontSize: 13, textAlign: 'left' }} onClick={() => onAbrir(c.id)}>{c.aluno.nome}</button></td>
                    <td style={{ ...tdEstilo, fontSize: 12 }}>{c.responsavel}</td>
                    <td style={{ ...tdEstilo, whiteSpace: 'nowrap' }}>{c.aluno.telefone || '—'}</td>
                    <td style={tdEstilo}>{moeda(c.financeiro.taxa.devido + c.financeiro.faixa.devido)}</td>
                    <td style={tdEstilo}>{moeda(c.financeiro.taxa.pago + c.financeiro.faixa.pago)}</td>
                    <td style={{ ...tdEstilo, fontWeight: 700 }}>{moeda(saldoTotal(c))}</td>
                    <td style={{ ...tdEstilo, color: atraso ? '#c62828' : '#888', whiteSpace: 'nowrap' }}>{atraso ? `${atraso} dia(s)` : '—'}</td>
                    <td style={{ ...tdEstilo, whiteSpace: 'nowrap' }}>
                      <button style={btnLink('#2e7d32')} onClick={() => onAbrir(c.id, true)}>Pagamento</button>
                      <button style={btnLink()} onClick={async () => setCopiado({ id: c.id, ok: await copiarTexto(textoCobranca(exame, c)) })}>{copiado?.id === c.id ? (copiado.ok ? 'Copiado ✓' : 'Falhou') : 'Copiar cobrança'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export function AbaChamada({ dados, recarregar }) {
  const { exame, candidatos } = dados;
  const [erro, setErro] = useState('');
  const lista = ativos(candidatos);
  const marcar = async (ids, presenca) => {
    setErro('');
    try { await axios.patch(`/exames/${exame.id}/candidatos`, { ids, presenca }); await recarregar(); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Não foi possível salvar.'); }
  };
  const semMarcar = lista.filter((c) => !c.presenca);
  const travado = exame.status === 'cancelado';
  return (
    <div style={cardEstilo}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div><h3 style={{ margin: 0 }}>Lista de chamada</h3><span style={{ fontSize: 12, color: '#888' }}>{lista.filter((c) => c.presenca === 'presente').length} presente(s) · {lista.filter((c) => c.presenca === 'ausente').length} ausente(s) · {semMarcar.length} sem marcar</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnCinza} disabled={travado || !semMarcar.length} onClick={() => marcar(semMarcar.map((c) => c.id), 'presente')}>Marcar restantes presentes</button>
          <button style={btnCinza} disabled={!lista.length} onClick={() => abrirImpressao(exame.id, 'chamada')}>Imprimir / PDF</button>
        </div>
      </div>
      {erro && <p style={{ color: '#c62828', fontSize: 13 }}>{erro}</p>}
      {!lista.length && <p style={{ color: '#888', fontSize: 13 }}>Nenhum candidato.</p>}
      {lista.map((c) => (
        <div key={c.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderTop: '1px solid #f0f0f0', padding: '8px 0', fontSize: 13 }}>
          <span style={{ flex: '1 1 180px' }}>{c.aluno.nome}</span>
          <span><Faixa faixa={c.faixa_atual} /> → <Faixa faixa={c.faixa_pretendida} /></span>
          <span style={{ display: 'flex', gap: 6 }}>
            {[['presente', 'Presente', '#2e7d32'], ['ausente', 'Ausente', '#c62828']].map(([v, r, cor]) => (
              <button key={v} disabled={travado || c.graduado} onClick={() => marcar([c.id], c.presenca === v ? null : v)} style={{ ...btnCinza, borderColor: cor, color: c.presenca === v ? '#fff' : cor, background: c.presenca === v ? cor : '#fff' }}>{r}</button>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AbaResultado({ dados, recarregar }) {
  const { exame, candidatos } = dados;
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState(null);
  const [salvando, setSalvando] = useState(null);
  const lista = ativos(candidatos);
  const gravar = async (c, resultado) => {
    setErro(''); setSalvando(c.id); setConfirmando(null);
    try { await axios.post(`/exames/${exame.id}/resultado`, { exame_participante_id: c.id, resultado }); }
    catch (ex) { setErro(`${c.aluno.nome}: ${ex.response?.data?.erro || 'Não foi possível salvar.'}`); }
    finally { await recarregar(); setSalvando(null); }
  };
  return (
    <div style={cardEstilo}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Resultado</h3>
        {exame.usa_avaliacao && <button style={btnCinza} onClick={() => window.open(`/exame/${exame.id}/relatorio-impressao`, '_blank')}>Relatório final</button>}
      </div>
      <p style={{ fontSize: 12, color: '#888' }}>Aprovar gradua o aluno na faixa pretendida, com a data do exame ({formatData(exame.data)}), e encerra a indicação.{exame.usa_avaliacao && ' Só é liberado com todas as fases finalizadas.'}</p>
      {erro && <p style={{ color: '#c62828', fontSize: 13 }}>{erro}</p>}
      {!lista.length && <p style={{ color: '#888', fontSize: 13 }}>Nenhum candidato.</p>}
      {lista.map((c) => {
        const travado = exame.status === 'cancelado' || c.presenca === 'ausente' || !!salvando;
        return (
          <div key={c.id} style={{ borderTop: '1px solid #f0f0f0', padding: '8px 0', fontSize: 13 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span style={{ flex: '1 1 180px' }}>{c.aluno.nome}{c.presenca === 'ausente' && <span style={{ color: '#c62828', fontSize: 11 }}> ausente</span>}</span>
              <span><Faixa faixa={c.faixa_atual} /> → <Faixa faixa={c.faixa_pretendida} /></span>
              {exame.usa_avaliacao && <span style={{ minWidth: 110, color: '#555' }}>{c.nota_final != null ? <>Nota <strong>{c.nota_final}</strong></> : `${c.fases_finalizadas}/${c.fases_total} fases`}</span>}
              {exame.usa_avaliacao && <button style={btnLink()} onClick={() => window.open(`/exame/${exame.id}/ficha/${c.id}`, '_blank')}>Ficha</button>}
              {c.graduado ? <Selo cor="#2e7d32">Aprovado e graduado ✓</Selo> : c.resultado ? (
                <><Selo cor={c.resultado === 'aprovado' ? '#2e7d32' : '#c62828'}>{c.resultado === 'aprovado' ? 'Aprovado (externo)' : 'Não aprovado'}</Selo><button style={btnLink()} disabled={travado} onClick={() => gravar(c, null)}>desfazer</button></>
              ) : (
                <span style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...btnVerde, opacity: travado || !c.pode_aprovar ? 0.45 : 1 }} disabled={travado || !c.pode_aprovar} title={c.pode_aprovar ? '' : 'Há fases não finalizadas'} onClick={() => setConfirmando(c.id)}>{salvando === c.id ? '...' : 'Aprovado'}</button>
                  <button style={btnCinza} disabled={travado} onClick={() => gravar(c, 'nao_aprovado')}>Não aprovado</button>
                </span>
              )}
            </div>
            {confirmando === c.id && (
              <div style={{ background: '#e8f5e9', padding: 10, borderRadius: 6, marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>{c.externo ? 'Aprovar' : 'Graduar'} {c.aluno.nome} na faixa <strong>{c.faixa_pretendida?.nome}</strong>?{c.externo && ' Externo: não gera graduação no sistema.'}</span>
                <button style={btnCinza} onClick={() => setConfirmando(null)}>Voltar</button>
                <button style={btnPrimario} onClick={() => gravar(c, 'aprovado')}>{c.externo ? 'Confirmar aprovação' : 'Confirmar graduação'}</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Janela de inclusão + painel do candidato, por cima de qualquer aba
export function Sobreposicoes({ dados, recarregar, admin, faixas, aberto, setAberto, adicionando, setAdicionando }) {
  const candidato = aberto && dados.candidatos.find((c) => c.id === aberto.id);
  return (
    <>
      {adicionando && <AdicionarCandidatos exameId={dados.exame.id} faixasArte={faixas} admin={admin} onFechar={() => setAdicionando(false)} onIncluido={recarregar} />}
      {candidato && <FichaCandidato key={candidato.id} admin={admin} exame={dados.exame} candidato={candidato} faixas={faixas} hoje={dados.hoje} abrirPagamento={aberto.pagamento} onFechar={() => setAberto(null)} onMudou={recarregar} />}
    </>
  );
}
