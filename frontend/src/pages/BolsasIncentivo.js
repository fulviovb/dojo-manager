import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Modal, formatData, formatarMoeda, estiloInput, btnVerde, btnCinza, cardEstilo, thEstilo } from './IncentivoEsporte';
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
// A verba de cada gasto é calculada pelo backend (alocarGastos): 2º semestre
// cobre a suplementação primeiro; o resto (e o 1º semestre) cobre a bolsa.
const ehSegundoSemestre = (data) => !!data && data.slice(5) >= '07-01';
const CHIP_VERBA = {
  suplementacao: { label: 'Suplementação', bg: '#ede7f6', cor: '#5e35b1' },
  bolsa: { label: 'Bolsa', bg: '#e3f2fd', cor: '#1565c0' },
  excedente: { label: 'Excedente', bg: '#f5f5f5', cor: '#777' },
};
function ChipsVerba({ alocacao, valor }) {
  if (!alocacao) return null;
  const partes = ['suplementacao', 'bolsa', 'excedente'].filter(k => alocacao[k] > 0);
  const inteiro = partes.length === 1 && Math.abs(alocacao[partes[0]] - parseFloat(valor)) < 0.005;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
      {partes.map(k => (
        <span key={k} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: CHIP_VERBA[k].bg, color: CHIP_VERBA[k].cor, whiteSpace: 'nowrap' }}>
          {CHIP_VERBA[k].label}{inteiro ? '' : ` ${formatarMoeda(alocacao[k])}`}
        </span>
      ))}
    </div>
  );
}
const td = { padding: '10px 14px', fontSize: 13, verticalAlign: 'top' };
const rotulo = { fontSize: 12, display: 'block', marginBottom: 4 };
const btnPerigo = { background: 'none', border: '1px solid #f5c6c6', color: '#c62828', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const diasAte = (iso) => Math.ceil((new Date(iso + 'T23:59:59') - new Date()) / 86400000);
const erroApi = (e) => e.response?.data?.erro || 'Erro ao salvar';

const COR_COMPROVADO = '#2e7d32';
const COR_SEM_COMPROVANTE = '#f9a825';

// Barra em duas camadas: verde = lançado com comprovante; amarelo = lançado
// sem comprovante; cinza = ainda não lançado.
function Barra({ comprovado, lancado, total }) {
  const pct = (v) => (total > 0 ? Math.min(100, (v / total) * 100) : 0);
  const pComp = pct(comprovado);
  const pSem = Math.max(0, pct(lancado) - pComp);
  return (
    <div style={{ display: 'flex', height: 6, background: '#eee', borderRadius: 3, marginTop: 4, width: 150, overflow: 'hidden' }}>
      <div style={{ width: `${pComp}%`, background: COR_COMPROVADO }} />
      <div style={{ width: `${pSem}%`, background: COR_SEM_COMPROVANTE }} />
    </div>
  );
}

function CelulaVerba({ valor, resumo, fonte }) {
  if (valor == null) return <span style={{ color: '#bbb' }}>Não recebeu</span>;
  const lancado = resumo[`lancado_${fonte}`];
  const comprovado = resumo[`comprovado_${fonte}`];
  const faltaLancar = resumo[`falta_lancar_${fonte}`];
  const faltaComprovar = resumo[`falta_comprovar_${fonte}`];
  if (faltaComprovar === 0) {
    return (
      <div>
        <div><strong>{formatarMoeda(comprovado)}</strong> <span style={{ color: '#999' }}>de {formatarMoeda(valor)}</span></div>
        <Barra comprovado={comprovado} lancado={lancado} total={parseFloat(valor)} />
        <div style={{ fontSize: 11, marginTop: 3, color: COR_COMPROVADO, fontWeight: 600 }}>✓ Lançado e comprovado</div>
      </div>
    );
  }
  return (
    <div>
      <div><strong>{formatarMoeda(lancado)}</strong> <span style={{ color: '#999' }}>lançado de {formatarMoeda(valor)}</span></div>
      <Barra comprovado={comprovado} lancado={lancado} total={parseFloat(valor)} />
      <div style={{ fontSize: 11, marginTop: 3, fontWeight: 600, lineHeight: 1.5 }}>
        <div style={{ color: faltaLancar > 0 ? '#c62828' : COR_COMPROVADO }}>
          {faltaLancar > 0 ? `Falta lançar ${formatarMoeda(faltaLancar)}` : '✓ Tudo lançado'}
        </div>
        <div style={{ color: '#ef6c00' }}>Falta comprovar {formatarMoeda(faltaComprovar)}</div>
      </div>
    </div>
  );
}

// ── Visualização de comprovantes ────────────────────────────────────────────

const ehImagem = (nomeOuUrl) => /\.(jpe?g|png|webp|gif)$/i.test(nomeOuUrl || '');
const urlArquivo = (caminho) => `${SERVER_ORIGIN}${caminho}`;

// Miniatura clicável: imagem de verdade, ou ícone de PDF.
function Miniatura({ url, onClick, tamanho = 40 }) {
  const base = { width: tamanho, height: tamanho, borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer', flexShrink: 0, background: '#fafafa' };
  if (ehImagem(url)) {
    return <img src={url} alt="Comprovante" onClick={onClick} title="Ver comprovante" style={{ ...base, objectFit: 'cover' }} />;
  }
  return (
    <div onClick={onClick} title="Ver comprovante" style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#c62828' }}>PDF</div>
  );
}

// Tela cheia: imagem (clique alterna ajustar/tamanho real) ou PDF embutido.
// `itens` = [{ url, titulo, subtitulo }]; setas ←/→ navegam, Esc fecha.
function VisualizadorComprovante({ itens, inicial = 0, onFechar }) {
  const [i, setI] = useState(inicial);
  const [zoom, setZoom] = useState(false);
  const item = itens[i];
  const ir = useCallback((d) => { setZoom(false); setI(x => (x + d + itens.length) % itens.length); }, [itens.length]);

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') onFechar();
      else if (e.key === 'ArrowRight' && itens.length > 1) ir(1);
      else if (e.key === 'ArrowLeft' && itens.length > 1) ir(-1);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ir, itens.length, onFechar]);

  if (!item) return null;
  const imagem = item.imagem ?? ehImagem(item.url);
  const btnEscuro = { background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13, textDecoration: 'none' };
  const seta = (lado) => ({ ...btnEscuro, position: 'absolute', top: '50%', [lado]: 12, transform: 'translateY(-50%)', fontSize: 22, padding: '10px 14px' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', color: '#fff', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{item.titulo}</div>
          {item.subtitulo && <div style={{ fontSize: 12, opacity: 0.75 }}>{item.subtitulo}</div>}
        </div>
        {itens.length > 1 && <span style={{ fontSize: 12, opacity: 0.75 }}>{i + 1} de {itens.length}</span>}
        {imagem && <button onClick={() => setZoom(z => !z)} style={btnEscuro}>{zoom ? 'Ajustar à tela' : 'Tamanho real'}</button>}
        <a href={item.url} target="_blank" rel="noreferrer" style={btnEscuro}>Abrir em nova aba</a>
        <a href={item.url} download style={btnEscuro}>Baixar</a>
        <button onClick={onFechar} style={{ ...btnEscuro, fontSize: 18, padding: '2px 12px' }} title="Fechar (Esc)">×</button>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'auto', display: 'flex', alignItems: zoom ? 'flex-start' : 'center', justifyContent: zoom ? 'flex-start' : 'center', padding: '0 16px 16px' }}
        onClick={e => { if (e.target === e.currentTarget) onFechar(); }}>
        {imagem ? (
          <img key={item.url} src={item.url} alt={item.titulo} onClick={() => setZoom(z => !z)}
            style={zoom ? { cursor: 'zoom-out', margin: 'auto' } : { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'zoom-in', background: '#fff' }} />
        ) : (
          <iframe key={item.url} src={item.url} title={item.titulo} style={{ width: '100%', maxWidth: 1000, height: '100%', border: 'none', background: '#fff', borderRadius: 4 }} />
        )}
        {itens.length > 1 && (
          <>
            <button onClick={() => ir(-1)} style={seta('left')} title="Anterior (←)">‹</button>
            <button onClick={() => ir(1)} style={seta('right')} title="Próximo (→)">›</button>
          </>
        )}
      </div>
    </div>
  );
}

