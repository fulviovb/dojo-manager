import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Avatar from '../components/Avatar';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnPrimario  = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnSecundario = { padding: '6px 12px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer', fontSize: 12, background: '#fff' };
const btnPerigo    = { background: '#c62828', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnAzul      = { background: '#1565c0', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };

const FORM_VAZIO = {
  nome: '', apelido: '', email: '', senha: '',
  cpf: '', rg: '', genero: '', data_nascimento: '',
  data_ingresso: '', naturalidade: '', profissao: '',
  telefone: '', matricula: '',
  endereco: '', bairro: '', cep: '', cidade: '', estado: '',
  mae: '', pai: '', observacoes: '', foto_url: '',
};

function Campo({ label, campo, form, setForm, type = 'text', required = false, spanAll = false }) {
  return (
    <div style={{ gridColumn: spanAll ? 'span 2' : undefined }}>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 3, color: '#555' }}>{label}{required && ' *'}</label>
      {campo === 'observacoes' ? (
        <textarea rows={3} value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))} style={{ ...estiloInput, resize: 'vertical' }} />
      ) : campo === 'genero' ? (
        <select value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))} style={estiloInput}>
          <option value="">—</option>
          <option>Masculino</option><option>Feminino</option><option>Outro</option>
        </select>
      ) : (
        <input type={type} required={required} value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))} style={estiloInput} />
      )}
    </div>
  );
}

function CampoFoto({ fotoUrl, nome, alunoId, onEnviada }) {
  const [enviando, setEnviando] = useState(false);
  const [erroFoto, setErroFoto] = useState('');
  const inputRef = useRef(null);

  const escolherArquivo = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    setEnviando(true); setErroFoto('');
    try {
      const formData = new FormData();
      formData.append('foto', arquivo);
      const r = await axios.post(`/usuarios/${alunoId}/foto`, formData);
      onEnviada(r.data.foto_url);
    } catch (ex) { setErroFoto(ex.response?.data?.erro || 'Erro ao enviar foto'); }
    finally { setEnviando(false); if (inputRef.current) inputRef.current.value = ''; }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <Avatar fotoUrl={fotoUrl} nome={nome} tamanho={56} />
      <div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={escolherArquivo} disabled={enviando} style={{ fontSize: 12 }} />
        {enviando && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Enviando...</div>}
        {erroFoto && <div style={{ fontSize: 12, color: 'red', marginTop: 2 }}>{erroFoto}</div>}
      </div>
    </div>
  );
}

