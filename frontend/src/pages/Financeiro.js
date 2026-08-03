import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GraficoArea from '../components/GraficoArea';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnVerde = { background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnAzul = { background: '#1565c0', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnPerigo = { background: '#c62828', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnCinza = { background: 'none', border: '1px solid #ddd', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const cardEstilo = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' };
const thEstilo = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 };

const PERIODICIDADE_LABEL = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
const STATUS_ASSINATURA_LABEL = { ativa: 'Ativa', pausada: 'Pausada', finalizada: 'Finalizada' };

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatData(iso) {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}

function statusFatura(f) {
  if (f.status === 'pendente' && f.data_vencimento < hojeISO()) return 'vencida';
  return f.status;
}

const STATUS_FATURA_COR = { pendente: '#ef6c00', vencida: '#c62828', pago: '#2e7d32', cancelado: '#888' };
const STATUS_FATURA_BG = { pendente: '#fff3e0', vencida: '#ffebee', pago: '#e8f5e9', cancelado: '#f0f0f0' };
const STATUS_FATURA_LABEL = { pendente: 'Pendente', vencida: 'Vencida', pago: 'Pago', cancelado: 'Cancelado' };

function Modal({ titulo, onFechar, children, largura = 440 }) {
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

function StatTile({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 8, padding: '16px 20px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 'bold', color: '#1e2a38', marginTop: 6 }}>{value}</div>
    </div>
  );
}

function formatarMoeda(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Painel ──────────────────────────────────────────────────────────────────

function PainelFinanceiro() {
  const [dados, setDados] = useState(null);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    axios.get(`/financeiro/painel?ano=${ano}`).then(r => setDados(r.data));
  }, [ano]);

  if (!dados) return <p style={{ color: '#888' }}>Carregando...</p>;

  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual, anoAtual - 1, anoAtual - 2, anoAtual - 3, anoAtual - 4];

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatTile label="Em Aberto" value={dados.em_aberto} color="#ef6c00" bg="#fff3e0" />
        <StatTile label="Vencidas" value={dados.vencidas} color="#c62828" bg="#ffebee" />
        <StatTile label="Ganhos este mês" value={formatarMoeda(dados.ganhos_mes_atual)} color="#2e7d32" bg="#e8f5e9" />
        <StatTile label="Ganhos mês passado" value={formatarMoeda(dados.ganhos_mes_passado)} color="#1565c0" bg="#e3f2fd" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16 }}>
        <div style={{ ...cardEstilo, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 14 }}>Resumo Faturas {ano}</strong>
            <div style={{ display: 'flex', gap: 4 }}>
              {anos.map(a => (
                <button key={a} onClick={() => setAno(a)}
                  style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer',
                    background: ano === a ? '#1e2a38' : '#fff', color: ano === a ? '#fff' : '#555' }}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <GraficoArea serie={dados.serie} />
        </div>

        <div style={{ ...cardEstilo, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1e2a38' }}>{dados.total_faturas}</div>
            <div style={{ fontSize: 12, color: '#888' }}>TOTAL FATURAS</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1e2a38' }}>{formatarMoeda(dados.total_ganho)}</div>
            <div style={{ fontSize: 12, color: '#888' }}>TOTAL GANHO</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1e2a38' }}>{dados.total_planos}</div>
            <div style={{ fontSize: 12, color: '#888' }}>PLANOS</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1e2a38' }}>{dados.total_assinaturas}</div>
            <div style={{ fontSize: 12, color: '#888' }}>ASSINATURAS ATIVAS</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1e2a38' }}>{dados.pct_pagas_em_atraso}%</div>
            <div style={{ fontSize: 12, color: '#888' }}>PAGAS EM ATRASO</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Planos ──────────────────────────────────────────────────────────────────

const formPlanoVazio = { nome: '', valor: '', periodicidade: 'mensal', descricao: '' };

function ListaPlanos() {
  const [planos, setPlanos] = useState([]);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(formPlanoVazio);
  const [erro, setErro] = useState('');

  const carregar = () => { axios.get(`/planos?todos=${mostrarTodos}`).then(r => setPlanos(r.data)); };
  useEffect(carregar, [mostrarTodos]);

  const abrirNovo = () => { setEditandoId(null); setForm(formPlanoVazio); setModalAberto(true); setErro(''); };
  const abrirEdicao = (p) => {
    setEditandoId(p.id);
    setForm({ nome: p.nome, valor: p.valor, periodicidade: p.periodicidade, descricao: p.descricao || '' });
    setModalAberto(true);
    setErro('');
  };

  const salvar = async (e) => {
    e.preventDefault(); setErro('');
    try {
      if (editandoId) await axios.put(`/planos/${editandoId}`, form);
      else await axios.post('/planos', form);
      setModalAberto(false);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  const desativar = async (p) => { await axios.delete(`/planos/${p.id}`); carregar(); };
  const ativar = async (p) => { await axios.put(`/planos/${p.id}`, { ativo: true }); carregar(); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
          <input type="checkbox" checked={mostrarTodos} onChange={e => setMostrarTodos(e.target.checked)} />
          Mostrar inativos
        </label>
        <button style={btnPrimario} onClick={abrirNovo}>+ Novo Plano</button>
      </div>

      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={thEstilo}>Nome</th>
              <th style={thEstilo}>Valor</th>
              <th style={thEstilo}>Ciclo de Pagamento</th>
              <th style={thEstilo}>Status</th>
              <th style={thEstilo}></th>
            </tr>
          </thead>
          <tbody>
            {planos.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhum plano cadastrado.</td></tr>
            )}
            {planos.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px', fontSize: 14 }}>{p.nome}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{formatarMoeda(p.valor)}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{PERIODICIDADE_LABEL[p.periodicidade]}</td>
                <td style={{ padding: '10px 16px', fontSize: 12 }}>
                  <span style={{ color: p.ativo ? '#2e7d32' : '#c62828', fontWeight: 700 }}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => abrirEdicao(p)} style={btnAzul}>Editar</button>
                    {p.ativo
                      ? <button onClick={() => desativar(p)} style={btnPerigo}>Desativar</button>
                      : <button onClick={() => ativar(p)} style={btnVerde}>Ativar</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <Modal titulo={editandoId ? 'Editar Plano' : 'Novo Plano de Pagamento'} onFechar={() => setModalAberto(false)}>
          <form onSubmit={salvar}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Nome</label>
              <input required placeholder="Nome do plano" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={estiloInput} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Valor (R$)</label>
                <input type="number" step="0.01" required value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={estiloInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Ciclo de pagamento</label>
                <select value={form.periodicidade} onChange={e => setForm(f => ({ ...f, periodicidade: e.target.value }))} style={estiloInput}>
                  {Object.entries(PERIODICIDADE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Descrição (opcional)</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={estiloInput} />
            </div>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setModalAberto(false)} style={btnCinza}>Cancelar</button>
              <button type="submit" style={btnPrimario}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Assinaturas ─────────────────────────────────────────────────────────────

const formAssinaturaVazio = { aluno_id: '', plano_id: '', dia_vencimento: 5, data_inicio: '', observacao: '' };

function ListaAssinaturas({ onVerAluno }) {
  const [assinaturas, setAssinaturas] = useState([]);
  const [filtro, setFiltro] = useState('ativa');
  const [alunos, setAlunos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ ...formAssinaturaVazio, data_inicio: hojeISO() });
  const [erro, setErro] = useState('');

  const carregar = () => { axios.get(`/assinaturas?status=${filtro}`).then(r => setAssinaturas(r.data)); };
  useEffect(carregar, [filtro]);
  useEffect(() => {
    axios.get('/usuarios?role=aluno').then(r => setAlunos(r.data));
    axios.get('/planos').then(r => setPlanos(r.data));
  }, []);

  const abrirNova = () => { setForm({ ...formAssinaturaVazio, data_inicio: hojeISO() }); setModalAberto(true); setErro(''); };

  const salvar = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await axios.post('/assinaturas', form);
      setModalAberto(false);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  const pausar = async (a) => { await axios.put(`/assinaturas/${a.id}/pausar`); carregar(); };
  const reativar = async (a) => { await axios.put(`/assinaturas/${a.id}/reativar`); carregar(); };
  const finalizar = async (a) => { await axios.put(`/assinaturas/${a.id}/finalizar`); carregar(); };
  const gerarFatura = async (a) => {
    const r = await axios.post(`/assinaturas/${a.id}/gerar-fatura`);
    alert(r.data.criada
      ? `Fatura gerada para ${formatData(r.data.fatura.data_vencimento)}. Veja na aba Faturas.`
      : `Essa assinatura já tem uma fatura pendente (venc. ${formatData(r.data.fatura.data_vencimento)}).`);
    carregar();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden' }}>
          {[['ativa', 'Ativas'], ['pausada', 'Pausadas'], ['finalizada', 'Finalizadas'], ['todas', 'Todas']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)}
              style={{ padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 13,
                background: filtro === v ? '#1e2a38' : '#fff', color: filtro === v ? '#fff' : '#555' }}>
              {l}
            </button>
          ))}
        </div>
        <button style={btnPrimario} onClick={abrirNova}>+ Nova Assinatura</button>
      </div>

      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={thEstilo}>Nome</th>
              <th style={thEstilo}>Plano</th>
              <th style={thEstilo}>Dia Vencimento</th>
              <th style={thEstilo}>Status</th>
              <th style={thEstilo}></th>
            </tr>
          </thead>
          <tbody>
            {assinaturas.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhuma assinatura encontrada.</td></tr>
            )}
            {assinaturas.map(a => (
              <tr key={a.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px', fontSize: 14 }}>
                  <button onClick={() => onVerAluno?.(a.aluno_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1565c0', fontSize: 14 }}>
                    {a.Aluno?.nome}
                  </button>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{a.Plano?.nome}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{a.dia_vencimento}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: a.status === 'ativa' ? '#2e7d32' : a.status === 'pausada' ? '#ef6c00' : '#888' }}>
                  {STATUS_ASSINATURA_LABEL[a.status]}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {a.status === 'ativa' && <button onClick={() => gerarFatura(a)} style={btnAzul}>Gerar Fatura</button>}
                    {a.status === 'ativa' && <button onClick={() => pausar(a)} style={{ ...btnCinza, color: '#ef6c00', borderColor: '#ef6c00' }}>Pausar</button>}
                    {a.status === 'pausada' && <button onClick={() => reativar(a)} style={btnVerde}>Reativar</button>}
                    {a.status !== 'finalizada' && <button onClick={() => finalizar(a)} style={btnPerigo}>Finalizar</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <Modal titulo="Nova Assinatura" onFechar={() => setModalAberto(false)}>
          <form onSubmit={salvar}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Aluno</label>
              <select required value={form.aluno_id} onChange={e => setForm(f => ({ ...f, aluno_id: e.target.value }))} style={estiloInput}>
                <option value="">Selecione...</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Plano</label>
              <select required value={form.plano_id} onChange={e => setForm(f => ({ ...f, plano_id: e.target.value }))} style={estiloInput}>
                <option value="">Selecione...</option>
                {planos.map(p => <option key={p.id} value={p.id}>{p.nome} — {formatarMoeda(p.valor)} ({PERIODICIDADE_LABEL[p.periodicidade]})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Dia de vencimento</label>
                <input type="number" min={1} max={31} required value={form.dia_vencimento} onChange={e => setForm(f => ({ ...f, dia_vencimento: e.target.value }))} style={estiloInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Início</label>
                <input type="date" required value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} style={estiloInput} />
              </div>
            </div>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setModalAberto(false)} style={btnCinza}>Cancelar</button>
              <button type="submit" style={btnPrimario}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Faturas ─────────────────────────────────────────────────────────────────

function ModalPagarFatura({ fatura, onFechar, onPago }) {
  const [juros, setJuros] = useState(0);
  const [desconto, setDesconto] = useState(parseFloat(fatura.desconto) || 0);
  const [dataPagamento, setDataPagamento] = useState(hojeISO());
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const totalDevido = parseFloat(fatura.valor) - (parseFloat(desconto) || 0) + (parseFloat(juros) || 0);
  const [valorPago, setValorPago] = useState(totalDevido);

  useEffect(() => { setValorPago(totalDevido); }, [juros, desconto]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmar = async () => {
    setSalvando(true); setErro('');
    try {
      await axios.post('/pagamentos', {
        mensalidade_id: fatura.id, valor_pago: valorPago, data_pagamento: dataPagamento,
        forma_pagamento: formaPagamento, juros, desconto,
      });
      onPago();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao registrar pagamento'); }
    finally { setSalvando(false); }
  };

  return (
    <Modal titulo={`Pagar Fatura #${fatura.id.slice(0, 8).toUpperCase()}`} onFechar={onFechar}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
        <div><div style={{ color: '#888', fontSize: 11 }}>VENCIMENTO</div>{formatData(fatura.data_vencimento)}</div>
        <div><div style={{ color: '#888', fontSize: 11 }}>VALOR ORIGINAL</div>{formatarMoeda(fatura.valor)}</div>
        <div><div style={{ color: '#888', fontSize: 11 }}>STATUS</div><span style={{ color: STATUS_FATURA_COR[statusFatura(fatura)] }}>{STATUS_FATURA_LABEL[statusFatura(fatura)]}</span></div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Juros (R$)</label>
          <input type="number" step="0.01" value={juros} onChange={e => setJuros(e.target.value)} style={estiloInput} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Desconto (R$)</label>
          <input type="number" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} style={estiloInput} />
        </div>
      </div>
      <div style={{ marginBottom: 12, fontSize: 14 }}>
        <strong>Total Devido: {formatarMoeda(totalDevido)}</strong>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Data do Pagamento</label>
          <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} style={estiloInput} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Valor do Pagamento</label>
          <input type="number" step="0.01" value={valorPago} onChange={e => setValorPago(e.target.value)} style={estiloInput} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Forma de pagamento</label>
        <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} style={estiloInput}>
          {['pix', 'dinheiro', 'cartao_debito', 'cartao_credito', 'transferencia'].map(f => (
            <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onFechar} style={btnCinza}>Cancelar</button>
        <button onClick={confirmar} disabled={salvando} style={btnVerde}>{salvando ? 'Pagando...' : '$ Pagar'}</button>
      </div>
    </Modal>
  );
}

function ModalRecibo({ fatura, onFechar }) {
  const [recibo, setRecibo] = useState(null);

  useEffect(() => { axios.get(`/mensalidades/${fatura.id}/recibo`).then(r => setRecibo(r.data)); }, [fatura.id]);

  return (
    <Modal titulo="Recibo de Pagamento" onFechar={onFechar} largura={480}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .recibo-print, .recibo-print * { visibility: visible; }
          .recibo-print { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      {!recibo ? <p style={{ color: '#888' }}>Carregando...</p> : (
        <div className="recibo-print" style={{ border: '1px solid #ddd', borderRadius: 6, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Recibo de Pagamento</h3>
            <span>Valor: <strong>{formatarMoeda(recibo.valor_pago)}</strong></span>
          </div>
          <p style={{ lineHeight: 1.7, fontSize: 14 }}>
            Recebemos de <strong>{recibo.aluno_nome}</strong> a quantia de <strong>{formatarMoeda(recibo.valor_pago)}</strong> referente
            ao pagamento da fatura <strong>#{recibo.numero}</strong> com data de vencimento em <strong>{formatData(recibo.data_vencimento)}</strong> da
            assinatura <strong>{PERIODICIDADE_LABEL[recibo.periodicidade] || 'avulsa'}</strong> do <strong>{recibo.plano_nome}</strong>.
          </p>
          <p style={{ fontSize: 13, color: '#555' }}>Em {formatData(recibo.data_pagamento)} · {recibo.forma_pagamento?.replace(/_/g, ' ')}</p>
          <div style={{ marginTop: 32, textAlign: 'right', fontSize: 12, color: '#888' }}>
            <div style={{ borderTop: '1px solid #ccc', display: 'inline-block', paddingTop: 4 }}>{recibo.escola_nome}</div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button onClick={onFechar} style={btnCinza}>Fechar</button>
        <button onClick={() => window.print()} style={btnPrimario}>🖨 Imprimir</button>
      </div>
    </Modal>
  );
}

function ModalGerarAntecipada({ onFechar, onGerada }) {
  const [assinaturas, setAssinaturas] = useState([]);
  const [assinaturaId, setAssinaturaId] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { axios.get('/assinaturas?status=ativa').then(r => setAssinaturas(r.data)); }, []);

  const gerar = async () => {
    if (!assinaturaId) return;
    const r = await axios.post(`/assinaturas/${assinaturaId}/gerar-fatura`);
    setMsg(r.data.criada
      ? `Fatura gerada para ${formatData(r.data.fatura.data_vencimento)}.`
      : `Já existe uma fatura pendente (venc. ${formatData(r.data.fatura.data_vencimento)}).`);
    onGerada();
  };

  return (
    <Modal titulo="Gerar Fatura Antecipada" onFechar={onFechar} largura={400}>
      <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>Para quando alguém quer pagar antes do vencimento normal ser atingido.</p>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Assinatura</label>
        <select value={assinaturaId} onChange={e => { setAssinaturaId(e.target.value); setMsg(''); }} style={estiloInput}>
          <option value="">Selecione...</option>
          {assinaturas.map(a => <option key={a.id} value={a.id}>{a.Aluno?.nome} — {a.Plano?.nome}</option>)}
        </select>
      </div>
      {msg && <p style={{ color: '#2e7d32', fontSize: 13 }}>{msg}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onFechar} style={btnCinza}>Fechar</button>
        <button onClick={gerar} disabled={!assinaturaId} style={btnPrimario}>Gerar</button>
      </div>
    </Modal>
  );
}

function ListaFaturas({ onVerAluno }) {
  const [faturas, setFaturas] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [modalPagar, setModalPagar] = useState(null);
  const [modalRecibo, setModalRecibo] = useState(null);
  const [modalGerar, setModalGerar] = useState(false);
  const POR_PAG = 10;

  const carregar = () => { axios.get('/mensalidades').then(r => setFaturas(r.data)); };
  useEffect(carregar, []);

  const desfazerPagamento = async (f) => {
    const pagamentoId = f.Pagamentos?.[0]?.id;
    if (!pagamentoId) return;
    await axios.delete(`/pagamentos/${pagamentoId}`);
    carregar();
  };

  const cancelar = async (f) => { await axios.put(`/mensalidades/${f.id}/cancelar`); carregar(); };

  const filtradas = faturas.filter(f => {
    const st = statusFatura(f);
    if (filtroStatus !== 'todas' && st !== filtroStatus) return false;
    if (busca && !(f.Aluno?.nome || '').toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAG));
  const slice = filtradas.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="Pesquisar por aluno..." value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(1); }}
            style={{ ...estiloInput, maxWidth: 240 }} />
          <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }} style={{ ...estiloInput, width: 150 }}>
            <option value="todas">Todos os status</option>
            {Object.entries(STATUS_FATURA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button style={btnVerde} onClick={() => setModalGerar(true)}>+ Gerar Antecipada</button>
      </div>

      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={thEstilo}>No.</th>
              <th style={thEstilo}>Nome</th>
              <th style={thEstilo}>Plano</th>
              <th style={thEstilo}>Vencimento</th>
              <th style={thEstilo}>Total Devido</th>
              <th style={thEstilo}>Pagamento</th>
              <th style={thEstilo}>Status</th>
              <th style={thEstilo}></th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhuma fatura encontrada.</td></tr>
            )}
            {slice.map(f => {
              const st = statusFatura(f);
              const totalDevido = parseFloat(f.valor) - parseFloat(f.desconto || 0) + parseFloat(f.juros || 0);
              const pagamento = f.Pagamentos?.[0];
              return (
                <tr key={f.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#888' }}>#{f.id.slice(0, 8).toUpperCase()}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                    <button onClick={() => onVerAluno?.(f.aluno_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1565c0', fontSize: 13 }}>
                      {f.Aluno?.nome}
                    </button>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{f.Plano?.nome || 'Avulsa'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{formatData(f.data_vencimento)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{formatarMoeda(totalDevido)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{pagamento ? formatData(pagamento.data_pagamento) : '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: STATUS_FATURA_BG[st], color: STATUS_FATURA_COR[st], fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      {STATUS_FATURA_LABEL[st]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {f.status === 'pendente' && <button onClick={() => setModalPagar(f)} style={btnVerde}>$ Pagar</button>}
                      {f.status === 'pendente' && <button onClick={() => cancelar(f)} style={btnPerigo}>✕ Cancelar</button>}
                      {f.status === 'pago' && <button onClick={() => setModalRecibo(f)} style={btnAzul}>Recibo</button>}
                      {f.status === 'pago' && <button onClick={() => desfazerPagamento(f)} style={btnPerigo}>↺ Desfazer</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#888' }}>
          <span>{filtradas.length} fatura{filtradas.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)} style={{ ...estiloInput, cursor: pagina <= 1 ? 'default' : 'pointer', opacity: pagina <= 1 ? 0.4 : 1 }}>‹</button>
            <span>{pagina} / {totalPaginas}</span>
            <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)} style={{ ...estiloInput, cursor: pagina >= totalPaginas ? 'default' : 'pointer', opacity: pagina >= totalPaginas ? 0.4 : 1 }}>›</button>
          </div>
        </div>
      </div>

      {modalPagar && (
        <ModalPagarFatura fatura={modalPagar} onFechar={() => setModalPagar(null)} onPago={() => { setModalPagar(null); carregar(); }} />
      )}
      {modalRecibo && <ModalRecibo fatura={modalRecibo} onFechar={() => setModalRecibo(null)} />}
      {modalGerar && <ModalGerarAntecipada onFechar={() => setModalGerar(false)} onGerada={carregar} />}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Financeiro({ onVerAluno }) {
  const [aba, setAba] = useState('painel');

  const ABAS = [
    ['painel', 'Painel'],
    ['planos', 'Planos'],
    ['assinaturas', 'Assinaturas'],
    ['faturas', 'Faturas'],
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {ABAS.map(([v, l]) => (
          <button key={v} onClick={() => setAba(v)}
            style={{ padding: '8px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13,
              background: aba === v ? '#1e2a38' : '#e0e0e0', color: aba === v ? '#fff' : '#333' }}>
            {l}
          </button>
        ))}
      </div>

      {aba === 'painel' && <PainelFinanceiro />}
      {aba === 'planos' && <ListaPlanos />}
      {aba === 'assinaturas' && <ListaAssinaturas onVerAluno={onVerAluno} />}
      {aba === 'faturas' && <ListaFaturas onVerAluno={onVerAluno} />}
    </div>
  );
}
