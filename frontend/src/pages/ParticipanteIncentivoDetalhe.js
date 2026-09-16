import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Modal, estiloInput, btnVerde, btnAzul, btnCinza, formatData, formatarMoeda } from './IncentivoEsporte';
import { SERVER_ORIGIN } from '../components/Avatar';

const card = (extra = {}) => ({ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16, ...extra });
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #f0f0f0' };
const cardTitle = { fontWeight: 700, fontSize: 15, color: '#1e2a38' };
const btnPerigo = { background: '#c62828', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 };

const TIPO_PESSOA_LABEL = { atleta: 'Atleta', tecnico: 'Técnico' };
const STATUS_PROGRAMA_LABEL = { inscrito: 'Inscrito', documentacao_pendente: 'Documentação Pendente', habilitado: 'Habilitado', indeferido: 'Indeferido', inabilitado: 'Inabilitado' };
const STATUS_DOC_LABEL = { pendente: 'Pendente', recebido: 'Recebido', aprovado: 'Aprovado', rejeitado: 'Rejeitado' };
const STATUS_DOC_COR = { pendente: '#888', recebido: '#1565c0', aprovado: '#2e7d32', rejeitado: '#c62828' };
const STATUS_DOC_BG = { pendente: '#f0f0f0', recebido: '#e3f2fd', aprovado: '#e8f5e9', rejeitado: '#ffebee' };
const TIPO_CONTRAPARTIDA_LABEL = { campanha_doacao: 'Campanha de Doação', divulgacao_rede_social: 'Divulgação em Rede Social', exposicao_banner: 'Exposição de Bandeira/Banner' };

function LinhaInfo({ label, valor }) {
  if (!valor) return null;
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: '#888', minWidth: 90 }}>{label}:</span>
      <span style={{ color: '#222', fontWeight: 500 }}>{valor}</span>
    </div>
  );
}

// ── Seção: Documentos ──────────────────────────────────────────────────────

