import React, { useState, useEffect } from 'react';
import axios from 'axios';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnVerde = { background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnAzul = { background: '#1565c0', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnCinza = { background: 'none', border: '1px solid #ddd', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const cardEstilo = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' };
const thEstilo = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 };

export function formatData(iso) {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}
export function formatarMoeda(v) {
  return `R$ ${parseFloat(v || 0).toFixed(2).replace('.', ',')}`;
}

export function Modal({ titulo, onFechar, children, largura = 440 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: largura, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{titulo}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TIPO_PESSOA_LABEL = { atleta: 'Atleta', tecnico: 'Técnico' };
const STATUS_PROGRAMA_LABEL = { inscrito: 'Inscrito', documentacao_pendente: 'Documentação Pendente', habilitado: 'Habilitado', indeferido: 'Indeferido', inabilitado: 'Inabilitado' };
const STATUS_PROGRAMA_COR = { inscrito: '#607d8b', documentacao_pendente: '#ef6c00', habilitado: '#2e7d32', indeferido: '#c62828', inabilitado: '#c62828' };
const STATUS_PROGRAMA_BG = { inscrito: '#eceff1', documentacao_pendente: '#fff3e0', habilitado: '#e8f5e9', indeferido: '#ffebee', inabilitado: '#ffebee' };

// ── Modal: Novo Participante ───────────────────────────────────────────────

const FORM_VAZIO = {
  tipo_pessoa: 'atleta', origem: 'avulso', aluno_id: '',
  nome: '', cpf: '', rg: '', data_nascimento: '', telefone: '', email: '',
  endereco: '', bairro: '', cidade: 'Curitiba', estado: 'PR', cep: '',
  responsavel_legal_nome: '', responsavel_legal_rg: '', responsavel_legal_cpf: '',
  arte_marcial_id: '', confef_cref: '', tecnico_responsavel_id: '',
  vinculo_federativo: 'nao_possui', vinculo_federativo_entidade: '', vinculo_federativo_cidade: '',
  atua_com_menores: false,
};

function calcularIdade(dataNascimentoIso) {
  if (!dataNascimentoIso) return null;
  const hoje = new Date();
  const nascimento = new Date(dataNascimentoIso + 'T00:00:00');
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  if (hoje.getMonth() < nascimento.getMonth() || (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

function ModalNovoParticipante({ onFechar, onSalvo }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [alunos, setAlunos] = useState([]);
  const [buscaAluno, setBuscaAluno] = useState('');
  const [artes, setArtes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios.get('/usuarios?role=aluno').then(r => setAlunos(r.data));
    axios.get('/artes-marciais').then(r => setArtes(r.data));
    axios.get('/incentivo-esporte/participantes?tipo_pessoa=tecnico').then(r => setTecnicos(r.data));
  }, []);

  const alunosFiltrados = alunos.filter(a => a.nome.toLowerCase().includes(buscaAluno.toLowerCase()));
  const menorDe18 = (calcularIdade(form.data_nascimento) ?? 99) < 18;

  const salvar = async () => {
    setErro('');
    if (form.origem === 'aluno' && !form.aluno_id) return setErro('Selecione um aluno');
    if (form.origem !== 'aluno' && !form.nome.trim()) return setErro('Informe o nome');
    setSalvando(true);
    try {
      const payload = { ...form };
      if (form.origem === 'aluno') {
        // Dados pessoais vêm inteiramente do cadastro do aluno no backend —
        // não manda os campos em branco daqui, senão sobrescrevem (ex:
        // nome viraria null, cidade/UF voltariam pro default do form).
        ['nome', 'cpf', 'rg', 'data_nascimento', 'telefone', 'email', 'endereco',
          'bairro', 'cidade', 'estado', 'cep', 'responsavel_legal_nome',
          'responsavel_legal_rg', 'responsavel_legal_cpf'].forEach(k => delete payload[k]);
      } else {
        delete payload.aluno_id;
      }
      delete payload.origem;
      // Campos opcionais em branco (data/UUID) precisam ir como null, não
      // '' — o MySQL rejeita '' em colunas DATE/DATEONLY.
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      await axios.post('/incentivo-esporte/participantes', payload);
      onSalvo();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
    finally { setSalvando(false); }
  };

  return (
    <Modal titulo="Novo Participante" onFechar={onFechar} largura={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tipo</label>
            <select value={form.tipo_pessoa} onChange={e => setForm(f => ({ ...f, tipo_pessoa: e.target.value, origem: e.target.value === 'tecnico' ? 'avulso' : f.origem }))} style={estiloInput}>
              <option value="atleta">Atleta</option>
              <option value="tecnico">Técnico</option>
            </select>
          </div>
          {form.tipo_pessoa === 'atleta' && (
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Origem</label>
              <select value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))} style={estiloInput}>
                <option value="avulso">Atleta avulso</option>
                <option value="aluno">Aluno matriculado</option>
              </select>
            </div>
          )}
        </div>

        {form.origem === 'aluno' ? (
          <div>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Aluno</label>
            <input placeholder="Buscar aluno..." value={buscaAluno} onChange={e => setBuscaAluno(e.target.value)} style={{ ...estiloInput, marginBottom: 6 }} />
            <select size={6} value={form.aluno_id} onChange={e => setForm(f => ({ ...f, aluno_id: e.target.value }))} style={{ width: '100%' }}>
              <option value="" disabled hidden>Selecione...</option>
              {alunosFiltrados.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nome *</label><input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={estiloInput} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>CPF</label><input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} style={estiloInput} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>RG</label><input value={form.rg} onChange={e => setForm(f => ({ ...f, rg: e.target.value }))} style={estiloInput} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nascimento</label><input type="date" value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} style={estiloInput} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Telefone</label><input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} style={estiloInput} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={estiloInput} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Endereço</label><input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} style={estiloInput} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Bairro</label><input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} style={estiloInput} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Cidade</label><input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} style={estiloInput} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>UF</label><input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} style={estiloInput} /></div>
            </div>
            {menorDe18 && (
              <div style={{ background: '#fff3e0', padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#ef6c00' }}>Menor de 18 — Responsável Legal</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                  <input placeholder="Nome" value={form.responsavel_legal_nome} onChange={e => setForm(f => ({ ...f, responsavel_legal_nome: e.target.value }))} style={estiloInput} />
                  <input placeholder="RG" value={form.responsavel_legal_rg} onChange={e => setForm(f => ({ ...f, responsavel_legal_rg: e.target.value }))} style={estiloInput} />
                  <input placeholder="CPF" value={form.responsavel_legal_cpf} onChange={e => setForm(f => ({ ...f, responsavel_legal_cpf: e.target.value }))} style={estiloInput} />
                </div>
              </div>
            )}
          </>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '4px 0' }} />

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Arte marcial</label>
            <select value={form.arte_marcial_id} onChange={e => setForm(f => ({ ...f, arte_marcial_id: e.target.value }))} style={estiloInput}>
              <option value="">—</option>
              {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          {form.tipo_pessoa === 'tecnico' ? (
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>CONFEF/CREF</label>
              <input value={form.confef_cref} onChange={e => setForm(f => ({ ...f, confef_cref: e.target.value }))} style={estiloInput} />
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Técnico responsável</label>
              <select value={form.tecnico_responsavel_id} onChange={e => setForm(f => ({ ...f, tecnico_responsavel_id: e.target.value }))} style={estiloInput}>
                <option value="">—</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Vínculo federativo</label>
            <select value={form.vinculo_federativo} onChange={e => setForm(f => ({ ...f, vinculo_federativo: e.target.value }))} style={estiloInput}>
              <option value="nao_possui">Não possui</option>
              <option value="possui">Possui</option>
            </select>
          </div>
          {form.vinculo_federativo === 'possui' && (
            <>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Entidade</label>
                <input value={form.vinculo_federativo_entidade} onChange={e => setForm(f => ({ ...f, vinculo_federativo_entidade: e.target.value }))} style={estiloInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Cidade sede</label>
                <input value={form.vinculo_federativo_cidade} onChange={e => setForm(f => ({ ...f, vinculo_federativo_cidade: e.target.value }))} style={estiloInput} />
              </div>
            </>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8, whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={form.atua_com_menores} onChange={e => setForm(f => ({ ...f, atua_com_menores: e.target.checked }))} />
            Atua com menores de 18
          </label>
        </div>

        {erro && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onFechar} style={btnCinza}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={btnVerde}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}

function BarraProgressoDocumentos({ progresso }) {
  const { total, entregues, percentual } = progresso || { total: 0, entregues: 0, percentual: 0 };
  if (!total) return <span style={{ fontSize: 12, color: '#aaa' }}>—</span>;
  const cor = percentual === 100 ? '#2e7d32' : '#ef6c00';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${percentual}%`, height: '100%', background: cor, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>{entregues}/{total}</span>
    </div>
  );
}

// ── Aba: Participantes ─────────────────────────────────────────────────────

function ListaParticipantes({ onVerParticipante }) {
  const [participantes, setParticipantes] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modalNovo, setModalNovo] = useState(false);

  const carregar = () => axios.get('/incentivo-esporte/participantes').then(r => setParticipantes(r.data));
  useEffect(() => { carregar(); }, []);

  const filtrados = participantes.filter(p => {
    if (filtroTipo !== 'todos' && p.tipo_pessoa !== filtroTipo) return false;
    return p.nome.toLowerCase().includes(busca.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} style={{ ...estiloInput, maxWidth: 240 }} />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...estiloInput, width: 140 }}>
            <option value="todos">Todos os tipos</option>
            <option value="atleta">Atletas</option>
            <option value="tecnico">Técnicos</option>
          </select>
        </div>
        <button onClick={() => setModalNovo(true)} style={btnVerde}>+ Novo Participante</button>
      </div>

      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Nome', 'Tipo', 'Origem', 'Status', 'Documentos', 'Taxa Gestão', ''].map(h => <th key={h} style={thEstilo}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhum participante encontrado.</td></tr>
            )}
            {filtrados.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>
                  <button onClick={() => onVerParticipante(p.id)} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', padding: 0, fontSize: 13 }}>{p.nome}</button>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{TIPO_PESSOA_LABEL[p.tipo_pessoa]}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{p.aluno_id ? 'Aluno' : 'Avulso'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: STATUS_PROGRAMA_BG[p.status_programa], color: STATUS_PROGRAMA_COR[p.status_programa], fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                    {STATUS_PROGRAMA_LABEL[p.status_programa]}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <BarraProgressoDocumentos progresso={p.documentos_progresso} />
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>
                  {p.taxa_gestao_paga
                    ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>✓ Paga</span>
                    : <span style={{ color: '#c62828' }}>Pendente</span>}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <button onClick={() => onVerParticipante(p.id)} style={btnAzul}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalNovo && (
        <ModalNovoParticipante onFechar={() => setModalNovo(false)} onSalvo={() => { setModalNovo(false); carregar(); }} />
      )}
    </div>
  );
}

// ── Aba: Contrapartidas (visão geral) ──────────────────────────────────────

const TIPO_CONTRAPARTIDA_LABEL = { campanha_doacao: 'Campanha de Doação', divulgacao_rede_social: 'Divulgação em Rede Social', exposicao_banner: 'Exposição de Bandeira/Banner' };

function ListaContrapartidasGeral() {
  const [lista, setLista] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('todas');

  useEffect(() => { axios.get('/incentivo-esporte/contrapartidas').then(r => setLista(r.data)); }, []);

  const filtradas = lista.filter(c => filtroStatus === 'todas' || c.status === filtroStatus);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...estiloInput, width: 160 }}>
          <option value="todas">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="cumprida">Cumprida</option>
        </select>
      </div>
      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Participante', 'Tipo', 'Descrição', 'Data', 'Status'].map(h => <th key={h} style={thEstilo}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhuma contrapartida registrada.</td></tr>
            )}
            {filtradas.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{c.ParticipanteIncentivo?.nome}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{TIPO_CONTRAPARTIDA_LABEL[c.tipo]}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{c.descricao || '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{formatData(c.data)}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: c.status === 'cumprida' ? '#e8f5e9' : '#fff3e0', color: c.status === 'cumprida' ? '#2e7d32' : '#ef6c00', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                    {c.status === 'cumprida' ? 'Cumprida' : 'Pendente'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Aba: Despesas (visão geral) ────────────────────────────────────────────

function ListaDespesasGeral() {
  const [lista, setLista] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroComprovante, setFiltroComprovante] = useState('todas');
  const [filtroReportado, setFiltroReportado] = useState('todas');

  useEffect(() => {
    axios.get('/incentivo-esporte/despesas').then(r => setLista(r.data));
    axios.get('/incentivo-esporte/catalogos').then(r => setCategorias(r.data.categoriasDespesa));
  }, []);

  const catLabel = (v) => categorias.find(c => c.valor === v)?.label || v;

  const filtradas = lista.filter(d => {
    if (filtroComprovante === 'com' && !d.comprovante_url) return false;
    if (filtroComprovante === 'sem' && d.comprovante_url) return false;
    if (filtroReportado === 'sim' && !d.reportado_prefeitura) return false;
    if (filtroReportado === 'nao' && d.reportado_prefeitura) return false;
    return true;
  });
  const total = filtradas.reduce((s, d) => s + parseFloat(d.valor || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filtroComprovante} onChange={e => setFiltroComprovante(e.target.value)} style={{ ...estiloInput, width: 170 }}>
          <option value="todas">Comprovante: todos</option>
          <option value="com">Com comprovante</option>
          <option value="sem">Sem comprovante</option>
        </select>
        <select value={filtroReportado} onChange={e => setFiltroReportado(e.target.value)} style={{ ...estiloInput, width: 190 }}>
          <option value="todas">Prefeitura: todos</option>
          <option value="sim">Já reportado</option>
          <option value="nao">Não reportado</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#555' }}>Total filtrado: <strong>{formatarMoeda(total)}</strong></div>
      </div>
      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Participante', 'Categoria', 'Descrição', 'Data', 'Valor', 'Comprovante', 'Prefeitura'].map(h => <th key={h} style={thEstilo}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhuma despesa encontrada.</td></tr>
            )}
            {filtradas.map(d => (
              <tr key={d.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{d.ParticipanteIncentivo?.nome}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{catLabel(d.categoria)}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{d.descricao || '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{formatData(d.data_despesa)}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{formatarMoeda(d.valor)}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.comprovante_url ? '#2e7d32' : '#c62828' }}>
                    {d.comprovante_url ? '✓ Tem' : '✕ Falta'}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.reportado_prefeitura ? '#2e7d32' : '#888' }}>
                    {d.reportado_prefeitura ? '✓ Sim' : 'Não'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function IncentivoEsporte({ onVerParticipanteIncentivo }) {
  const [aba, setAba] = useState('participantes');

  const ABAS = [
    ['participantes', 'Participantes'],
    ['contrapartidas', 'Contrapartidas'],
    ['despesas', 'Despesas'],
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

      {aba === 'participantes' && <ListaParticipantes onVerParticipante={onVerParticipanteIncentivo} />}
      {aba === 'contrapartidas' && <ListaContrapartidasGeral />}
      {aba === 'despesas' && <ListaDespesasGeral />}
    </div>
  );
}

export { estiloInput, btnPrimario, btnVerde, btnAzul, btnCinza, cardEstilo, thEstilo };