// Pré-visualização do arquivo escolhido no formulário (antes de salvar).
function PreviaArquivo({ arquivo, urlExistente, onVer }) {
  const [urlLocal, setUrlLocal] = useState(null);
  useEffect(() => {
    if (!arquivo) { setUrlLocal(null); return undefined; }
    const u = URL.createObjectURL(arquivo);
    setUrlLocal(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);
  const url = urlLocal || (urlExistente && urlArquivo(urlExistente));
  if (!url) return null;
  const imagem = arquivo ? arquivo.type.startsWith('image/') : ehImagem(urlExistente);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
      {imagem
        ? <img src={url} alt="Prévia do comprovante" onClick={() => onVer(url, imagem)} style={{ maxWidth: 120, maxHeight: 90, borderRadius: 4, border: '1px solid #ddd', cursor: 'zoom-in', objectFit: 'contain', background: '#fafafa' }} />
        : <Miniatura url={url} onClick={() => onVer(url, imagem)} tamanho={48} />}
      <button type="button" onClick={() => onVer(url, imagem)} style={{ ...linkUsarBase, marginLeft: 0 }}>
        {arquivo ? 'Ver arquivo escolhido' : 'Ver comprovante atual'}
      </button>
    </div>
  );
}
const linkUsarBase = { background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: 0 };

// Leitura do comprovante no servidor (pdftotext/OCR local): sugere valor e
// data de emissão. Nunca lança erro — falha vira { falhou: true }.
async function lerComprovante(arquivo) {
  try {
    const fd = new FormData();
    fd.append('comprovante', arquivo);
    const r = await axios.post('/incentivo-esporte/bolsas/ler-comprovante', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data;
  } catch { return { falhou: true }; }
}
const mesmoValor = (a, b) => Math.abs(parseFloat(a) - parseFloat(b)) < 0.005;

// Envia (ou troca) o comprovante de um gasto já lançado, direto da lista.
// Lê o arquivo antes: se valor/data do comprovante diferem do lançado,
// oferece corrigir o gasto.
function BotaoEnviarComprovante({ bolsaId, gasto, onEnviado, rotulo = '📎 Enviar comprovante' }) {
  const [etapa, setEtapa] = useState(null); // null | 'lendo' | 'enviando'
  const enviar = async (arquivo) => {
    if (!arquivo) return;
    const url = `/incentivo-esporte/bolsas/${bolsaId}/despesas/${gasto.id}`;
    try {
      setEtapa('lendo');
      const lido = await lerComprovante(arquivo);
      setEtapa('enviando');
      const fd = new FormData();
      fd.append('comprovante', arquivo);
      await axios.put(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const difValor = lido.valor != null && !mesmoValor(lido.valor, gasto.valor);
      const difData = lido.data_emissao && lido.data_emissao !== gasto.data_despesa;
      if ((difValor || difData) && window.confirm(
        'Comprovante enviado.\n\nO comprovante indica:\n'
        + (difValor ? `  • valor ${formatarMoeda(lido.valor)} (lançado: ${formatarMoeda(gasto.valor)})\n` : '')
        + (difData ? `  • data ${formatData(lido.data_emissao)} (lançada: ${formatData(gasto.data_despesa)})\n` : '')
        + '\nAtualizar o gasto com os dados do comprovante?')) {
        try {
          await axios.put(url, { ...(difValor ? { valor: lido.valor } : {}), ...(difData ? { data_despesa: lido.data_emissao } : {}) });
        } catch (e) { window.alert(`O comprovante foi salvo, mas o gasto não foi atualizado: ${erroApi(e)}`); }
      }
      onEnviado();
    } catch (e) { window.alert(erroApi(e)); } finally { setEtapa(null); }
  };
  const enviando = etapa !== null;
  return (
    <label style={{ ...btnCinza, padding: '4px 10px', display: 'inline-block', borderColor: '#f9a825', color: '#8d6e00', background: '#fffde7', fontWeight: 600, whiteSpace: 'nowrap', cursor: enviando ? 'wait' : 'pointer' }}>
      {etapa === 'lendo' ? 'Lendo...' : etapa === 'enviando' ? 'Enviando...' : rotulo}
      <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} disabled={enviando}
        onChange={e => { enviar(e.target.files[0]); e.target.value = ''; }} />
    </label>
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

const linkUsar = { background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: 0, marginLeft: 6 };

function AvisoLeitura({ leitura, form, usar }) {
  const caixa = (cor, bg, borda, filhos) => (
    <div style={{ fontSize: 12, color: cor, background: bg, border: `1px solid ${borda}`, borderRadius: 4, padding: '8px 10px', marginTop: 6, lineHeight: 1.6 }}>{filhos}</div>
  );
  if (leitura.lendo) return caixa('#555', '#f5f5f5', '#e0e0e0', '🔍 Lendo o comprovante...');
  if (leitura.falhou || (leitura.valor == null && !leitura.data_emissao)) {
    return caixa('#555', '#f5f5f5', '#e0e0e0', 'Não consegui identificar valor nem data neste arquivo — preencha manualmente.');
  }
  const difValor = leitura.valor != null && !(form.valor !== '' && mesmoValor(form.valor, leitura.valor));
  const difData = leitura.data_emissao && leitura.data_emissao !== form.data_despesa;
  return caixa('#1b5e20', '#e8f5e9', '#c8e6c9', (
    <>
      <div>🔍 <strong>Lido do comprovante{leitura.metodo === 'ocr' ? ' (por OCR)' : ''}</strong> — confira antes de salvar:</div>
      <div>
        Valor: {leitura.valor != null ? <strong>{formatarMoeda(leitura.valor)}</strong> : <em>não encontrado</em>}
        {difValor && <button type="button" style={linkUsar} onClick={() => usar('valor', leitura.valor.toFixed(2))}>usar este valor</button>}
      </div>
      <div>
        Data de emissão: {leitura.data_emissao ? <strong>{formatData(leitura.data_emissao)}</strong> : <em>não encontrada</em>}
        {difData && <button type="button" style={linkUsar} onClick={() => usar('data_despesa', leitura.data_emissao)}>usar esta data</button>}
      </div>
    </>
  ));
}

function ModalGasto({ bolsa, gasto, categorias, onFechar, onSalvo }) {
  const temSup = bolsa.valor_suplementacao != null;
  const [form, setForm] = useState(() => gasto
    ? { categoria: gasto.categoria, descricao: gasto.descricao || '', valor: gasto.valor, data_despesa: gasto.data_despesa, observacao: gasto.observacao || '', arquivo: null }
    : { categoria: categorias[0]?.valor || '', descricao: '', valor: '', data_despesa: hojeISO(), observacao: '', arquivo: null });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [leitura, setLeitura] = useState(null); // null | { lendo } | resultado
  const [tocado, setTocado] = useState({}); // campos que o usuário digitou
  const [visualizar, setVisualizar] = useState(null); // { url, imagem }
  const set = (k) => (e) => { setTocado(t => ({ ...t, [k]: true })); setForm(f => ({ ...f, [k]: e.target.value })); };
  const periodoAno = bolsa.periodo_ano;
  const foraDoAno = form.data_despesa && (form.data_despesa < periodoAno.inicio || form.data_despesa > periodoAno.fim);

  // Ao escolher o arquivo: lê e preenche valor/data que o usuário ainda não
  // digitou. Se ele já digitou algo diferente, só sugere (botão "usar").
  const escolherArquivo = async (arquivo) => {
    setForm(f => ({ ...f, arquivo: arquivo || null }));
    if (!arquivo) { setLeitura(null); return; }
    setLeitura({ lendo: true });
    const lido = await lerComprovante(arquivo);
    setLeitura(lido);
    const preencherValor = lido.valor != null && (!gasto && !tocado.valor);
    const preencherData = lido.data_emissao && (!gasto && !tocado.data_despesa);
    setForm(f => ({
      ...f,
      ...(preencherValor ? { valor: lido.valor.toFixed(2) } : {}),
      ...(preencherData ? { data_despesa: lido.data_emissao } : {}),
    }));
  };
  const usar = (campo, v) => { setTocado(t => ({ ...t, [campo]: true })); setForm(f => ({ ...f, [campo]: v })); };

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
          <label style={rotulo}>Categoria (rubrica do edital)</label>
          <select value={form.categoria} onChange={set('categoria')} style={estiloInput}>
            {categorias.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
          </select>
        </div>
        <div><label style={rotulo}>Descrição</label><input value={form.descricao} onChange={set('descricao')} placeholder="Ex.: inscrição Campeonato Brasileiro" style={estiloInput} /></div>
        <div>
          <label style={rotulo}>{gasto?.comprovante_url ? 'Substituir comprovante' : 'Comprovante (PDF ou imagem)'}</label>
          <input type="file" accept="application/pdf,image/*" onChange={e => escolherArquivo(e.target.files[0])} />
          {!form.arquivo && !gasto?.comprovante_url && (
            <div style={{ fontSize: 12, color: '#8d6e00', background: '#fffde7', border: '1px solid #f9e08a', borderRadius: 4, padding: '8px 10px', marginTop: 6 }}>
              ⚠ Este gasto precisa de comprovante. Dá para lançar agora sem ele, mas o valor
              fica como <strong>“falta comprovar”</strong> até o comprovante ser enviado
              (botão “Enviar comprovante” na lista de gastos).
            </div>
          )}
          <PreviaArquivo arquivo={form.arquivo} urlExistente={gasto?.comprovante_url} onVer={(url, imagem) => setVisualizar({ url, imagem })} />
          {form.arquivo && leitura && <AvisoLeitura leitura={leitura} form={form} usar={usar} />}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><label style={rotulo}>Valor (R$)</label><input type="number" step="0.01" value={form.valor} onChange={set('valor')} style={estiloInput} /></div>
          <div style={{ flex: 1 }}>
            <label style={rotulo}>Data de emissão / do gasto</label>
            <input type="date" value={form.data_despesa} onChange={set('data_despesa')} style={estiloInput}
              min={periodoAno.inicio} max={periodoAno.fim} />
          </div>
        </div>
        {form.data_despesa && (foraDoAno ? (
          <div style={{ fontSize: 12, color: '#c62828', marginTop: -4 }}>
            ✕ Data fora de {bolsa.ano} — só valem gastos do ano da bolsa ({formatData(periodoAno.inicio)} a {formatData(periodoAno.fim)}).
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#555', background: '#f5f7fa', borderRadius: 4, padding: '6px 10px', marginTop: -4 }}>
            {ehSegundoSemestre(form.data_despesa)
              ? (temSup
                ? <>📅 <strong>2º semestre</strong> — conta primeiro para a <strong>suplementação</strong>; o que passar dela vai para a bolsa.</>
                : <>📅 2º semestre — conta para a <strong>bolsa</strong> (este atleta não recebeu suplementação).</>)
              : <>📅 <strong>1º semestre</strong> — conta só para a <strong>bolsa</strong> (suplementação exige gasto do 2º semestre).</>}
          </div>
        ))}
        <div><label style={rotulo}>Observação</label><input value={form.observacao} onChange={set('observacao')} style={estiloInput} /></div>
        {erro && <div style={{ color: '#c62828', fontSize: 13 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onFechar} style={btnCinza}>Cancelar</button>
          <button onClick={salvar} disabled={salvando || !form.categoria || !form.valor || !form.data_despesa} style={btnVerde}>
            {salvando ? 'Salvando...' : (!form.arquivo && !gasto?.comprovante_url ? 'Lançar sem comprovante' : 'Salvar')}
          </button>
        </div>
      </div>
      {visualizar && (
        <VisualizadorComprovante onFechar={() => setVisualizar(null)}
          itens={[{ url: visualizar.url, imagem: visualizar.imagem, titulo: form.arquivo ? form.arquivo.name : 'Comprovante atual' }]} />
      )}
    </Modal>
  );
}

// ── Modal: ficha da bolsa (resumo + gastos) ─────────────────────────────────

function FichaBolsa({ bolsaId, categorias, onFechar, onAlterado }) {
  const [bolsa, setBolsa] = useState(null);
  const [editandoDados, setEditandoDados] = useState(false);
  const [gastoEmEdicao, setGastoEmEdicao] = useState(null); // null fechado, {} novo, obj editar
  const [filtroFonte, setFiltroFonte] = useState('todas');
  const [vendo, setVendo] = useState(null); // índice em comComprovante

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
  const gastos = bolsa.Despesas.filter(g => filtroFonte === 'todas' || (filtroFonte === '2' ? ehSegundoSemestre(g.data_despesa) : !ehSegundoSemestre(g.data_despesa)));
  // Navegação do visualizador: comprovantes dos gastos visíveis, na ordem da lista.
  const comComprovante = gastos.filter(g => g.comprovante_url);
  const itensVisualizador = comComprovante.map(g => ({
    url: urlArquivo(g.comprovante_url),
    titulo: `${formatarMoeda(g.valor)} · ${formatData(g.data_despesa)} · ${ehSegundoSemestre(g.data_despesa) ? '2º' : '1º'} semestre`,
    subtitulo: [catLabel(g.categoria), g.descricao].filter(Boolean).join(' — '),
  }));

  return (
    <Modal titulo={`${bolsa.nome} — bolsa ${bolsa.ano}`} onFechar={onFechar} largura={1040}>
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
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Bolsa (gastos de qualquer data de {bolsa.ano})</div>
          <CelulaVerba valor={bolsa.valor_bolsa} resumo={r} fonte="bolsa" />
        </div>
        <div style={{ ...cardEstilo, padding: 14, flex: '1 1 240px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Suplementação (gastos do 2º semestre)</div>
          <CelulaVerba valor={bolsa.valor_suplementacao} resumo={r} fonte="suplementacao" />
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#555', marginTop: -6, marginBottom: 12 }}>
        Total lançado {formatarMoeda(r.total_lancado)} ({formatarMoeda(r.lancado_segundo_semestre)} no 2º semestre).
        A divisão é automática: gastos do 2º semestre cobrem primeiro a suplementação; o que sobra deles e os do 1º semestre cobrem a bolsa.
      </div>
      {r.excedente > 0 && (
        <div style={{ fontSize: 13, color: '#555', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 4, padding: '8px 12px', marginBottom: 14 }}>
          ℹ {formatarMoeda(r.excedente)} lançados além do necessário (excedente) — não precisam entrar na prestação de contas.
        </div>
      )}
      {r.qtd_sem_comprovante > 0 && (
        <div style={{ fontSize: 13, color: '#8d6e00', background: '#fffde7', border: '1px solid #f9e08a', borderRadius: 4, padding: '8px 12px', marginBottom: 14 }}>
          ⚠ {r.qtd_sem_comprovante} gasto(s) lançado(s) sem comprovante, somando {formatarMoeda(r.sem_comprovante)}. Envie o comprovante pela lista abaixo.
        </div>
      )}
      {bolsa.observacao && <div style={{ fontSize: 13, color: '#555', background: '#fafafa', padding: 10, borderRadius: 4, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{bolsa.observacao}</div>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>Gastos ({bolsa.Despesas.length})</strong>
        <select value={filtroFonte} onChange={e => setFiltroFonte(e.target.value)} style={{ ...estiloInput, width: 170, padding: '5px 8px' }}>
          <option value="todas">Ano inteiro</option>
          <option value="1">Só 1º semestre</option>
          <option value="2">Só 2º semestre</option>
        </select>
        <button onClick={() => setGastoEmEdicao({})} style={{ ...btnVerde, marginLeft: 'auto' }}>+ Novo gasto</button>
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 6, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Data', 'Conta para', 'Categoria / descrição', 'Valor', 'Comprovante', 'Prestação', ''].map(h => <th key={h} style={{ ...thEstilo, padding: '8px 12px' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Nenhum gasto lançado.</td></tr>}
            {gastos.map(g => (
              <tr key={g.id} style={{ borderTop: '1px solid #f0f0f0', background: g.comprovante_url ? undefined : '#fffdf0' }}>
                <td style={{ ...td, padding: '8px 12px', whiteSpace: 'nowrap' }}>{formatData(g.data_despesa)}</td>
                <td style={{ ...td, padding: '8px 12px' }}>
                  <ChipsVerba alocacao={g.alocacao} valor={g.valor} />
                </td>
                <td style={{ ...td, padding: '8px 12px' }}>
                  <div>{catLabel(g.categoria)}</div>
                  {g.descricao && <div style={{ fontSize: 12, color: '#888' }}>{g.descricao}</div>}
                </td>
                <td style={{ ...td, padding: '8px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatarMoeda(g.valor)}</td>
                <td style={{ ...td, padding: '8px 12px' }}>
                  {g.comprovante_url
                    ? <Miniatura url={urlArquivo(g.comprovante_url)} onClick={() => setVendo(comComprovante.indexOf(g))} />
                    : <BotaoEnviarComprovante bolsaId={bolsaId} gasto={g} onEnviado={recarregar} />}
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

      {vendo !== null && itensVisualizador.length > 0 && (
        <VisualizadorComprovante itens={itensVisualizador} inicial={Math.min(vendo, itensVisualizador.length - 1)} onFechar={() => setVendo(null)} />
      )}
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
  const [filtroAtleta, setFiltroAtleta] = useState('');

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

  // Filtro por atleta: busca por parte do nome, sem diferenciar acento/maiúscula.
  const normalizar = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const termo = normalizar(filtroAtleta);
  const visiveis = termo ? lista.filter(b => normalizar(b.nome).includes(termo)) : lista;
  const soma = (fn) => visiveis.reduce((s, b) => s + (fn(b) || 0), 0);
  const totalRecebido = soma(b => b.resumo.valor_total);
  const faltaLancarSup = soma(b => b.resumo.falta_lancar_suplementacao);
  const faltaComprovarSup = soma(b => b.resumo.falta_comprovar_suplementacao);
  const faltaLancarBolsa = soma(b => b.resumo.falta_lancar_bolsa);
  const faltaComprovarBolsa = soma(b => b.resumo.falta_comprovar_bolsa);
  const qtdSemComprovante = soma(b => b.resumo.qtd_sem_comprovante);
  const valorSemComprovante = soma(b => b.resumo.sem_comprovante);
  const fimSup = lista[0]?.periodo_suplementacao?.fim;
  const dias = fimSup ? diasAte(fimSup) : null;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#555' }}>Ano da bolsa</label>
        <select value={ano || ''} onChange={e => setAno(parseInt(e.target.value, 10))} style={{ ...estiloInput, width: 110 }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
          <input value={filtroAtleta} onChange={e => setFiltroAtleta(e.target.value)} placeholder="🔍 Filtrar por atleta"
            list="bolsas-atletas" style={{ ...estiloInput, paddingRight: 28 }} />
          <datalist id="bolsas-atletas">{lista.map(b => <option key={b.id} value={b.nome} />)}</datalist>
          {filtroAtleta && (
            <button onClick={() => setFiltroAtleta('')} title="Limpar filtro"
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999' }}>×</button>
          )}
        </div>
        <button onClick={() => setNova(true)} style={{ ...btnVerde, marginLeft: 'auto' }}>+ Nova bolsa</button>
      </div>

      {lista.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Indicador titulo="Total recebido" valor={formatarMoeda(totalRecebido)} detalhe={termo ? `${visiveis.length} de ${lista.length} atletas (filtro)` : `${lista.length} atletas`} />
          <Indicador titulo="Suplementação — falta lançar" valor={formatarMoeda(faltaLancarSup)} cor={faltaLancarSup > 0 ? '#c62828' : '#2e7d32'}
            detalhe={`Falta comprovar ${formatarMoeda(faltaComprovarSup)}${dias == null ? '' : dias > 0 ? ` · ${dias} dias até ${formatData(fimSup)}` : ' · prazo encerrado'}`} />
          <Indicador titulo="Bolsa — falta lançar" valor={formatarMoeda(faltaLancarBolsa)} cor={faltaLancarBolsa > 0 ? '#c62828' : '#2e7d32'}
            detalhe={`Falta comprovar ${formatarMoeda(faltaComprovarBolsa)}`} />
          <Indicador titulo="Lançado sem comprovante" valor={formatarMoeda(valorSemComprovante)} cor={qtdSemComprovante > 0 ? '#ef6c00' : '#2e7d32'}
            detalhe={qtdSemComprovante ? `${qtdSemComprovante} gasto(s) aguardando comprovante` : 'Nenhum pendente'} />
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
            {lista.length > 0 && visiveis.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhum atleta encontrado para “{filtroAtleta}”.</td></tr>}
            {visiveis.map(b => {
              const r = b.resumo;
              const sit = SITUACAO[b.situacao_prestacao];
              return (
                <tr key={b.id} onClick={() => setAberta(b.id)} style={{ borderTop: '1px solid #f0f0f0', cursor: 'pointer' }}>
                  <td style={{ ...td, fontWeight: 600 }}>{b.nome}<div style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>{formatarMoeda(r.valor_total)} no total</div></td>
                  <td style={td}><CelulaVerba valor={b.valor_bolsa} resumo={r} fonte="bolsa" /></td>
                  <td style={td}><CelulaVerba valor={b.valor_suplementacao} resumo={r} fonte="suplementacao" /></td>
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
