import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  mae: '', pai: '', observacoes: '',
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

function FormularioAluno({ form, setForm, erro, onSubmit, onCancelar, isEdicao }) {
  const secao = (titulo) => (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 8, marginTop: 8, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
      {titulo}
    </div>
  );
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 };

  return (
    <form onSubmit={onSubmit}>
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
  const [confirmExcluir, setConfirmExcluir] = useState(null);

  const carregar = () => { axios.get('/usuarios?role=aluno').then(r => setAlunos(r.data)); };
  useEffect(carregar, []);

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

  const confirmarExcluir = async () => {
    await axios.delete(`/usuarios/${confirmExcluir.id}`);
    setConfirmExcluir(null);
    carregar();
  };

  const filtrados = alunos.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(busca.toLowerCase()) ||
    (a.matricula || '').toLowerCase().includes(busca.toLowerCase()) ||
    (a.apelido || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <input placeholder="Buscar por nome, apelido, email ou matrícula..." value={busca}
          onChange={e => setBusca(e.target.value)} style={{ ...estiloInput, maxWidth: 340 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#888' }}>{filtrados.length} aluno{filtrados.length !== 1 ? 's' : ''}</span>
          <button style={btnPrimario} onClick={abrirNovo}>+ Novo Aluno</button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {['Nome', 'Apelido', 'Matrícula', 'Telefone', 'Ingresso', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>Nenhum aluno encontrado.</td></tr>
            )}
            {filtrados.map(a => (
              <tr key={a.id} style={{ borderTop: '1px solid #f0f0f0' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '10px 16px' }}>
                  <button onClick={() => onVerAluno?.(a.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#1565c0', padding: 0, textAlign: 'left' }}>
                    {a.nome}
                  </button>
                </td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{a.apelido || '—'}</td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{a.matricula || '—'}</td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>{a.telefone || '—'}</td>
                <td style={{ padding: '10px 16px', color: '#666', fontSize: 13 }}>
                  {a.data_ingresso ? a.data_ingresso.split('-').reverse().join('/') : '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onVerAluno?.(a.id)} style={btnAzul} title="Ver perfil">Ver</button>
                    <button onClick={() => abrirEditar(a)} style={btnSecundario} title="Editar">✎</button>
                    <button onClick={() => setConfirmExcluir(a)} style={btnPerigo} title="Excluir">✕</button>
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
            onSubmit={handleAtualizar} onCancelar={() => setAlunoEditando(null)} isEdicao={true} />
        </Modal>
      )}

      {/* Diálogo: Confirmar exclusão */}
      {confirmExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 28, maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px', color: '#c62828' }}>Confirmar exclusão</h3>
            <p style={{ margin: '0 0 20px', color: '#444' }}>
              Deseja desativar o aluno <strong>{confirmExcluir.nome}</strong>? Esta ação pode ser revertida por um administrador.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmExcluir(null)} style={btnSecundario}>Cancelar</button>
              <button onClick={confirmarExcluir} style={btnPerigo}>Sim, excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
