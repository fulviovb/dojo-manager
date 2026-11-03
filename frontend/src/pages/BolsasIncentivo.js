import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Modal, formatData, formatarMoeda, estiloInput, btnVerde, btnAzul, btnCinza, cardEstilo, thEstilo } from './IncentivoEsporte';
import { SERVER_ORIGIN } from '../components/Avatar';

// Aba "Bolsas": acompanhamento das bolsas JÁ RECEBIDAS (gastos comprovados e
// prestação de contas). A suplementação só aceita gasto do 2º semestre —
// o backend valida; aqui só orientamos o usuário.

const SITUACAO = {
  em_andamento: { label: 'Em andamento', cor: '#ef6c00', bg: '#fff3e0' },
  entregue: { label: 'Prestação entregue', cor: '#1565c0', bg: '#e3f2fd' },
  aprovada: { label: 'Aprovada', cor: '#2e7d32', bg: '#e8f5e9' },
  pendencia: { label: 'Com pendência', cor: '#c62828', bg: '#ffebee' },
};
const FONTE_LABEL = { bolsa: 'Bolsa', suplementacao: 'Suplementação' };
const td = { padding: '10px 14px', fontSize: 13, verticalAlign: 'top' };
const rotulo = { fontSize: 12, display: 'block', marginBottom: 4 };
const btnPerigo = { background: 'none', border: '1px solid #f5c6c6', color: '#c62828', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const diasAte = (iso) => Math.ceil((new Date(iso + 'T23:59:59') - new Date()) / 86400000);
const erroApi = (e) => e.response?.data?.erro || 'Erro ao salvar';

function Barra({ valor, total }) {
  const pct = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  const cor = pct >= 100 ? '#2e7d32' : pct >= 50 ? '#f9a825' : '#c62828';
  return (
    <div style={{ height: 6, background: '#eee', borderRadius: 3, marginTop: 4, width: 140 }}>
      <div style={{ height: 6, width: `${pct}%`, background: cor, borderRadius: 3 }} />
    </div>
  );
}

function CelulaVerba({ valor, gasto, falta }) {
  if (valor == null) return <span style={{ color: '#bbb' }}>Não recebeu</span>;
  return (
    <div>
      <div><strong>{formatarMoeda(gasto)}</strong> <span style={{ color: '#999' }}>de {formatarMoeda(valor)}</span></div>
      <Barra valor={gasto} total={parseFloat(valor)} />
      <div style={{ fontSize: 11, marginTop: 3, color: falta > 0 ? '#c62828' : '#2e7d32', fontWeight: 600 }}>
        {falta > 0 ? `Falta comprovar ${formatarMoeda(falta)}` : '✓ Comprovado'}
      </div>
    </div>
  );
}

function Indicador({ titulo, valor, detalhe, cor = '#1e2a38' }) {
  return (
    <div style={{ ...cardEstilo, padding: '14px 18px', flex: '1 1 180px' }}>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{titulo}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: cor, marginTop: 4 }}>{valor}</div>
      {detalhe && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{detalhe}</div>}
    </div>
  );
}

// ── Modal: dados da bolsa (criar/editar) ────────────────────────────────────