function Modal({ titulo, onFechar, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 28, width: 680, maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{titulo}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormularioAluno({ form, setForm, erro, onSubmit, onCancelar, isEdicao, alunoId, onFotoEnviada }) {
  const secao = (titulo) => (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 8, marginTop: 8, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
      {titulo}
    </div>
  );
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 };

  return (
    <form onSubmit={onSubmit}>
      {isEdicao && alunoId && (
        <CampoFoto fotoUrl={form.foto_url} nome={form.nome} alunoId={alunoId} onEnviada={onFotoEnviada} />
      )}
      {secao('Identificação')}
      <div style={grid2}>
        <Campo label="Nome completo" campo="nome" form={form} setForm={setForm} required spanAll />
        <Campo label="Apelido" campo="apelido" form={form} setForm={setForm} />
        <Campo label="Matrícula" campo="matricula" form={form} setForm={setForm} />
        <Campo label="CPF" campo="cpf" form={form} setForm={setForm} />
        <Campo label="RG" campo="rg" form={form} setForm={setForm} />
        <Campo label="Gênero" campo="genero" form={form} setForm={setForm} />
        <Campo label="Nascimento" campo="data_nascimento" form={form} setForm={setForm} type="date" />
        <Campo label="Naturalidade" campo="naturalidade" form={form} setForm={setForm} />
        <Campo label="Profissão" campo="profissao" form={form} setForm={setForm} />
      </div>

      {secao('Contato e Acesso')}
      <div style={grid2}>
        <Campo label="Email" campo="email" form={form} setForm={setForm} type="email" required />
        <Campo label={isEdicao ? 'Nova senha (em branco = não altera)' : 'Senha *'} campo="senha" form={form} setForm={setForm} type="password" />
        <Campo label="Telefone" campo="telefone" form={form} setForm={setForm} />
        <Campo label="Data de ingresso" campo="data_ingresso" form={form} setForm={setForm} type="date" />
      </div>

      {secao('Endereço')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 10, marginBottom: 10 }}>
        <div style={{ gridColumn: 'span 4' }}><Campo label="Endereço" campo="endereco" form={form} setForm={setForm} /></div>
        <Campo label="Bairro" campo="bairro" form={form} setForm={setForm} />
        <Campo label="Cidade" campo="cidade" form={form} setForm={setForm} />
        <Campo label="CEP" campo="cep" form={form} setForm={setForm} />
        <Campo label="UF" campo="estado" form={form} setForm={setForm} />
      </div>

      {secao('Filiação')}
      <div style={grid2}>
        <Campo label="Mãe" campo="mae" form={form} setForm={setForm} />
        <Campo label="Pai" campo="pai" form={form} setForm={setForm} />
      </div>

      {secao('Observações')}
      <div style={{ marginBottom: 12 }}>
        <Campo label="" campo="observacoes" form={form} setForm={setForm} />
      </div>

      {erro && <p style={{ color: 'red', fontSize: 13, margin: '0 0 10px' }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancelar} style={btnSecundario}>Cancelar</button>
        <button type="submit" style={btnPrimario}>{isEdicao ? 'Salvar alterações' : 'Cadastrar aluno'}</button>
      </div>
    </form>
  );
}

export default function Alunos({ onVerAluno }) {
  const [alunos, setAlunos] = useState([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('ativos'); // 'ativos' | 'inativos' | 'todos'
  const [graduacoes, setGraduacoes] = useState([]);
  const [sortCol, setSortCol] = useState('nome');
  const [sortDir, setSortDir] = useState('asc');

  const carregar = () => {
    const ativoParam = filtro === 'inativos' ? '&ativo=false' : filtro === 'todos' ? '&ativo=todos' : '';
    axios.get(`/usuarios?role=aluno${ativoParam}`).then(r => setAlunos(r.data));
  };
  useEffect(carregar, [filtro]);
  useEffect(() => { axios.get('/graduacoes').then(r => setGraduacoes(r.data)); }, []);

  const artesPorAluno = useMemo(() => {
    const mapa = {};
    graduacoes.forEach(g => {
      const nomeArte = g.ArteMarcial?.nome;
      if (!nomeArte) return;
      (mapa[g.aluno_id] ??= new Set()).add(nomeArte);
    });
    const resultado = {};
    Object.keys(mapa).forEach(id => { resultado[id] = [...mapa[id]].sort().join(', '); });
    return resultado;
  }, [graduacoes]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setErro('');
    setModalNovo(true);
  };

  const abrirEditar = (a) => {
    const f = { ...FORM_VAZIO };
    Object.keys(FORM_VAZIO).forEach(k => { f[k] = a[k] ?? ''; });
    f.senha = '';
    setForm(f);
    setErro('');
    setAlunoEditando(a);
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      if (!form.senha) return setErro('Senha é obrigatória');
      await axios.post('/usuarios', { ...form, role: 'aluno' });
      setModalNovo(false);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  const handleAtualizar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const payload = { ...form };
      if (!payload.senha) delete payload.senha;
      await axios.put(`/usuarios/${alunoEditando.id}`, payload);
      setAlunoEditando(null);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  const handleDesativar = async (aluno) => {
    await axios.delete(`/usuarios/${aluno.id}`);
    carregar();
  };

  const handleAtivar = async (aluno) => {
    await axios.put(`/usuarios/${aluno.id}`, { ativo: true });
    carregar();
  };

  const handleFotoEnviada = (foto_url) => {
    setForm(f => ({ ...f, foto_url }));
    carregar();
  };

  const filtrados = alunos
    .filter(a =>
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(busca.toLowerCase()) ||
      (a.matricula || '').toLowerCase().includes(busca.toLowerCase()) ||
      (a.apelido || '').toLowerCase().includes(busca.toLowerCase())
    )
    .map(a => ({ ...a, artes: artesPorAluno[a.id] || '' }));

  const ordenados = [...filtrados].sort((a, b) => {
    const va = (a[sortCol] || '').toString().toLowerCase();
    const vb = (b[sortCol] || '').toString().toLowerCase();
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const COLUNAS = [
    { key: null, label: '' },
    { key: 'nome', label: 'Nome' },
    { key: 'apelido', label: 'Apelido' },
    { key: 'matricula', label: 'Matrícula' },
    { key: 'artes', label: 'Artes Marciais' },
    { key: null, label: '' },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input placeholder="Buscar por nome, apelido, email ou matrícula..." value={busca}
            onChange={e => setBusca(e.target.value)} style={{ ...estiloInput, maxWidth: 340 }} />
          <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
            {[['ativos', 'Ativos'], ['inativos', 'Inativos'], ['todos', 'Todos']].map(([valor, rotulo]) => (
              <button key={valor} onClick={() => setFiltro(valor)}
                style={{
                  padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                  background: filtro === valor ? '#1e2a38' : '#fff', color: filtro === valor ? '#fff' : '#555',
                }}>
                {rotulo}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#888', whiteSpace: 'nowrap' }}>{filtrados.length} aluno{filtrados.length !== 1 ? 's' : ''}</span>
          <button style={btnPrimario} onClick={abrirNovo}>+ Novo Aluno</button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {COLUNAS.map((c, i) => (
                <th key={i} onClick={() => c.key && handleSort(c.key)}
                  style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    cursor: c.key ? 'pointer' : 'default', userSelect: 'none',
                  }}>
                  {c.label}{c.key && sortCol === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.length === 0 && (
              <tr><td colSpan={COLUNAS.length} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhum aluno encontrado.</td></tr>
            )}
            {ordenados.map(a => (
              <tr key={a.id} style={{ borderTop: '1px solid #f0f0f0' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '8px 0 8px 16px' }}>
                  <Avatar fotoUrl={a.foto_url} nome={a.nome} tamanho={32} />
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <button onClick={() => onVerAluno?.(a.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#1565c0', padding: 0, textAlign: 'left' }}>
                    {a.nome}
                  </button>
                </td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{a.apelido || '—'}</td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{a.matricula || '—'}</td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{a.artes || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onVerAluno?.(a.id)} style={btnAzul} title="Ver perfil">Ver</button>
                    <button onClick={() => abrirEditar(a)} style={btnSecundario} title="Editar">✎</button>
                    {a.ativo ? (
                      <button onClick={() => handleDesativar(a)} style={btnPerigo} title="Desativar">Desativar</button>
                    ) : (
                      <button onClick={() => handleAtivar(a)} style={btnAzul} title="Ativar">Ativar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo aluno */}
      {modalNovo && (
        <Modal titulo="Novo Aluno" onFechar={() => setModalNovo(false)}>
          <FormularioAluno form={form} setForm={setForm} erro={erro}
            onSubmit={handleCadastrar} onCancelar={() => setModalNovo(false)} isEdicao={false} />
        </Modal>
      )}

      {/* Modal: Editar aluno */}
      {alunoEditando && (
        <Modal titulo={`Editar: ${alunoEditando.nome}`} onFechar={() => setAlunoEditando(null)}>
          <FormularioAluno form={form} setForm={setForm} erro={erro}
            onSubmit={handleAtualizar} onCancelar={() => setAlunoEditando(null)} isEdicao={true}
            alunoId={alunoEditando.id} onFotoEnviada={handleFotoEnviada} />
        </Modal>
      )}
    </div>
  );
}
