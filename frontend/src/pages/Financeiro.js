import React, { useState, useEffect } from 'react';
import axios from 'axios';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const estiloBtnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const STATUS_COR = { pendente: '#e65100', pago: '#2e7d32', cancelado: '#888' };

function Modal({ titulo, onFechar, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 440, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{titulo}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Financeiro() {
  const [aba, setAba] = useState('mensalidades');
  const [planos, setPlanos] = useState([]);
  const [mensalidades, setMensalidades] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [modalMens, setModalMens] = useState(false);
  const [modalPgto, setModalPgto] = useState(null);
  const [modalPlano, setModalPlano] = useState(false);
  const [formMens, setFormMens] = useState({ aluno_id: '', plano_id: '', mes_referencia: '', valor: '', desconto: 0 });
  const hoje = new Date(); hoje.setMinutes(hoje.getMinutes() - hoje.getTimezoneOffset());
  const [formPgto, setFormPgto] = useState({ valor_pago: '', data_pagamento: hoje.toISOString().split('T')[0], forma_pagamento: 'pix' });
  const [formPlano, setFormPlano] = useState({ nome: '', valor: '', descricao: '' });
  const [erro, setErro] = useState('');

  const carregar = () => {
    axios.get('/planos').then(r => setPlanos(r.data));
    axios.get('/mensalidades').then(r => setMensalidades(r.data));
    axios.get('/usuarios?role=aluno').then(r => setAlunos(r.data));
  };
  useEffect(carregar, []);

  const salvarMensalidade = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await axios.post('/mensalidades', { ...formMens, mes_referencia: formMens.mes_referencia + '-01' });
      setModalMens(false);
      setFormMens({ aluno_id: '', plano_id: '', mes_referencia: '', valor: '', desconto: 0 });
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  const salvarPlano = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await axios.post('/planos', formPlano);
      setModalPlano(false);
      setFormPlano({ nome: '', valor: '', descricao: '' });
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  const registrarPagamento = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await axios.post('/pagamentos', { ...formPgto, mensalidade_id: modalPgto.id });
      setModalPgto(null);
      carregar();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {['mensalidades', 'planos'].map(a => (
          <button key={a} onClick={() => setAba(a)}
            style={{ padding: '8px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13,
              background: aba === a ? '#1e2a38' : '#e0e0e0', color: aba === a ? '#fff' : '#333' }}>
            {a === 'mensalidades' ? 'Mensalidades' : 'Planos'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {aba === 'mensalidades' && <button style={estiloBtnPrimario} onClick={() => setModalMens(true)}>+ Nova Mensalidade</button>}
        {aba === 'planos' && <button style={estiloBtnPrimario} onClick={() => setModalPlano(true)}>+ Novo Plano</button>}
      </div>

      {aba === 'mensalidades' && (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {['Aluno', 'Plano', 'Mes', 'Valor', 'Status', 'Acoes'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mensalidades.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#888' }}>Nenhuma mensalidade cadastrada.</td></tr>
              )}
              {mensalidades.map(m => (
                <tr key={m.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 16px' }}>{m.Aluno?.nome}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{m.Plano?.nome}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{m.mes_referencia?.slice(0,7)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>R$ {Number(m.valor).toFixed(2)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ color: STATUS_COR[m.status], fontWeight: 600, fontSize: 12 }}>{m.status.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {m.status === 'pendente' && (
                      <button onClick={() => { setModalPgto(m); setFormPgto(p => ({ ...p, valor_pago: m.valor })); }}
                        style={{ fontSize: 12, padding: '4px 10px', background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: 4, cursor: 'pointer', color: '#2e7d32' }}>
                        Registrar pgto
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aba === 'planos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {planos.length === 0 && <p style={{ color: '#888' }}>Nenhum plano cadastrado.</p>}
          {planos.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1e2a38' }}>R$ {Number(p.valor).toFixed(2)}</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{p.nome}</div>
              {p.descricao && <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{p.descricao}</div>}
            </div>
          ))}
        </div>
      )}

      {modalMens && (
        <Modal titulo="Nova Mensalidade" onFechar={() => setModalMens(false)}>
          <form onSubmit={salvarMensalidade}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Aluno</label>
              <select required value={formMens.aluno_id} onChange={e => setFormMens(p => ({ ...p, aluno_id: e.target.value }))} style={estiloInput}>
                <option value="">Selecione...</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Plano</label>
              <select required value={formMens.plano_id} onChange={e => {
                const plano = planos.find(x => x.id === e.target.value);
                setFormMens(f => ({ ...f, plano_id: e.target.value, valor: plano?.valor || '' }));
              }} style={estiloInput}>
                <option value="">Selecione...</option>
                {planos.map(p => <option key={p.id} value={p.id}>{p.nome} - R$ {Number(p.valor).toFixed(2)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Mes de referencia</label>
              <input type="month" required value={formMens.mes_referencia} onChange={e => setFormMens(p => ({ ...p, mes_referencia: e.target.value }))} style={estiloInput} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Valor (R$)</label>
              <input type="number" step="0.01" required value={formMens.valor} onChange={e => setFormMens(p => ({ ...p, valor: e.target.value }))} style={estiloInput} />
            </div>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setModalMens(false)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={estiloBtnPrimario}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {modalPlano && (
        <Modal titulo="Novo Plano" onFechar={() => setModalPlano(false)}>
          <form onSubmit={salvarPlano}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Nome</label>
              <input required value={formPlano.nome} onChange={e => setFormPlano(p => ({ ...p, nome: e.target.value }))} style={estiloInput} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Valor (R$)</label>
              <input type="number" step="0.01" required value={formPlano.valor} onChange={e => setFormPlano(p => ({ ...p, valor: e.target.value }))} style={estiloInput} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Descricao</label>
              <input value={formPlano.descricao} onChange={e => setFormPlano(p => ({ ...p, descricao: e.target.value }))} style={estiloInput} />
            </div>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setModalPlano(false)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={estiloBtnPrimario}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {modalPgto && (
        <Modal titulo={"Pagamento - " + modalPgto.Aluno?.nome} onFechar={() => setModalPgto(null)}>
          <form onSubmit={registrarPagamento}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Valor pago (R$)</label>
              <input type="number" step="0.01" required value={formPgto.valor_pago} onChange={e => setFormPgto(p => ({ ...p, valor_pago: e.target.value }))} style={estiloInput} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Data do pagamento</label>
              <input type="date" required value={formPgto.data_pagamento} onChange={e => setFormPgto(p => ({ ...p, data_pagamento: e.target.value }))} style={estiloInput} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Forma de pagamento</label>
              <select value={formPgto.forma_pagamento} onChange={e => setFormPgto(p => ({ ...p, forma_pagamento: e.target.value }))} style={estiloInput}>
                {['pix', 'dinheiro', 'cartao_debito', 'cartao_credito', 'transferencia'].map(f => (
                  <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            {erro && <p style={{ color: 'red', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setModalPgto(null)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={estiloBtnPrimario}>Confirmar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