function ModalDadosBolsa({ bolsa, anoPadrao, onFechar, onSalvo }) {
  const [form, setForm] = useState(() => ({
    nome: bolsa?.nome || '', ano: bolsa?.ano || anoPadrao,
    valor_bolsa: bolsa?.valor_bolsa || '', data_recebimento_bolsa: bolsa?.data_recebimento_bolsa || '',
    valor_suplementacao: bolsa?.valor_suplementacao || '', data_recebimento_suplementacao: bolsa?.data_recebimento_suplementacao || '',
    situacao_prestacao: bolsa?.situacao_prestacao || 'em_andamento', observacao: bolsa?.observacao || '',
  }));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const salvar = async () => {
    setSalvando(true); setErro('');
    try {
      if (bolsa) await axios.put(`/incentivo-esporte/bolsas/${bolsa.id}`, form);
      else await axios.post('/incentivo-esporte/bolsas', form);
      onSalvo();
    } catch (e) { setErro(erroApi(e)); } finally { setSalvando(false); }
  };

  return (
    <Modal titulo={bolsa ? `Dados da bolsa — ${bolsa.nome}` : 'Nova bolsa'} onFechar={onFechar} largura={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 3 }}><label style={rotulo}>Atleta</label><input value={form.nome} onChange={set('nome')} style={estiloInput} /></div>
          <div style={{ flex: 1 }}><label style={rotulo}>Ano</label><input type="number" value={form.ano} onChange={set('ano')} style={estiloInput} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><label style={rotulo}>Valor da bolsa (R$)</label><input type="number" step="0.01" value={form.valor_bolsa} onChange={set('valor_bolsa')} style={estiloInput} /></div>
          <div style={{ flex: 1 }}><label style={rotulo}>Recebida em</label><input type="date" value={form.data_recebimento_bolsa} onChange={set('data_recebimento_bolsa')} style={estiloInput} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><label style={rotulo}>Suplementação (R$) — vazio se não recebeu</label><input type="number" step="0.01" value={form.valor_suplementacao} onChange={set('valor_suplementacao')} style={estiloInput} /></div>
          <div style={{ flex: 1 }}><label style={rotulo}>Recebida em</label><input type="date" value={form.data_recebimento_suplementacao} onChange={set('data_recebimento_suplementacao')} style={estiloInput} /></div>
        </div>
        <div>
          <label style={rotulo}>Situação da prestação de contas</label>
          <select value={form.situacao_prestacao} onChange={set('situacao_prestacao')} style={estiloInput}>
            {Object.entries(SITUACAO).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
        </div>
        <div><label style={rotulo}>Observação</label><textarea value={form.observacao} onChange={set('observacao')} rows={3} style={estiloInput} /></div>
        {erro && <div style={{ color: '#c62828', fontSize: 13 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onFechar} style={btnCinza}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={btnVerde}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: lançar/editar gasto ──────────────────────────────────────────────

function ModalGasto({ bolsa, gasto, categorias, onFechar, onSalvo }) {
  const temSup = bolsa.valor_suplementacao != null;
  const [form, setForm] = useState(() => gasto
    ? { fonte: gasto.fonte, categoria: gasto.categoria, descricao: gasto.descricao || '', valor: gasto.valor, data_despesa: gasto.data_despesa, observacao: gasto.observacao || '', arquivo: null }
    : { fonte: temSup ? 'suplementacao' : 'bolsa', categoria: categorias[0]?.valor || '', descricao: '', valor: '', data_despesa: hojeISO(), observacao: '', arquivo: null });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const periodo = bolsa.periodo_suplementacao;

  const salvar = async () => {
    setSalvando(true); setErro('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (k !== 'arquivo') fd.append(k, v ?? ''); });
      if (form.arquivo) fd.append('comprovante', form.arquivo);
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (gasto) await axios.put(`/incentivo-esporte/bolsas/${bolsa.id}/despesas/${gasto.id}`, fd, cfg);
      else await axios.post(`/incentivo-esporte/bolsas/${bolsa.id}/despesas`, fd, cfg);
      onSalvo();
    } catch (e) { setErro(erroApi(e)); } finally { setSalvando(false); }
  };

  return (
    <Modal titulo={gasto ? 'Editar gasto' : 'Novo gasto'} onFechar={onFechar} largura={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={rotulo}>Prestar contas na verba</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['suplementacao', 'bolsa'].filter(f => f === 'bolsa' || temSup).map(f => (
              <button key={f} onClick={() => setForm(x => ({ ...x, fonte: f }))}
                style={{ ...btnCinza, flex: 1, padding: '8px', fontWeight: 600, background: form.fonte === f ? '#1e2a38' : '#fff', color: form.fonte === f ? '#fff' : '#333' }}>
                {FONTE_LABEL[f]}
              </button>
            ))}
          </div>
          {form.fonte === 'suplementacao' && (
            <div style={{ fontSize: 12, color: '#ef6c00', marginTop: 6 }}>
              Só vale gasto feito entre {formatData(periodo.inicio)} e {formatData(periodo.fim)} (2º semestre).
            </div>
          )}
        </div>
        <div>
          <label style={rotulo}>Categoria (rubrica do edital)</label>
          <select value={form.categoria} onChange={set('categoria')} style={estiloInput}>
            {categorias.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
          </select>
        </div>
        <div><label style={rotulo}>Descrição</label><input value={form.descricao} onChange={set('descricao')} placeholder="Ex.: inscrição Campeonato Brasileiro" style={estiloInput} /></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><label style={rotulo}>Valor (R$)</label><input type="number" step="0.01" value={form.valor} onChange={set('valor')} style={estiloInput} /></div>
          <div style={{ flex: 1 }}>
            <label style={rotulo}>Data do gasto</label>
            <input type="date" value={form.data_despesa} onChange={set('data_despesa')} style={estiloInput}
              min={form.fonte === 'suplementacao' ? periodo.inicio : undefined} max={form.fonte === 'suplementacao' ? periodo.fim : undefined} />
          </div>
        </div>
        <div>
          <label style={rotulo}>{gasto?.comprovante_url ? 'Substituir comprovante' : 'Comprovante (PDF ou imagem)'}</label>
          <input type="file" accept="application/pdf,image/*" onChange={e => setForm(f => ({ ...f, arquivo: e.target.files[0] }))} />
        </div>
        <div><label style={rotulo}>Observação</label><input value={form.observacao} onChange={set('observacao')} style={estiloInput} /></div>
        {erro && <div style={{ color: '#c62828', fontSize: 13 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onFechar} style={btnCinza}>Cancelar</button>
          <button onClick={salvar} disabled={salvando || !form.categoria || !form.valor || !form.data_despesa} style={btnVerde}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: ficha da bolsa (resumo + gastos) ─────────────────────────────────

function FichaBolsa({ bolsaId, categorias, onFechar, onAlterado }) {
  const [bolsa, setBolsa] = useState(null);
  const [editandoDados, setEditandoDados] = useState(false);
  const [gastoEmEdicao, setGastoEmEdicao] = useState(null); // null fechado, {} novo, obj editar
  const [filtroFonte, setFiltroFonte] = useState('todas');

  const carregar = useCallback(() => {
    axios.get(`/incentivo-esporte/bolsas/${bolsaId}`).then(r => setBolsa(r.data));
  }, [bolsaId]);
  useEffect(() => { carregar(); }, [carregar]);

  const recarregar = () => { carregar(); onAlterado(); };
  const catLabel = (v) => categorias.find(c => c.valor === v)?.label || v;

  const alternarPrestado = async (g) => {
    await axios.put(`/incentivo-esporte/bolsas/${bolsaId}/despesas/${g.id}`, { prestado_contas: !g.prestado_contas });
    recarregar();
  };
  const remover = async (g) => {
    if (!window.confirm(`Remover o gasto de ${formatarMoeda(g.valor)} (${formatData(g.data_despesa)})?`)) return;
    await axios.delete(`/incentivo-esporte/bolsas/${bolsaId}/despesas/${g.id}`);
    recarregar();
  };

  if (!bolsa) return <Modal titulo="Carregando..." onFechar={onFechar}><p>Carregando...</p></Modal>;
  const r = bolsa.resumo;
  const sit = SITUACAO[bolsa.situacao_prestacao];
  const gastos = bolsa.Despesas.filter(g => filtroFonte === 'todas' || g.fonte === filtroFonte);

  return (
    <Modal titulo={`${bolsa.nome} — bolsa ${bolsa.ano}`} onFechar={onFechar} largura={860}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: sit.cor, background: sit.bg }}>{sit.label}</span>
        <span style={{ fontSize: 12, color: '#888' }}>
          Bolsa recebida {bolsa.data_recebimento_bolsa ? `em ${formatData(bolsa.data_recebimento_bolsa)}` : '(data não informada)'}
          {bolsa.valor_suplementacao != null && ` · Suplementação ${bolsa.data_recebimento_suplementacao ? `em ${formatData(bolsa.data_recebimento_suplementacao)}` : '(data não informada)'}`}
        </span>
        <button onClick={() => setEditandoDados(true)} style={{ ...btnCinza, marginLeft: 'auto' }}>Editar dados</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ ...cardEstilo, padding: 14, flex: '1 1 240px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Bolsa</div>
          <CelulaVerba valor={bolsa.valor_bolsa} gasto={r.gasto_bolsa} falta={r.falta_bolsa} />
        </div>
        <div style={{ ...cardEstilo, padding: 14, flex: '1 1 240px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Suplementação (gastos do 2º semestre)</div>
          <CelulaVerba valor={bolsa.valor_suplementacao} gasto={r.gasto_suplementacao} falta={r.falta_suplementacao} />
        </div>
      </div>
      {bolsa.observacao && <div style={{ fontSize: 13, color: '#555', background: '#fafafa', padding: 10, borderRadius: 4, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{bolsa.observacao}</div>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>Gastos ({bolsa.Despesas.length})</strong>
        <select value={filtroFonte} onChange={e => setFiltroFonte(e.target.value)} style={{ ...estiloInput, width: 170, padding: '5px 8px' }}>
          <option value="todas">Todas as verbas</option>
          <option value="bolsa">Só bolsa</option>
          {bolsa.valor_suplementacao != null && <option value="suplementacao">Só suplementação</option>}
        </select>
        <button onClick={() => setGastoEmEdicao({})} style={{ ...btnVerde, marginLeft: 'auto' }}>+ Novo gasto</button>
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 6, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Data', 'Verba', 'Categoria / descrição', 'Valor', 'Comprovante', 'Prestação', ''].map(h => <th key={h} style={{ ...thEstilo, padding: '8px 12px' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Nenhum gasto lançado.</td></tr>}
            {gastos.map(g => (
              <tr key={g.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ ...td, padding: '8px 12px', whiteSpace: 'nowrap' }}>{formatData(g.data_despesa)}</td>
                <td style={{ ...td, padding: '8px 12px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: g.fonte === 'suplementacao' ? '#ede7f6' : '#e3f2fd', color: g.fonte === 'suplementacao' ? '#5e35b1' : '#1565c0' }}>{FONTE_LABEL[g.fonte]}</span>
                </td>
                <td style={{ ...td, padding: '8px 12px' }}>
                  <div>{catLabel(g.categoria)}</div>
                  {g.descricao && <div style={{ fontSize: 12, color: '#888' }}>{g.descricao}</div>}
                </td>
                <td style={{ ...td, padding: '8px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatarMoeda(g.valor)}</td>
                <td style={{ ...td, padding: '8px 12px' }}>
                  {g.comprovante_url
                    ? <a href={`${SERVER_ORIGIN}${g.comprovante_url}`} target="_blank" rel="noreferrer" style={{ ...btnAzul, textDecoration: 'none' }}>Ver</a>
                    : <span style={{ fontSize: 11, fontWeight: 700, color: '#c62828' }}>✕ Falta</span>}
                </td>
                <td style={{ ...td, padding: '8px 12px' }}>
                  <button onClick={() => alternarPrestado(g)} title={g.prestado_contas ? `Lançado na prestação em ${formatData(g.data_prestado_contas)}` : ''}
                    style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: g.prestado_contas ? '#e8f5e9' : '#f0f0f0', color: g.prestado_contas ? '#2e7d32' : '#888' }}>
                    {g.prestado_contas ? '✓ Lançado' : 'Marcar lançado'}
                  </button>
                </td>
                <td style={{ ...td, padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  <button onClick={() => setGastoEmEdicao(g)} style={{ ...btnCinza, padding: '4px 10px', marginRight: 4 }}>Editar</button>
                  <button onClick={() => remover(g)} style={btnPerigo}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editandoDados && <ModalDadosBolsa bolsa={bolsa} onFechar={() => setEditandoDados(false)} onSalvo={() => { setEditandoDados(false); recarregar(); }} />}
      {gastoEmEdicao && (
        <ModalGasto bolsa={bolsa} gasto={gastoEmEdicao.id ? gastoEmEdicao : null} categorias={categorias}
          onFechar={() => setGastoEmEdicao(null)} onSalvo={() => { setGastoEmEdicao(null); recarregar(); }} />
      )}
    </Modal>
  );
}

// ── Aba principal ───────────────────────────────────────────────────────────

export default function BolsasIncentivo() {
  const [anos, setAnos] = useState([]);
  const [ano, setAno] = useState(null);
  const [lista, setLista] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [aberta, setAberta] = useState(null);
  const [nova, setNova] = useState(false);

  useEffect(() => {
    axios.get('/incentivo-esporte/catalogos').then(r => setCategorias(r.data.categoriasDespesa));
    axios.get('/incentivo-esporte/bolsas/anos').then(r => {
      const lista = r.data.length ? r.data : [new Date().getFullYear()];
      setAnos(lista); setAno(lista[0]);
    });
  }, []);

  const carregar = useCallback(() => {
    if (ano) axios.get(`/incentivo-esporte/bolsas?ano=${ano}`).then(r => setLista(r.data));
  }, [ano]);
  useEffect(() => { carregar(); }, [carregar]);

  const soma = (fn) => lista.reduce((s, b) => s + (fn(b) || 0), 0);
  const totalRecebido = soma(b => b.resumo.valor_total);
  const totalSup = soma(b => b.valor_suplementacao == null ? 0 : parseFloat(b.valor_suplementacao));
  const supComprovada = soma(b => b.resumo.gasto_suplementacao);
  const faltaSup = soma(b => b.resumo.falta_suplementacao);
  const faltaBolsa = soma(b => b.resumo.falta_bolsa);
  const semComprovante = soma(b => b.resumo.qtd_sem_comprovante);
  const fimSup = lista[0]?.periodo_suplementacao?.fim;
  const dias = fimSup ? diasAte(fimSup) : null;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#555' }}>Ano da bolsa</label>
        <select value={ano || ''} onChange={e => setAno(parseInt(e.target.value, 10))} style={{ ...estiloInput, width: 110 }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => setNova(true)} style={{ ...btnVerde, marginLeft: 'auto' }}>+ Nova bolsa</button>
      </div>

      {lista.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Indicador titulo="Total recebido" valor={formatarMoeda(totalRecebido)} detalhe={`${lista.length} atletas`} />
          <Indicador titulo="Suplementação comprovada" valor={formatarMoeda(supComprovada)} detalhe={`de ${formatarMoeda(totalSup)}`} cor={faltaSup > 0 ? '#ef6c00' : '#2e7d32'} />
          <Indicador titulo="Falta comprovar (suplementação)" valor={formatarMoeda(faltaSup)}
            detalhe={dias == null ? null : dias > 0 ? `${dias} dias até ${formatData(fimSup)}` : 'Prazo do 2º semestre encerrado'} cor={faltaSup > 0 ? '#c62828' : '#2e7d32'} />
          <Indicador titulo="Falta comprovar (bolsa)" valor={formatarMoeda(faltaBolsa)} cor={faltaBolsa > 0 ? '#c62828' : '#2e7d32'}
            detalhe={semComprovante ? `${semComprovante} gasto(s) sem comprovante` : null} />
        </div>
      )}

      <div style={{ ...cardEstilo, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Atleta', 'Bolsa', 'Suplementação (2º sem.)', 'Pendências', 'Prestação de contas'].map(h => <th key={h} style={thEstilo}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhuma bolsa cadastrada neste ano.</td></tr>}
            {lista.map(b => {
              const r = b.resumo;
              const sit = SITUACAO[b.situacao_prestacao];
              return (
                <tr key={b.id} onClick={() => setAberta(b.id)} style={{ borderTop: '1px solid #f0f0f0', cursor: 'pointer' }}>
                  <td style={{ ...td, fontWeight: 600 }}>{b.nome}<div style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>{formatarMoeda(r.valor_total)} no total</div></td>
                  <td style={td}><CelulaVerba valor={b.valor_bolsa} gasto={r.gasto_bolsa} falta={r.falta_bolsa} /></td>
                  <td style={td}><CelulaVerba valor={b.valor_suplementacao} gasto={r.gasto_suplementacao} falta={r.falta_suplementacao} /></td>
                  <td style={{ ...td, fontSize: 12 }}>
                    {r.qtd_despesas === 0 && <div style={{ color: '#999' }}>Nenhum gasto lançado</div>}
                    {r.qtd_sem_comprovante > 0 && <div style={{ color: '#c62828' }}>{r.qtd_sem_comprovante} sem comprovante</div>}
                    {r.qtd_nao_prestadas > 0 && <div style={{ color: '#ef6c00' }}>{r.qtd_nao_prestadas} não lançado(s) na prestação</div>}
                    {r.qtd_despesas > 0 && !r.qtd_sem_comprovante && !r.qtd_nao_prestadas && <div style={{ color: '#2e7d32' }}>✓ Em dia</div>}
                  </td>
                  <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: sit.cor, background: sit.bg, whiteSpace: 'nowrap' }}>{sit.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {aberta && <FichaBolsa bolsaId={aberta} categorias={categorias} onFechar={() => setAberta(null)} onAlterado={carregar} />}
      {nova && <ModalDadosBolsa anoPadrao={ano} onFechar={() => setNova(false)} onSalvo={() => { setNova(false); carregar(); }} />}
    </div>
  );
}