function ModalGerarAnexo({ participanteId, anexo, onFechar, onGerado }) {
  const [campos, setCampos] = useState(() => Object.fromEntries(anexo.campos.filter(c => !c.temFonte).map(c => [c.key, ''])));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const gerar = async () => {
    setSalvando(true); setErro('');
    try {
      await axios.post('/incentivo-esporte/documentos/gerar', { participante_id: participanteId, tipo_anexo: anexo.codigo, campos });
      onGerado();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao gerar documento'); }
    finally { setSalvando(false); }
  };

  const camposManuais = anexo.campos.filter(c => !c.temFonte);

  return (
    <Modal titulo={`Gerar Anexo ${anexo.codigo} — ${anexo.nome}`} onFechar={onFechar} largura={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
          Campos que já vêm do cadastro do participante são preenchidos automaticamente. Preencha o restante abaixo.
        </p>
        {camposManuais.map(c => (
          <div key={c.key}>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{c.label}</label>
            <input value={campos[c.key] || ''} onChange={e => setCampos(p => ({ ...p, [c.key]: e.target.value }))} style={estiloInput} />
          </div>
        ))}
        {camposManuais.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>Nenhum campo adicional — tudo vem do cadastro.</p>}
        {erro && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onFechar} style={btnCinza}>Cancelar</button>
          <button onClick={gerar} disabled={salvando} style={btnVerde}>{salvando ? 'Gerando...' : 'Gerar PDF'}</button>
        </div>
      </div>
    </Modal>
  );
}

function SecaoDocumentos({ participante, onRefresh }) {
  const [documentos, setDocumentos] = useState([]);
  const [anexosDisponiveis, setAnexosDisponiveis] = useState([]);
  const [anexoEscolhido, setAnexoEscolhido] = useState(null);
  const [modalExtra, setModalExtra] = useState(false);
  const [formExtra, setFormExtra] = useState({ nome_exibicao: '', arquivo: null });
  const [erroExtra, setErroExtra] = useState('');

  const carregar = useCallback(() => {
    axios.get(`/incentivo-esporte/documentos?participante_id=${participante.id}`).then(r => setDocumentos(r.data));
  }, [participante.id]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { axios.get('/incentivo-esporte/anexos').then(r => setAnexosDisponiveis(r.data)); }, []);

  const anexosParaEsteTipo = anexosDisponiveis.filter(a => a.gerar_para === 'ambos' || a.gerar_para === participante.tipo_pessoa);

  const mudarStatus = async (doc, status) => {
    await axios.put(`/incentivo-esporte/documentos/${doc.id}`, { status });
    carregar();
  };

  const enviarArquivo = async (doc, file) => {
    const fd = new FormData();
    fd.append('arquivo', file);
    await axios.put(`/incentivo-esporte/documentos/${doc.id}/arquivo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    carregar();
  };

  const remover = async (doc) => {
    if (!window.confirm(`Remover "${doc.nome_exibicao}" do checklist?`)) return;
    await axios.delete(`/incentivo-esporte/documentos/${doc.id}`);
    carregar();
  };

  const salvarExtra = async () => {
    setErroExtra('');
    if (!formExtra.nome_exibicao.trim()) return setErroExtra('Informe o nome do documento');
    const fd = new FormData();
    fd.append('participante_id', participante.id);
    fd.append('tipo_documento', 'extra');
    fd.append('nome_exibicao', formExtra.nome_exibicao);
    if (formExtra.arquivo) fd.append('arquivo', formExtra.arquivo);
    try {
      await axios.post('/incentivo-esporte/documentos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModalExtra(false);
      setFormExtra({ nome_exibicao: '', arquivo: null });
      carregar();
    } catch (ex) { setErroExtra(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Documentos</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {anexosParaEsteTipo.length > 0 && (
            <select value="" onChange={e => { const a = anexosParaEsteTipo.find(x => x.codigo === e.target.value); if (a) setAnexoEscolhido(a); }}
              style={{ ...estiloInput, width: 220, padding: '5px 8px', fontSize: 12 }}>
              <option value="">Gerar anexo padrão...</option>
              {anexosParaEsteTipo.map(a => <option key={a.codigo} value={a.codigo}>Anexo {a.codigo} — {a.nome}</option>)}
            </select>
          )}
          <button onClick={() => setModalExtra(true)} style={btnVerde}>+ Documento</button>
        </div>
      </div>
      <div style={{ padding: '4px 0' }}>
        {documentos.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '12px 18px' }}>Nenhum documento no checklist.</p>
        ) : (
          documentos.map(doc => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.nome_exibicao}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>
                  {doc.origem === 'gerado' ? 'Gerado pelo sistema' : 'Upload'}
                  {doc.data_validade ? ` · válido até ${formatData(doc.data_validade)}` : ''}
                </div>
              </div>
              <select value={doc.status} onChange={e => mudarStatus(doc, e.target.value)}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 10, border: 'none', fontWeight: 700, background: STATUS_DOC_BG[doc.status], color: STATUS_DOC_COR[doc.status] }}>
                {Object.entries(STATUS_DOC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {doc.arquivo_url && (
                <a href={`${SERVER_ORIGIN}${doc.arquivo_url}`} target="_blank" rel="noreferrer" style={{ ...btnAzul, textDecoration: 'none', display: 'inline-block' }}>Ver</a>
              )}
              <label style={{ ...btnCinza, cursor: 'pointer', margin: 0 }}>
                {doc.arquivo_url ? 'Trocar arquivo' : 'Enviar arquivo'}
                <input type="file" hidden onChange={e => e.target.files[0] && enviarArquivo(doc, e.target.files[0])} />
              </label>
              <button onClick={() => remover(doc)} style={btnPerigo}>✕</button>
            </div>
          ))
        )}
      </div>

      {anexoEscolhido && (
        <ModalGerarAnexo participanteId={participante.id} anexo={anexoEscolhido}
          onFechar={() => setAnexoEscolhido(null)}
          onGerado={() => { setAnexoEscolhido(null); carregar(); }} />
      )}

      {modalExtra && (
        <Modal titulo="Novo Documento" onFechar={() => setModalExtra(false)} largura={400}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nome do documento</label>
              <input value={formExtra.nome_exibicao} onChange={e => setFormExtra(f => ({ ...f, nome_exibicao: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Arquivo (opcional agora)</label>
              <input type="file" onChange={e => setFormExtra(f => ({ ...f, arquivo: e.target.files[0] }))} />
            </div>
            {erroExtra && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erroExtra}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalExtra(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvarExtra} style={btnVerde}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Seção: Contrapartidas ──────────────────────────────────────────────────

function SecaoContrapartidas({ participante }) {
  const [lista, setLista] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ tipo: 'campanha_doacao', descricao: '', data: '', arquivo: null });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    axios.get(`/incentivo-esporte/contrapartidas?participante_id=${participante.id}`).then(r => setLista(r.data));
  }, [participante.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const abrirModal = () => { setForm({ tipo: 'campanha_doacao', descricao: '', data: new Date().toISOString().slice(0, 10), arquivo: null }); setModalAberto(true); };

  const salvar = async () => {
    setSalvando(true);
    try {
      const fd = new FormData();
      fd.append('participante_id', participante.id);
      Object.entries(form).forEach(([k, v]) => { if (k !== 'arquivo' && v) fd.append(k, v); });
      if (form.arquivo) fd.append('comprovante', form.arquivo);
      await axios.post('/incentivo-esporte/contrapartidas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModalAberto(false);
      carregar();
    } finally { setSalvando(false); }
  };

  const marcarCumprida = async (c) => { await axios.put(`/incentivo-esporte/contrapartidas/${c.id}`, { status: 'cumprida' }); carregar(); };
  const remover = async (c) => { if (window.confirm('Remover esta contrapartida?')) { await axios.delete(`/incentivo-esporte/contrapartidas/${c.id}`); carregar(); } };

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Contrapartida Social</span>
        <button onClick={abrirModal} style={btnVerde}>+ Nova</button>
      </div>
      <div style={{ padding: '4px 0' }}>
        {lista.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '12px 18px' }}>Nenhuma contrapartida registrada.</p>
        ) : (
          lista.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{TIPO_CONTRAPARTIDA_LABEL[c.tipo]}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{c.descricao} {c.data ? `· ${formatData(c.data)}` : ''}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: c.status === 'cumprida' ? '#e8f5e9' : '#fff3e0', color: c.status === 'cumprida' ? '#2e7d32' : '#ef6c00' }}>
                {c.status === 'cumprida' ? 'Cumprida' : 'Pendente'}
              </span>
              {c.comprovante_url && (
                <a href={`${SERVER_ORIGIN}${c.comprovante_url}`} target="_blank" rel="noreferrer" style={{ ...btnAzul, textDecoration: 'none' }}>Ver</a>
              )}
              {c.status !== 'cumprida' && <button onClick={() => marcarCumprida(c)} style={btnVerde}>Marcar cumprida</button>}
              <button onClick={() => remover(c)} style={btnPerigo}>✕</button>
            </div>
          ))
        )}
      </div>

      {modalAberto && (
        <Modal titulo="Nova Contrapartida" onFechar={() => setModalAberto(false)} largura={420}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={estiloInput}>
                {Object.entries(TIPO_CONTRAPARTIDA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Descrição</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Comprovante (opcional)</label>
              <input type="file" onChange={e => setForm(f => ({ ...f, arquivo: e.target.files[0] }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalAberto(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={btnVerde}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Seção: Despesas ─────────────────────────────────────────────────────────

function SecaoDespesas({ participante }) {
  const [lista, setLista] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ categoria: '', descricao: '', valor: '', data_despesa: '', arquivo: null });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    axios.get(`/incentivo-esporte/despesas?participante_id=${participante.id}`).then(r => setLista(r.data));
  }, [participante.id]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { axios.get('/incentivo-esporte/catalogos').then(r => setCategorias(r.data.categoriasDespesa)); }, []);

  const catLabel = (v) => categorias.find(c => c.valor === v)?.label || v;

  const abrirModal = () => { setForm({ categoria: categorias[0]?.valor || '', descricao: '', valor: '', data_despesa: new Date().toISOString().slice(0, 10), arquivo: null }); setModalAberto(true); };

  const salvar = async () => {
    setSalvando(true);
    try {
      const fd = new FormData();
      fd.append('participante_id', participante.id);
      Object.entries(form).forEach(([k, v]) => { if (k !== 'arquivo' && v !== '') fd.append(k, v); });
      if (form.arquivo) fd.append('comprovante', form.arquivo);
      await axios.post('/incentivo-esporte/despesas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModalAberto(false);
      carregar();
    } finally { setSalvando(false); }
  };

  const alternarReportado = async (d) => {
    await axios.put(`/incentivo-esporte/despesas/${d.id}`, { reportado_prefeitura: !d.reportado_prefeitura });
    carregar();
  };
  const remover = async (d) => { if (window.confirm('Remover esta despesa?')) { await axios.delete(`/incentivo-esporte/despesas/${d.id}`); carregar(); } };

  const total = lista.reduce((s, d) => s + parseFloat(d.valor || 0), 0);

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Despesas da Verba — total {formatarMoeda(total)}</span>
        <button onClick={abrirModal} style={btnVerde}>+ Nova Despesa</button>
      </div>
      <div style={{ padding: '4px 0' }}>
        {lista.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '12px 18px' }}>Nenhuma despesa lançada.</p>
        ) : (
          lista.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{catLabel(d.categoria)}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{d.descricao} · {formatData(d.data_despesa)}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, minWidth: 80 }}>{formatarMoeda(d.valor)}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: d.comprovante_url ? '#2e7d32' : '#c62828' }}>{d.comprovante_url ? '✓ Comprovante' : '✕ Sem comprovante'}</span>
              <button onClick={() => alternarReportado(d)}
                style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: d.reportado_prefeitura ? '#e8f5e9' : '#f0f0f0', color: d.reportado_prefeitura ? '#2e7d32' : '#888' }}>
                {d.reportado_prefeitura ? '✓ Reportado à Prefeitura' : 'Marcar reportado'}
              </button>
              {d.comprovante_url && (
                <a href={`${SERVER_ORIGIN}${d.comprovante_url}`} target="_blank" rel="noreferrer" style={{ ...btnAzul, textDecoration: 'none' }}>Ver</a>
              )}
              <button onClick={() => remover(d)} style={btnPerigo}>✕</button>
            </div>
          ))
        )}
      </div>

      {modalAberto && (
        <Modal titulo="Nova Despesa" onFechar={() => setModalAberto(false)} largura={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Categoria (rubrica do edital)</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={estiloInput}>
                {categorias.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Descrição</label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={estiloInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Valor (R$)</label>
                <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={estiloInput} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Data</label>
              <input type="date" value={form.data_despesa} onChange={e => setForm(f => ({ ...f, data_despesa: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Comprovante (opcional agora)</label>
              <input type="file" onChange={e => setForm(f => ({ ...f, arquivo: e.target.files[0] }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalAberto(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.categoria} style={btnVerde}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sidebar: Dados pessoais + status + taxa de gestão ─────────────────────

function SecaoDadosPessoais({ participante, onAtualizado }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(participante);

  const abrirEdicao = () => { setForm(participante); setEditando(true); };
  const salvar = async () => {
    // Campos de data limpos pelo usuário viram '' no input — o MySQL
    // rejeita '' em colunas DATE/DATEONLY, precisa ir como null.
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    await axios.put(`/incentivo-esporte/participantes/${participante.id}`, payload);
    setEditando(false);
    onAtualizado();
  };

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Dados Pessoais</span>
        {!editando && <button onClick={abrirEdicao} style={btnAzul}>✎ Editar</button>}
      </div>
      <div style={{ padding: '12px 18px' }}>
        {!editando ? (
          <>
            <LinhaInfo label="CPF" valor={participante.cpf} />
            <LinhaInfo label="RG" valor={participante.rg} />
            <LinhaInfo label="Nascimento" valor={formatData(participante.data_nascimento)} />
            <LinhaInfo label="Telefone" valor={participante.telefone} />
            <LinhaInfo label="Email" valor={participante.email} />
            <LinhaInfo label="Endereço" valor={[participante.endereco, participante.bairro, participante.cidade, participante.estado].filter(Boolean).join(', ')} />
            {participante.tipo_pessoa === 'tecnico' && <LinhaInfo label="CONFEF/CREF" valor={participante.confef_cref} />}
            {participante.tipo_pessoa === 'atleta' && <LinhaInfo label="Técnico" valor={participante.TecnicoResponsavel?.nome} />}
            <LinhaInfo label="Arte marcial" valor={participante.ArteMarcial?.nome} />
            <LinhaInfo label="Vínculo federativo" valor={participante.vinculo_federativo === 'possui' ? `${participante.vinculo_federativo_entidade || ''} (${participante.vinculo_federativo_cidade || ''})` : 'Não possui'} />
            <LinhaInfo label="Atua c/ menores" valor={participante.atua_com_menores ? 'Sim' : 'Não'} />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Nome" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={estiloInput} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="CPF" value={form.cpf || ''} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} style={estiloInput} />
              <input placeholder="RG" value={form.rg || ''} onChange={e => setForm(f => ({ ...f, rg: e.target.value }))} style={estiloInput} />
            </div>
            <input type="date" value={form.data_nascimento || ''} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} style={estiloInput} />
            <input placeholder="Telefone" value={form.telefone || ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} style={estiloInput} />
            <input placeholder="Email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={estiloInput} />
            <input placeholder="Endereço" value={form.endereco || ''} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} style={estiloInput} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Bairro" value={form.bairro || ''} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} style={estiloInput} />
              <input placeholder="Cidade" value={form.cidade || ''} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} style={estiloInput} />
              <input placeholder="UF" value={form.estado || ''} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} style={{ ...estiloInput, maxWidth: 60 }} />
            </div>
            {form.tipo_pessoa === 'tecnico' && (
              <input placeholder="CONFEF/CREF" value={form.confef_cref || ''} onChange={e => setForm(f => ({ ...f, confef_cref: e.target.value }))} style={estiloInput} />
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={!!form.atua_com_menores} onChange={e => setForm(f => ({ ...f, atua_com_menores: e.target.checked }))} />
              Atua com menores de 18
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setEditando(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} style={btnVerde}>Salvar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SecaoPrograma({ participante, onAtualizado }) {
  const mudarStatus = async (status_programa) => {
    await axios.put(`/incentivo-esporte/participantes/${participante.id}`, { status_programa });
    onAtualizado();
  };
  const alternarTaxaGestao = async () => {
    const taxa_gestao_paga = !participante.taxa_gestao_paga;
    await axios.put(`/incentivo-esporte/participantes/${participante.id}`, {
      taxa_gestao_paga,
      taxa_gestao_data: taxa_gestao_paga ? new Date().toISOString().slice(0, 10) : null,
    });
    onAtualizado();
  };

  return (
    <div style={card()}>
      <div style={cardHeader}><span style={cardTitle}>Programa</span></div>
      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Status no programa</label>
          <select value={participante.status_programa} onChange={e => mudarStatus(e.target.value)} style={estiloInput}>
            {Object.entries(STATUS_PROGRAMA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #f0f0f0' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Taxa de gestão</div>
            <div style={{ fontSize: 11, color: '#888' }}>{participante.taxa_gestao_paga ? `Paga em ${formatData(participante.taxa_gestao_data)}` : 'Ainda não paga'}</div>
          </div>
          <button onClick={alternarTaxaGestao} style={participante.taxa_gestao_paga ? btnCinza : btnVerde}>
            {participante.taxa_gestao_paga ? 'Marcar como não paga' : 'Marcar como paga'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function ParticipanteIncentivoDetalhe({ participanteId, onVoltar }) {
  const [participante, setParticipante] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    setCarregando(true);
    axios.get(`/incentivo-esporte/participantes/${participanteId}`)
      .then(r => setParticipante(r.data))
      .finally(() => setCarregando(false));
  }, [participanteId]);
  useEffect(() => { carregar(); }, [carregar]);

  if (carregando) return <div style={{ padding: 24, color: '#888' }}>Carregando...</div>;
  if (!participante) return <div style={{ padding: 24, color: '#c00' }}>Participante não encontrado.</div>;

  return (
    <div>
      <button onClick={onVoltar} style={{ ...btnCinza, marginBottom: 12 }}>← Voltar</button>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#1e2a38' }}>{participante.nome}</h1>
        <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
          {TIPO_PESSOA_LABEL[participante.tipo_pessoa]} · {participante.aluno_id ? 'Aluno matriculado' : 'Avulso'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div>
          <SecaoDocumentos participante={participante} onRefresh={carregar} />
          <SecaoContrapartidas participante={participante} />
          <SecaoDespesas participante={participante} />
        </div>
        <div>
          <SecaoPrograma participante={participante} onAtualizado={carregar} />
          <SecaoDadosPessoais participante={participante} onAtualizado={carregar} />
        </div>
      </div>
    </div>
  );
}
