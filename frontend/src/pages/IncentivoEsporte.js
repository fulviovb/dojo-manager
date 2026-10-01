import React, { useState, useEffect } from 'react';
import axios from 'axios';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnVerde = { background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnAzul = { background: '#1565c0', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnCinza = { background: 'none', border: '1px solid #ddd', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const cardEstilo = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' };
const thEstilo = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 };

export function formatarCep(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

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

const TIPO_PESSOA_LABEL = { atleta: 'Atleta', tecnico: 'Técnico', pessoa_juridica: 'Pessoa Jurídica' };
const STATUS_PROGRAMA_LABEL = { documentacao_pendente: 'Documentação Pendente', documentacao_ok: 'Documentação OK — aguardando inscrição', inscrito: 'Inscrito', habilitado: 'Habilitado', indeferido: 'Indeferido', inabilitado: 'Inabilitado' };
const STATUS_PROGRAMA_COR = { documentacao_ok: '#1565c0', inscrito: '#607d8b', documentacao_pendente: '#ef6c00', habilitado: '#2e7d32', indeferido: '#c62828', inabilitado: '#c62828' };
const STATUS_PROGRAMA_BG = { documentacao_ok: '#e3f2fd', inscrito: '#eceff1', documentacao_pendente: '#fff3e0', habilitado: '#e8f5e9', indeferido: '#ffebee', inabilitado: '#ffebee' };

// ── Modal: Novo Participante ───────────────────────────────────────────────

const FORM_VAZIO = {
  tipo_pessoa: 'atleta', origem: 'avulso', aluno_id: '',
  nome: '', cpf: '', rg: '', data_nascimento: '', telefone: '', email: '',
  endereco: '', bairro: '', cidade: 'Curitiba', estado: 'PR', cep: '',
  responsavel_legal_nome: '', responsavel_legal_rg: '', responsavel_legal_cpf: '',
  esporte_id: '', confef_cref: '', tecnico_responsavel_id: '',
  vinculo_federativo: 'nao_possui', entidade_federativa_id: '',
  atua_com_menores: false,
  proprietario_imovel: false, mora_com_responsavel: true,
  cnpj: '', responsavel_financeiro_nome: '', responsavel_financeiro_rg: '', responsavel_financeiro_cpf: '',
  local_execucao: '', projeto_nome: '',
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
  const [tecnicos, setTecnicos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios.get('/usuarios?role=aluno').then(r => setAlunos(r.data));
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
            <select value={form.tipo_pessoa} onChange={e => setForm(f => ({ ...f, tipo_pessoa: e.target.value, origem: e.target.value !== 'atleta' ? 'avulso' : f.origem }))} style={estiloInput}>
              <option value="atleta">Atleta</option>
              <option value="tecnico">Técnico</option>
              <option value="pessoa_juridica">Pessoa Jurídica (entidade/CNPJ)</option>
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

        {form.tipo_pessoa === 'pessoa_juridica' ? (
          <>
            <CamposPJ form={form} setForm={setForm} permitirPreencherDeEntidade />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={form.atua_com_menores} onChange={e => setForm(f => ({ ...f, atua_com_menores: e.target.checked }))} />
              O projeto atende menores de 18 (exige certidão de antecedentes de todos os colaboradores; senão, Anexo XX)
            </label>
          </>
        ) : (<>
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
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr', gap: 8 }}>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Endereço (rua, nº, compl.)</label><input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} style={estiloInput} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Bairro</label><input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} style={estiloInput} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>CEP</label><input value={form.cep} placeholder="00000-000" onChange={e => setForm(f => ({ ...f, cep: formatarCep(e.target.value) }))} style={estiloInput} /></div>
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
          <SeletorEsporte valor={form.esporte_id} onChange={v => setForm(f => ({ ...f, esporte_id: v }))} />
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
            <SeletorEntidade valor={form.entidade_federativa_id} onChange={v => setForm(f => ({ ...f, entidade_federativa_id: v }))} />
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8, whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={form.atua_com_menores} onChange={e => setForm(f => ({ ...f, atua_com_menores: e.target.checked }))} />
            Atua com menores de 18
          </label>
        </div>

        <div style={{ background: '#f9f9f9', padding: 10, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Comprovação de residência (Art. 17 do edital)</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.proprietario_imovel} onChange={e => setForm(f => ({ ...f, proprietario_imovel: e.target.checked }))} />
            É proprietário do imóvel onde reside
          </label>
          {!form.proprietario_imovel && menorDe18 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={form.mora_com_responsavel} onChange={e => setForm(f => ({ ...f, mora_com_responsavel: e.target.checked }))} />
              Mora com os pais/responsável legal
            </label>
          )}
          <div style={{ fontSize: 11, color: '#888' }}>
            {form.proprietario_imovel
              ? 'Só precisa da própria conta de água/luz/telefone fixo/internet fixa/TV assinatura/gás.'
              : (menorDe18 && form.mora_com_responsavel)
              ? 'Nascido a partir de 2009 e mora com os pais: só a conta no nome dos pais/responsável.'
              : 'Vai precisar também de Declaração de Residência (Anexo IX) e comprovar vínculo com Curitiba.'}
          </div>
        </div>

        </>)}

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
            <option value="pessoa_juridica">Pessoas Jurídicas</option>
          </select>
        </div>
        <button onClick={() => setModalNovo(true)} style={btnVerde}>+ Novo Participante</button>
      </div>

      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Nome', 'Tipo', 'Origem / CNPJ', 'Status', 'Documentos', 'Taxa Gestão', ''].map(h => <th key={h} style={thEstilo}>{h}</th>)}
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
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{p.tipo_pessoa === 'pessoa_juridica' ? (p.cnpj || '—') : p.aluno_id ? 'Aluno' : 'Avulso'}</td>
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

// ── Campos de Pessoa Jurídica (cadastro e edição) ─────────────────────────
// PJ reaproveita nome (razão social), endereço (sede) e responsavel_legal_*
// (presidente/representante legal) do model.
export function CamposPJ({ form, setForm, permitirPreencherDeEntidade }) {
  const [entidades, setEntidades] = useState([]);
  useEffect(() => {
    if (permitirPreencherDeEntidade) axios.get('/incentivo-esporte/entidades').then(r => setEntidades(r.data));
  }, [permitirPreencherDeEntidade]);
  const campo = (k) => ({ value: form[k] || '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })), style: estiloInput });
  const rotulo = (t) => <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t}</label>;
  const secao = (t) => <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginTop: 4 }}>{t}</div>;
  const preencherDeEntidade = (id) => {
    const e = entidades.find(x => x.id === id);
    if (e) setForm(f => ({ ...f, nome: e.nome, cnpj: e.cnpj || '', cidade: e.cidade || f.cidade }));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {permitirPreencherDeEntidade && entidades.length > 0 && (
        <div>
          {rotulo('Preencher com uma entidade já cadastrada (opcional)')}
          <select value="" onChange={e => preencherDeEntidade(e.target.value)} style={estiloInput}>
            <option value="">—</option>
            {entidades.map(e => <option key={e.id} value={e.id}>{e.nome}{e.cnpj ? ` - ${e.cnpj}` : ''}</option>)}
          </select>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <div>{rotulo('Razão social / nome da entidade *')}<input {...campo('nome')} /></div>
        <div>{rotulo('CNPJ')}<input value={form.cnpj || ''} placeholder="00.000.000/0000-00" onChange={e => setForm(f => ({ ...f, cnpj: formatarCnpjDigitado(e.target.value) }))} style={estiloInput} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>{rotulo('Telefone')}<input {...campo('telefone')} /></div>
        <div>{rotulo('Email')}<input {...campo('email')} /></div>
      </div>
      {secao('Sede')}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr 0.5fr', gap: 8 }}>
        <div>{rotulo('Endereço (rua, nº, compl.)')}<input {...campo('endereco')} /></div>
        <div>{rotulo('Bairro')}<input {...campo('bairro')} /></div>
        <div>{rotulo('CEP')}<input value={form.cep || ''} placeholder="00000-000" onChange={e => setForm(f => ({ ...f, cep: formatarCep(e.target.value) }))} style={estiloInput} /></div>
        <div>{rotulo('Cidade')}<input {...campo('cidade')} /></div>
        <div>{rotulo('UF')}<input {...campo('estado')} /></div>
      </div>
      {secao('Presidente / representante legal')}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
        <input placeholder="Nome" {...campo('responsavel_legal_nome')} />
        <input placeholder="RG" {...campo('responsavel_legal_rg')} />
        <input placeholder="CPF" {...campo('responsavel_legal_cpf')} />
      </div>
      {secao('Responsável financeiro')}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
        <input placeholder="Nome" {...campo('responsavel_financeiro_nome')} />
        <input placeholder="RG" {...campo('responsavel_financeiro_rg')} />
        <input placeholder="CPF" {...campo('responsavel_financeiro_cpf')} />
      </div>
      {secao('Projeto')}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <div>{rotulo('Nome do projeto')}<input {...campo('projeto_nome')} /></div>
        <SeletorEsporte valor={form.esporte_id} onChange={v => setForm(f => ({ ...f, esporte_id: v }))} rotulo="Modalidade" />
      </div>
      <div>{rotulo('Local / endereço de execução do projeto')}<input {...campo('local_execucao')} /></div>
    </div>
  );
}

// ── Seletor de esporte (com cadastro rápido) ──────────────────────────────
// Cadastro próprio do módulo (aba Esportes) — não usa as artes marciais da
// escola. "+ Novo esporte" cadastra na hora e já seleciona.
export function SeletorEsporte({ valor, onChange, rotulo = 'Esporte' }) {
  const [esportes, setEsportes] = useState(null);
  const [novo, setNovo] = useState(null); // null = fechado; string = nome digitado
  const [erro, setErro] = useState('');
  const carregar = () => axios.get('/incentivo-esporte/esportes?ativo=todos').then(r => setEsportes(r.data));
  useEffect(() => { carregar(); }, []);
  const opcoes = (esportes || []).filter(e => e.ativo || e.id === valor);

  const cadastrar = async () => {
    setErro('');
    try {
      const r = await axios.post('/incentivo-esporte/esportes', { nome: novo });
      await carregar();
      onChange(r.data.id);
      setNovo(null);
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao cadastrar'); }
  };

  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{rotulo}</label>
      {novo === null ? (
        <select value={valor || ''} onChange={e => (e.target.value === '__novo' ? setNovo('') : onChange(e.target.value || null))} style={estiloInput}>
          <option value="">{esportes === null ? 'Carregando...' : '—'}</option>
          {opcoes.map(e => <option key={e.id} value={e.id}>{e.nome}{e.ativo ? '' : ' (inativo)'}</option>)}
          <option value="__novo">+ Novo esporte...</option>
        </select>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <input autoFocus placeholder="Ex.: Natação" value={novo} onChange={e => setNovo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); cadastrar(); } }} style={estiloInput} />
          <button type="button" onClick={cadastrar} style={btnVerde}>Salvar</button>
          <button type="button" onClick={() => { setNovo(null); setErro(''); }} style={btnCinza}>✕</button>
        </div>
      )}
      {erro && <div style={{ fontSize: 11, color: '#c62828', marginTop: 3 }}>{erro}</div>}
    </div>
  );
}

// ── Aba: Esportes ──────────────────────────────────────────────────────────

const OLIMPICO_LABEL = { true: 'Sim', false: 'Não', null: '—' };

function ListaEsportes() {
  const [lista, setLista] = useState([]);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = () => axios.get('/incentivo-esporte/esportes?ativo=todos').then(r => setLista(r.data));
  useEffect(() => { carregar(); }, []);
  const visiveis = lista.filter(e => mostrarInativos || e.ativo);

  const salvar = async () => {
    setErro('');
    try {
      if (form.id) await axios.put(`/incentivo-esporte/esportes/${form.id}`, form);
      else await axios.post('/incentivo-esporte/esportes', form);
      setForm(null); carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  const alternarAtivo = async (e) => {
    if (e.ativo && !window.confirm(`Desativar "${e.nome}"? Ele some das opções (${e.participantes} participante(s) continuam com ele).`)) return;
    if (e.ativo) await axios.delete(`/incentivo-esporte/esportes/${e.id}`);
    else await axios.put(`/incentivo-esporte/esportes/${e.id}`, { ...e, ativo: true });
    carregar();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} />
          Mostrar inativos
        </label>
        <button onClick={() => { setErro(''); setForm({ nome: '', olimpico: null }); }} style={btnPrimario}>+ Novo Esporte</button>
      </div>
      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Esporte', 'Olímpico (LA 2028)', 'Participantes', ''].map(h => <th key={h} style={thEstilo}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhum esporte cadastrado.</td></tr>
            )}
            {visiveis.map(e => (
              <tr key={e.id} style={{ borderTop: '1px solid #f0f0f0', opacity: e.ativo ? 1 : 0.55 }}>
                <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{e.nome}{!e.ativo && <span style={{ fontWeight: 400, color: '#888' }}> (inativo)</span>}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{OLIMPICO_LABEL[e.olimpico]}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{e.participantes}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => { setErro(''); setForm({ ...e }); }} style={btnAzul}>Editar</button>{' '}
                  <button onClick={() => alternarAtivo(e)} style={btnCinza}>{e.ativo ? 'Desativar' : 'Reativar'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>
        "Olímpico" = está no programa dos Jogos de Los Angeles 2028 (Resolução, Art. 3º §1º). Define se o atleta é classificado pelo Anexo I (olímpicas) ou Anexo II (não olímpicas).
      </p>

      {form && (
        <Modal titulo={form.id ? 'Editar Esporte' : 'Novo Esporte'} onFechar={() => setForm(null)} largura={400}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nome</label>
              <input autoFocus value={form.nome} onChange={ev => setForm(f => ({ ...f, nome: ev.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Está no programa olímpico/paralímpico de LA 2028?</label>
              <select value={String(form.olimpico)} onChange={ev => setForm(f => ({ ...f, olimpico: { true: true, false: false }[ev.target.value] ?? null }))} style={estiloInput}>
                <option value="null">Não informado</option>
                <option value="true">Sim (Anexo I)</option>
                <option value="false">Não (Anexo II)</option>
              </select>
            </div>
            {erro && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setForm(null)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} style={btnVerde}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Aba: Calendário (competições futuras) ─────────────────────────────────
// Mesma tabela das Conquistas: o resultado depois cai na mesma competição.
// Alimenta objetivos e "competições previstas" do formulário do projeto.
const NIVEL_LABEL = { municipal: 'Municipal', estadual: 'Estadual', nacional: 'Nacional', panamericano: 'Pan-americano', mundial: 'Mundial' };
const COMP_VAZIA = { nome: '', ano: new Date().getFullYear() + 1, etapa: '', nivel: 'estadual', entidade: '', cidade: '', estado: '', pais: 'Brasil', data_inicio: '', data_fim: '', periodo_texto: '' };

function ListaCalendario() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState('');
  const carregar = () => axios.get('/incentivo-esporte/calendario').then(r => setLista(r.data));
  useEffect(() => { carregar(); }, []);
  const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const periodo = (c) => (c.data_inicio ? `${dataBr(c.data_inicio)}${c.data_fim && c.data_fim !== c.data_inicio ? ` a ${dataBr(c.data_fim)}` : ''}` : (c.periodo_texto || '—'));

  const salvar = async () => {
    setErro('');
    try {
      if (form.id) await axios.put(`/incentivo-esporte/calendario/${form.id}`, form);
      else await axios.post('/incentivo-esporte/calendario', form);
      setForm(null); carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };
  const remover = async (c) => {
    if (!window.confirm(`Remover "${c.nome}"?`)) return;
    try { await axios.delete(`/incentivo-esporte/calendario/${c.id}`); carregar(); }
    catch (ex) { window.alert(ex.response?.data?.erro || 'Erro ao remover'); }
  };
  const campo = (k, rotulo, extra = {}) => (
    <div style={{ flex: extra.flex || 1, minWidth: extra.minWidth || 110 }}>
      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{rotulo}</label>
      <input type={extra.type || 'text'} value={form[k] ?? ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={estiloInput} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#666' }}>Competições de {new Date().getFullYear() + 1} em diante (ano de execução dos projetos) — usadas nos objetivos e competições previstas.</span>
        <button onClick={() => { setErro(''); setForm({ ...COMP_VAZIA }); }} style={btnPrimario}>+ Nova Competição</button>
      </div>
      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#fafafa' }}>{['Competição', 'Nível', 'Período/data', 'Local', 'Entidade', ''].map(h => <th key={h} style={thEstilo}>{h}</th>)}</tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhuma competição de {new Date().getFullYear() + 1} em diante cadastrada.</td></tr>}
            {lista.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{c.nome}{c.etapa ? ` (${c.etapa})` : ''} <span style={{ fontWeight: 400, color: '#888' }}>{c.ano}</span></td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{NIVEL_LABEL[c.nivel] || c.nivel}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{periodo(c)}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{[c.cidade, c.estado].filter(Boolean).join('/') || '—'}{c.pais && c.pais !== 'Brasil' ? ` - ${c.pais}` : ''}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{c.entidade || '—'}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => { setErro(''); setForm({ ...COMP_VAZIA, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v ?? ''])) }); }} style={btnAzul}>Editar</button>{' '}
                  <button onClick={() => remover(c)} style={btnCinza}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal titulo={form.id ? 'Editar Competição' : 'Nova Competição'} onFechar={() => setForm(null)} largura={560}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>{campo('nome', 'Nome', { flex: 3 })}{campo('ano', 'Ano', { type: 'number' })}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nível</label>
                <select value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} style={estiloInput}>
                  {Object.entries(NIVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {campo('etapa', 'Etapa (opcional)')}
            </div>
            {campo('entidade', 'Entidade organizadora (opcional)')}
            <div style={{ display: 'flex', gap: 8 }}>{campo('cidade', 'Cidade', { flex: 2 })}{campo('estado', 'UF', { minWidth: 60 })}{campo('pais', 'País')}</div>
            <div style={{ display: 'flex', gap: 8 }}>{campo('data_inicio', 'Data início', { type: 'date' })}{campo('data_fim', 'Data fim', { type: 'date' })}</div>
            {campo('periodo_texto', 'Ou período aproximado, se não tiver data (ex.: "Maio/2027")')}
            {erro && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setForm(null)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} style={btnVerde}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Aba: Locais de treino ─────────────────────────────────────────────────
// Cadastro único dos locais; no projeto do participante só se escolhe o
// local e informa dia/horário.
function ListaLocaisTreino() {
  const [lista, setLista] = useState([]);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState('');
  const carregar = () => axios.get('/incentivo-esporte/locais-treino?ativo=todos').then(r => setLista(r.data));
  useEffect(() => { carregar(); }, []);
  const visiveis = lista.filter(l => mostrarInativos || l.ativo);

  const salvar = async () => {
    setErro('');
    try {
      if (form.id) await axios.put(`/incentivo-esporte/locais-treino/${form.id}`, form);
      else await axios.post('/incentivo-esporte/locais-treino', form);
      setForm(null); carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };
  const alternar = async (l) => {
    if (l.ativo && !window.confirm(`Desativar "${l.nome}"? Some das opções (${l.usos} horário(s) de participantes continuam com ele).`)) return;
    if (l.ativo) await axios.delete(`/incentivo-esporte/locais-treino/${l.id}`);
    else await axios.put(`/incentivo-esporte/locais-treino/${l.id}`, { ...l, ativo: true });
    carregar();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} />
          Mostrar inativos
        </label>
        <button onClick={() => { setErro(''); setForm({ nome: '', endereco: '' }); }} style={btnPrimario}>+ Novo Local</button>
      </div>
      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#fafafa' }}>{['Local', 'Endereço', 'Horários em uso', ''].map(h => <th key={h} style={thEstilo}>{h}</th>)}</tr></thead>
          <tbody>
            {visiveis.length === 0 && <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhum local cadastrado.</td></tr>}
            {visiveis.map(l => (
              <tr key={l.id} style={{ borderTop: '1px solid #f0f0f0', opacity: l.ativo ? 1 : 0.55 }}>
                <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{l.nome}{!l.ativo && <span style={{ fontWeight: 400, color: '#888' }}> (inativo)</span>}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>{l.endereco}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{l.usos}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => { setErro(''); setForm({ ...l }); }} style={btnAzul}>Editar</button>{' '}
                  <button onClick={() => alternar(l)} style={btnCinza}>{l.ativo ? 'Desativar' : 'Reativar'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal titulo={form.id ? 'Editar Local' : 'Novo Local'} onFechar={() => setForm(null)} largura={480}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nome do local</label>
              <input autoFocus value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Endereço completo (rua, nº, bairro, CEP, cidade/UF)</label>
              <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} style={estiloInput} />
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: 0 }}>No formulário sai como: <b>{form.nome || 'Nome'} - {form.endereco || 'Endereço'}</b></p>
            {form.id && form.usos > 0 && <p style={{ fontSize: 11, color: '#ef6c00', margin: 0 }}>A alteração vale para os {form.usos} horário(s) que usam este local.</p>}
            {erro && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setForm(null)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} style={btnVerde}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Seletor de entidade (vínculo federativo) ───────────────────────────────
// Combo alimentado pelo cadastro da aba Entidades. Mostra também a entidade
// atual mesmo se tiver sido desativada, e o texto antigo digitado à mão
// (participantes de antes do cadastro que não casaram com nenhuma entidade).
export function SeletorEntidade({ valor, onChange, textoLegado }) {
  const [entidades, setEntidades] = useState(null);
  useEffect(() => { axios.get('/incentivo-esporte/entidades?ativo=todos').then(r => setEntidades(r.data)); }, []);
  const opcoes = (entidades || []).filter(e => e.ativo || e.id === valor);
  const escolhida = opcoes.find(e => e.id === valor);
  return (
    <div style={{ flex: 2, minWidth: 220 }}>
      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Entidade</label>
      <select value={valor || ''} onChange={e => onChange(e.target.value || null)} style={estiloInput}>
        <option value="">{entidades === null ? 'Carregando...' : 'Selecione a entidade...'}</option>
        {opcoes.map(e => <option key={e.id} value={e.id}>{e.nome}{e.ativo ? '' : ' (inativa)'}</option>)}
      </select>
      <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
        {escolhida
          ? `${escolhida.cnpj ? `CNPJ ${escolhida.cnpj}` : 'sem CNPJ'} · sede: ${escolhida.cidade || '—'}`
          : entidades?.length === 0
            ? 'Nenhuma entidade cadastrada — cadastre na aba "Entidades".'
            : textoLegado ? `Texto antigo: "${textoLegado}" — selecione a entidade correspondente.` : ''}
      </div>
    </div>
  );
}

// ── Aba: Entidades ─────────────────────────────────────────────────────────

function formatarCnpjDigitado(v) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

function ListaEntidades() {
  const [lista, setLista] = useState([]);
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [form, setForm] = useState(null); // null = modal fechado
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = () => axios.get('/incentivo-esporte/entidades?ativo=todos').then(r => setLista(r.data));
  useEffect(() => { carregar(); }, []);

  const visiveis = lista.filter(e => mostrarInativas || e.ativo);

  const salvar = async () => {
    setErro(''); setSalvando(true);
    try {
      if (form.id) await axios.put(`/incentivo-esporte/entidades/${form.id}`, form);
      else await axios.post('/incentivo-esporte/entidades', form);
      setForm(null); carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
    finally { setSalvando(false); }
  };

  const alternarAtiva = async (e) => {
    if (e.ativo && !window.confirm(`Desativar "${e.nome}"? Ela some das opções de vínculo federativo (${e.participantes} participante(s) vinculado(s) continuam apontando pra ela).`)) return;
    if (e.ativo) await axios.delete(`/incentivo-esporte/entidades/${e.id}`);
    else await axios.put(`/incentivo-esporte/entidades/${e.id}`, { ...e, ativo: true });
    carregar();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={mostrarInativas} onChange={e => setMostrarInativas(e.target.checked)} />
          Mostrar inativas
        </label>
        <button onClick={() => { setErro(''); setForm({ nome: '', cnpj: '', cidade: 'Curitiba' }); }} style={btnPrimario}>+ Nova Entidade</button>
      </div>
      <div style={cardEstilo}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Entidade', 'CNPJ', 'Cidade sede', 'Participantes', ''].map(h => <th key={h} style={thEstilo}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhuma entidade cadastrada.</td></tr>
            )}
            {visiveis.map(e => (
              <tr key={e.id} style={{ borderTop: '1px solid #f0f0f0', opacity: e.ativo ? 1 : 0.55 }}>
                <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{e.nome}{!e.ativo && <span style={{ fontWeight: 400, color: '#888' }}> (inativa)</span>}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{e.cnpj || '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{e.cidade || '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{e.participantes}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => { setErro(''); setForm({ ...e, cnpj: e.cnpj || '', cidade: e.cidade || '' }); }} style={btnAzul}>Editar</button>{' '}
                  <button onClick={() => alternarAtiva(e)} style={btnCinza}>{e.ativo ? 'Desativar' : 'Reativar'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal titulo={form.id ? 'Editar Entidade' : 'Nova Entidade'} onFechar={() => setForm(null)} largura={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nome da entidade</label>
              <input value={form.nome} onChange={ev => setForm(f => ({ ...f, nome: ev.target.value }))} style={estiloInput} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>CNPJ</label>
                <input value={form.cnpj} placeholder="00.000.000/0000-00" onChange={ev => setForm(f => ({ ...f, cnpj: formatarCnpjDigitado(ev.target.value) }))} style={estiloInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Cidade sede</label>
                <input value={form.cidade} onChange={ev => setForm(f => ({ ...f, cidade: ev.target.value }))} style={estiloInput} />
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: 0 }}>No Anexo XVII sai como: <b>{form.nome || 'NOME'}{form.cnpj ? ` - CNPJ ${form.cnpj}` : ''}</b></p>
            {form.id && form.participantes > 0 && <p style={{ fontSize: 11, color: '#ef6c00', margin: 0 }}>A alteração vale para os {form.participantes} participante(s) vinculado(s).</p>}
            {erro && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setForm(null)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={btnVerde}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </Modal>
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
    ['entidades', 'Entidades'],
    ['esportes', 'Esportes'],
    ['calendario', 'Calendário'],
    ['locais', 'Locais'],
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
      {aba === 'entidades' && <ListaEntidades />}
      {aba === 'esportes' && <ListaEsportes />}
      {aba === 'calendario' && <ListaCalendario />}
      {aba === 'locais' && <ListaLocaisTreino />}
    </div>
  );
}

export { estiloInput, btnPrimario, btnVerde, btnAzul, btnCinza, cardEstilo, thEstilo };
