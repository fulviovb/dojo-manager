import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ── Cores das faixas ──────────────────────────────────────────────────────────

const COR_FAIXA = {
  preta: '#1a1a1a', marrom: '#6D4C41', roxa: '#7B1FA2',
  verde: '#2E7D32', laranja: '#E65100', vermelha: '#C62828',
  amarela: '#F9A825', azul: '#1565C0', cinza: '#757575',
  branca: '#FFFFFF',
};

function corDaFaixa(nome = '') {
  const n = nome.toLowerCase();
  const ordem = ['preta', 'marrom', 'roxa', 'verde', 'laranja', 'vermelha', 'amarela', 'azul', 'cinza'];
  const cor = ordem.find(c => n.startsWith(c) || n.includes(` ${c}`)) || 'branca';
  return COR_FAIXA[cor] || '#FFFFFF';
}

function corTexto(cor) {
  if (!cor || cor === '#FFFFFF') return '#333';
  const r = parseInt(cor.slice(1, 3), 16);
  const g = parseInt(cor.slice(3, 5), 16);
  const b = parseInt(cor.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#333' : '#fff';
}

function FaixaChip({ nome, size = 'sm' }) {
  const bg = corDaFaixa(nome);
  const fg = corTexto(bg);
  const isWhite = bg === '#FFFFFF';
  const nomeLower = nome.toLowerCase();
  const temStripe = nomeLower.includes('- preta') || nomeLower.includes('- branca');
  const stripeCor = nomeLower.includes('- preta') ? '#1a1a1a' : '#ffffff';

  const h = size === 'lg' ? 32 : 22;
  const fontSize = size === 'lg' ? 13 : 11;
  const px = size === 'lg' ? 14 : 10;
  const stripeW = temStripe ? h + 4 : 0;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      height: h, borderRadius: 4, overflow: 'hidden',
      border: isWhite ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.18)',
      boxShadow: '0 2px 5px rgba(0,0,0,0.18)',
      fontWeight: 700, fontSize,
    }}>
      <div style={{ background: bg, color: fg, paddingLeft: px, paddingRight: temStripe ? 4 : px, height: '100%', display: 'flex', alignItems: 'center' }}>
        {nome}
      </div>
      {temStripe && (
        <div style={{ width: stripeW, height: '100%', background: stripeCor, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      )}
    </div>
  );
}

function BeltBar({ nome, size = 'md' }) {
  const bg = corDaFaixa(nome);
  const isWhite = bg === '#FFFFFF';
  const n = nome.toLowerCase();
  const temPreta = n.includes('- preta');
  const temBranca = n.includes('- branca') && !n.startsWith('branca');
  const graus = (n.match(/(\d+) grau/) || [])[1];
  const numGraus = graus ? parseInt(graus) : 0;

  const W = size === 'lg' ? 90 : 60;
  const H = size === 'lg' ? 28 : 20;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: W, height: H, position: 'relative', borderRadius: 4,
        overflow: 'hidden',
        border: isWhite ? '1.5px solid #bbb' : '1.5px solid rgba(0,0,0,0.2)',
        boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
      }}>
        {/* Corpo da faixa */}
        <div style={{ position: 'absolute', inset: 0, background: bg }} />
        {/* Costura central */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '48%', height: 1, background: 'rgba(0,0,0,0.08)' }} />
        {/* Ponta preta (Cinza-Preta etc) */}
        {temPreta && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: W * 0.28, background: '#1a1a1a' }} />}
        {/* Ponta branca (Cinza-Branca etc) */}
        {temBranca && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: W * 0.28, background: '#f5f5f5', borderLeft: '1px solid #ccc' }} />}
        {/* Graus (listras brancas) */}
        {numGraus > 0 && Array.from({ length: numGraus }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', right: 6 + i * 7, top: 3, bottom: 3,
            width: 4, background: 'rgba(255,255,255,0.85)', borderRadius: 1,
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#444', textAlign: 'center' }}>{nome}</div>
    </div>
  );
}

// ── Helpers de layout ─────────────────────────────────────────────────────────

const card = (extra = {}) => ({
  background: '#fff', borderRadius: 8,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  marginBottom: 16, ...extra,
});
const cardHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 18px', borderBottom: '1px solid #f0f0f0',
};
const cardTitle = { fontWeight: 700, fontSize: 15, color: '#1e2a38' };
const btnVerde = { background: '#2e7d32', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnAzul = { background: '#1565c0', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnCinza = { background: 'none', border: '1px solid #ccc', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnPerigo = { background: '#c62828', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 };
const estiloInput = { width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };

function formatData(d) {
  if (!d) return '—';
  const [y, m, dia] = d.split('-');
  return `${dia}/${m}/${y}`;
}

function formatMes(d) {
  if (!d) return '—';
  const [y, m] = d.split('-');
  const meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(m)]}/${y}`;
}

// ── Modal genérico ─────────────────────────────────────────────────────────────

function Modal({ titulo, onFechar, largura = 500, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, padding: '32px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 8, width: largura, maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{titulo}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, color: '#888' }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Seção: Graduação ──────────────────────────────────────────────────────────

function SecaoGraduacao({ dadosGraduacao, alunoId, escolaId, onRefresh }) {
  const [modalHistId, setModalHistId] = useState(null);
  const [modalNovaArteId, setModalNovaArteId] = useState(null);
  const [faixas, setFaixas] = useState([]);
  const [formGrad, setFormGrad] = useState({ faixa_id: '', data_inicio: '', observacao: '' });
  const [salvando, setSalvando] = useState(false);

  const abrirNovaGrad = (arteId) => {
    axios.get('/faixas').then(r => {
      setFaixas(r.data.filter(f => f.arte_marcial_id === arteId));
    });
    setFormGrad({ faixa_id: '', data_inicio: new Date().toISOString().slice(0, 10), observacao: '' });
    setModalNovaArteId(arteId);
  };

  const salvarGrad = async () => {
    setSalvando(true);
    try {
      await axios.post('/graduacoes', {
        aluno_id: alunoId,
        arte_marcial_id: modalNovaArteId,
        faixa_id: formGrad.faixa_id,
        data_inicio: formGrad.data_inicio,
        observacao: formGrad.observacao,
        atual: true,
      });
      setModalNovaArteId(null);
      onRefresh();
    } finally { setSalvando(false); }
  };

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Graduação Marcial</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {dadosGraduacao.map(({ arte, atual, historico, aulasDesdeGraduacao }) => (
          <div key={arte.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #f5f5f5', gap: 16, flexWrap: 'wrap' }}>
            {/* Arte marcial */}
            <div style={{ minWidth: 180, fontWeight: 600, fontSize: 13, color: '#1e2a38' }}>{arte.nome}</div>

            {/* Faixa atual */}
            {atual ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <BeltBar nome={atual.Faixa?.nome || ''} size="lg" />
                {/* Barra de progresso */}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>
                    {aulasDesdeGraduacao} aula{aulasDesdeGraduacao !== 1 ? 's' : ''} desde a graduação
                  </div>
                  <div style={{ height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden', maxWidth: 180 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (aulasDesdeGraduacao / 40) * 100)}%`,
                      background: corDaFaixa(atual.Faixa?.nome || ''),
                      borderRadius: 4,
                      minWidth: aulasDesdeGraduacao > 0 ? 4 : 0,
                      transition: 'width 0.4s',
                    }} />
                  </div>
                </div>
              </div>
            ) : (
              <span style={{ color: '#aaa', fontSize: 13, fontStyle: 'italic', flex: 1 }}>Sem graduação</span>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', gap: 6 }}>
              {historico.length > 0 && (
                <button style={btnAzul} onClick={() => setModalHistId(arte.id)}>Ver Histórico</button>
              )}
              <button style={btnVerde} onClick={() => abrirNovaGrad(arte.id)}>+ Graduação</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal histórico */}
      {modalHistId && (() => {
        const grupo = dadosGraduacao.find(g => g.arte.id === modalHistId);
        return (
          <Modal titulo={`Histórico — ${grupo?.arte.nome}`} onFechar={() => setModalHistId(null)} largura={500}>
            <div>
              {[...grupo.historico].reverse().map((h, i) => (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderBottom: i < grupo.historico.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}>
                  <BeltBar nome={h.Faixa?.nome || ''} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.Faixa?.nome}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {formatData(h.data_inicio)}{h.data_fim ? ` → ${formatData(h.data_fim)}` : ' → atual'}
                    </div>
                    {h.observacao && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{h.observacao}</div>}
                  </div>
                  {h.atual && <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>ATUAL</span>}
                </div>
              ))}
            </div>
          </Modal>
        );
      })()}

      {/* Modal nova graduação */}
      {modalNovaArteId && (
        <Modal titulo="Registrar Graduação" onFechar={() => setModalNovaArteId(null)} largura={420}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Faixa *</label>
              <select value={formGrad.faixa_id} onChange={e => setFormGrad(p => ({ ...p, faixa_id: e.target.value }))} style={estiloInput}>
                <option value="">Selecione...</option>
                {faixas.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              {/* Preview da faixa selecionada */}
              {formGrad.faixa_id && (() => {
                const f = faixas.find(x => x.id === formGrad.faixa_id);
                return f ? <div style={{ marginTop: 8 }}><BeltBar nome={f.nome} size="lg" /></div> : null;
              })()}
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Data de graduação</label>
              <input type="date" value={formGrad.data_inicio} onChange={e => setFormGrad(p => ({ ...p, data_inicio: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Observação</label>
              <input type="text" value={formGrad.observacao} onChange={e => setFormGrad(p => ({ ...p, observacao: e.target.value }))} style={estiloInput} placeholder="Opcional..." />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button style={btnCinza} onClick={() => setModalNovaArteId(null)}>Cancelar</button>
              <button style={btnVerde} disabled={!formGrad.faixa_id || salvando} onClick={salvarGrad}>
                {salvando ? 'Salvando...' : 'Confirmar Graduação'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Seção: Turmas ─────────────────────────────────────────────────────────────

function SecaoTurmas({ matriculas, alunoId, onRefresh }) {
  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Turmas Matriculadas</span>
      </div>
      <div style={{ padding: '8px 18px 12px' }}>
        {matriculas.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '8px 0' }}>Não matriculado em nenhuma turma.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                {['Turma', 'Arte Marcial', 'Faixa Atual', 'Desde'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriculas.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '8px 8px' }}>{m.Turma?.nome}</td>
                  <td style={{ padding: '8px 8px', color: '#666' }}>{m.Turma?.ArteMarcial?.nome || '—'}</td>
                  <td style={{ padding: '8px 8px' }}>
                    {m.FaixaAtual ? <FaixaChip nome={m.FaixaAtual.nome} /> : <span style={{ color: '#aaa', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 8px', color: '#888', fontSize: 12 }}>{formatData(m.data_matricula)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Seção: Frequência ─────────────────────────────────────────────────────────

function SecaoFrequencia({ chamadas }) {
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAG = 10;

  const filtradas = chamadas.filter(c => {
    const turma = c.Aula?.Turma?.nome || '';
    return turma.toLowerCase().includes(busca.toLowerCase()) || (c.Aula?.data || '').includes(busca);
  });
  const total = filtradas.length;
  const paginas = Math.ceil(total / POR_PAG);
  const slice = filtradas.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Histórico de Frequências</span>
        <span style={{ fontSize: 12, color: '#888' }}>{total} aulas</span>
      </div>
      <div style={{ padding: '10px 18px 14px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <input placeholder="Pesquise por turma ou data..." value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(1); }}
            style={{ ...estiloInput, maxWidth: 260 }} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              {['Data', 'Status', 'Turma'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#aaa' }}>Nenhum registro encontrado.</td></tr>
            )}
            {slice.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 ? '#fafafa' : '#fff' }}>
                <td style={{ padding: '7px 8px', fontWeight: 500 }}>{formatData(c.Aula?.data)}</td>
                <td style={{ padding: '7px 8px' }}>
                  <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                    Presente
                  </span>
                </td>
                <td style={{ padding: '7px 8px', color: '#555' }}>{c.Aula?.Turma?.nome || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginas > 1 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 10, alignItems: 'center' }}>
            <button style={btnCinza} disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>‹</button>
            <span style={{ fontSize: 12, color: '#666' }}>Pág. {pagina} de {paginas}</span>
            <button style={btnCinza} disabled={pagina === paginas} onClick={() => setPagina(p => p + 1)}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar: Dados Pessoais ───────────────────────────────────────────────────

const CAMPOS_COMPLETOS = [
  { k: 'matricula', l: 'Matrícula' },
  { k: 'email', l: 'Email' },
  { k: 'data_nascimento', l: 'Nascimento', fmt: formatData },
  { k: 'data_ingresso', l: 'Ingresso', fmt: formatData },
  { k: 'telefone', l: 'Telefone' },
  { k: 'cpf', l: 'CPF' },
  { k: 'rg', l: 'RG' },
  { k: 'genero', l: 'Gênero' },
  { k: 'naturalidade', l: 'Naturalidade' },
  { k: 'profissao', l: 'Profissão' },
];

const CAMPOS_ENDERECO = [
  { k: 'endereco', l: 'Endereço' }, { k: 'bairro', l: 'Bairro' },
  { k: 'cidade', l: 'Cidade' }, { k: 'estado', l: 'UF' }, { k: 'cep', l: 'CEP' },
];

const CAMPOS_FILIACAO = [{ k: 'mae', l: 'Mãe' }, { k: 'pai', l: 'Pai' }];

function LinhaInfo({ label, valor }) {
  if (!valor) return null;
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: '#888', minWidth: 80 }}>{label}:</span>
      <span style={{ color: '#222', fontWeight: 500, wordBreak: 'break-word' }}>{valor}</span>
    </div>
  );
}

function SecaoDadosPessoais({ aluno, onEditar }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Dados Pessoais</span>
        <button style={btnAzul} onClick={onEditar}>✎ Editar</button>
      </div>
      <div style={{ padding: '12px 18px' }}>
        <LinhaInfo label="Matrícula" valor={aluno.matricula} />
        <LinhaInfo label="Email" valor={aluno.email} />
        <LinhaInfo label="Nascimento" valor={formatData(aluno.data_nascimento)} />
        <LinhaInfo label="Telefone" valor={aluno.telefone} />
        {(aluno.cpf || aluno.rg) && (
          <LinhaInfo label="Documentos" valor={[aluno.cpf, aluno.rg].filter(Boolean).join(' · ')} />
        )}

        {!expandido && (
          <button onClick={() => setExpandido(true)} style={{ ...btnCinza, marginTop: 8, fontSize: 11 }}>
            Ver dados completos ▾
          </button>
        )}

        {expandido && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '10px 0' }} />
            {CAMPOS_COMPLETOS.filter(c => !['matricula', 'email', 'data_nascimento', 'telefone', 'cpf', 'rg'].includes(c.k)).map(c => (
              <LinhaInfo key={c.k} label={c.l} valor={c.fmt ? c.fmt(aluno[c.k]) : aluno[c.k]} />
            ))}
            {CAMPOS_ENDERECO.some(c => aluno[c.k]) && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, margin: '8px 0 4px' }}>Endereço</div>
                {CAMPOS_ENDERECO.map(c => <LinhaInfo key={c.k} label={c.l} valor={aluno[c.k]} />)}
              </>
            )}
            {(aluno.mae || aluno.pai) && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, margin: '8px 0 4px' }}>Filiação</div>
                {CAMPOS_FILIACAO.map(c => <LinhaInfo key={c.k} label={c.l} valor={aluno[c.k]} />)}
              </>
            )}
            {aluno.observacoes && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, margin: '8px 0 4px' }}>Observações</div>
                <div style={{ fontSize: 13, color: '#444', background: '#f9f9f9', padding: 8, borderRadius: 4 }}>{aluno.observacoes}</div>
              </>
            )}
            <button onClick={() => setExpandido(false)} style={{ ...btnCinza, marginTop: 10, fontSize: 11 }}>
              Recolher ▴
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sidebar: Mensalidades ─────────────────────────────────────────────────────

function SecaoMensalidades({ mensalidades, alunoId, onRefresh }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [form, setForm] = useState({ plano_id: '', mes_referencia: '', valor: '', status: 'pendente' });
  const [salvando, setSalvando] = useState(false);

  const abrirModal = () => {
    axios.get('/planos').then(r => setPlanos(r.data));
    setForm({ plano_id: '', mes_referencia: new Date().toISOString().slice(0, 7), valor: '', status: 'pendente' });
    setModalAberto(true);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await axios.post('/mensalidades', {
        aluno_id: alunoId,
        plano_id: form.plano_id || null,
        mes_referencia: form.mes_referencia + '-01',
        valor: parseFloat(form.valor) || 0,
        status: form.status,
      });
      setModalAberto(false);
      onRefresh();
    } finally { setSalvando(false); }
  };

  const statusCor = { pago: '#2e7d32', pendente: '#e65100', cancelado: '#c62828' };
  const statusBg = { pago: '#e8f5e9', pendente: '#fff3e0', cancelado: '#ffebee' };

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Assinaturas (Mensalidades)</span>
        <button style={btnVerde} onClick={abrirModal}>+ Novo</button>
      </div>
      <div style={{ padding: '8px 18px 12px' }}>
        {mensalidades.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '6px 0' }}>Sem plano de pagamento.</p>
        ) : (
          mensalidades.slice(0, 6).map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{formatMes(m.mes_referencia)}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{m.Plano?.nome || 'Sem plano'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>R$ {parseFloat(m.valor).toFixed(2)}</span>
                <span style={{ background: statusBg[m.status], color: statusCor[m.status], fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                  {m.status}
                </span>
              </div>
            </div>
          ))
        )}
        {mensalidades.length > 6 && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>+ {mensalidades.length - 6} anteriores</div>
        )}
      </div>

      {modalAberto && (
        <Modal titulo="Nova Mensalidade" onFechar={() => setModalAberto(false)} largura={380}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Plano</label>
              <select value={form.plano_id} onChange={e => {
                const p = planos.find(x => x.id === e.target.value);
                setForm(f => ({ ...f, plano_id: e.target.value, valor: p?.valor || f.valor }));
              }} style={estiloInput}>
                <option value="">Sem plano</option>
                {planos.map(p => <option key={p.id} value={p.id}>{p.nome} — R$ {parseFloat(p.valor).toFixed(2)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Mês referência</label>
              <input type="month" value={form.mes_referencia} onChange={e => setForm(f => ({ ...f, mes_referencia: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Valor (R$)</label>
              <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={estiloInput}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnCinza} onClick={() => setModalAberto(false)}>Cancelar</button>
              <button style={btnVerde} disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sidebar: Ocorrências ──────────────────────────────────────────────────────

function SecaoOcorrencias({ ocorrencias, alunoId, onRefresh }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    try {
      await axios.post('/ocorrencias', { aluno_id: alunoId, texto });
      setModalAberto(false);
      setTexto('');
      onRefresh();
    } finally { setSalvando(false); }
  };

  const remover = async (id) => {
    if (!window.confirm('Remover esta ocorrência?')) return;
    await axios.delete(`/ocorrencias/${id}`);
    onRefresh();
  };

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Ocorrências</span>
        <button style={btnVerde} onClick={() => { setTexto(''); setModalAberto(true); }}>✎ Nova</button>
      </div>
      <div style={{ padding: '8px 18px 12px' }}>
        {ocorrencias.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '6px 0' }}>Sem notas ou ocorrências registradas.</p>
        ) : (
          ocorrencias.map(o => (
            <div key={o.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div style={{ fontSize: 13, color: '#222', lineHeight: 1.5 }}>{o.texto}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
                    {o.Professor?.nome} · {new Date(o.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button onClick={() => remover(o.id)} style={btnPerigo} title="Remover">✕</button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalAberto && (
        <Modal titulo="Nova Ocorrência" onFechar={() => setModalAberto(false)} largura={420}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4}
              placeholder="Descreva a ocorrência, observação ou anotação sobre o aluno..."
              style={{ ...estiloInput, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnCinza} onClick={() => setModalAberto(false)}>Cancelar</button>
              <button style={btnVerde} disabled={!texto.trim() || salvando} onClick={salvar}>
                {salvando ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Modal edição de dados pessoais ────────────────────────────────────────────

const FORM_EDIT_CAMPOS = [
  ['Identificação', [
    { k: 'nome', l: 'Nome completo', req: true },
    { k: 'apelido', l: 'Apelido' }, { k: 'matricula', l: 'Matrícula' },
    { k: 'cpf', l: 'CPF' }, { k: 'rg', l: 'RG' },
    { k: 'genero', l: 'Gênero', tipo: 'select', opts: ['', 'Masculino', 'Feminino', 'Outro'] },
    { k: 'data_nascimento', l: 'Nascimento', tipo: 'date' },
    { k: 'naturalidade', l: 'Naturalidade' }, { k: 'profissao', l: 'Profissão' },
  ]],
  ['Contato', [
    { k: 'email', l: 'Email', tipo: 'email' }, { k: 'telefone', l: 'Telefone' },
    { k: 'data_ingresso', l: 'Data de ingresso', tipo: 'date' },
  ]],
  ['Endereço', [
    { k: 'endereco', l: 'Endereço' }, { k: 'bairro', l: 'Bairro' },
    { k: 'cidade', l: 'Cidade' }, { k: 'estado', l: 'UF' }, { k: 'cep', l: 'CEP' },
  ]],
  ['Filiação', [{ k: 'mae', l: 'Mãe' }, { k: 'pai', l: 'Pai' }]],
  ['Obs.', [{ k: 'observacoes', l: 'Observações', tipo: 'textarea' }]],
];

function ModalEditarAluno({ aluno, onFechar, onSalvo }) {
  const [form, setForm] = useState({ ...aluno });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      await axios.put(`/usuarios/${aluno.id}`, form);
      onSalvo();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao salvar');
    } finally { setSalvando(false); }
  };

  return (
    <Modal titulo="Editar Dados do Aluno" onFechar={onFechar} largura={640}>
      <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
        {FORM_EDIT_CAMPOS.map(([secao, campos]) => (
          <div key={secao} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>{secao}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {campos.map(c => (
                <div key={c.k} style={{ gridColumn: ['nome', 'endereco', 'observacoes'].includes(c.k) ? 'span 2' : undefined }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 3, color: '#555' }}>{c.l}{c.req ? ' *' : ''}</label>
                  {c.tipo === 'select' ? (
                    <select value={form[c.k] || ''} onChange={e => setForm(f => ({ ...f, [c.k]: e.target.value }))} style={estiloInput}>
                      {c.opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                    </select>
                  ) : c.tipo === 'textarea' ? (
                    <textarea rows={3} value={form[c.k] || ''} onChange={e => setForm(f => ({ ...f, [c.k]: e.target.value }))} style={{ ...estiloInput, resize: 'vertical' }} />
                  ) : (
                    <input type={c.tipo || 'text'} value={form[c.k] || ''} onChange={e => setForm(f => ({ ...f, [c.k]: e.target.value }))} style={estiloInput} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {erro && <p style={{ color: 'red', fontSize: 13, margin: '8px 0 0' }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
        <button style={btnCinza} onClick={onFechar}>Cancelar</button>
        <button style={btnAzul} disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
      </div>
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AlunoDetalhe({ alunoId, onVoltar }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    axios.get(`/usuarios/${alunoId}/perfil`)
      .then(r => setDados(r.data))
      .catch(() => setDados(null))
      .finally(() => setCarregando(false));
  }, [alunoId]);

  useEffect(() => { carregar(); }, [carregar]);

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#888' }}>
      Carregando...
    </div>
  );
  if (!dados) return (
    <div style={{ padding: 24, color: '#c00' }}>Erro ao carregar dados do aluno.</div>
  );

  const { aluno, graduacoes, matriculas, chamadas, mensalidades, ocorrencias } = dados;
  const faixaAtual = graduacoes.find(g => g.atual)?.atual?.Faixa || null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={onVoltar} style={{ ...btnCinza, marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          ← Voltar para lista
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 26, color: '#1e2a38' }}>{aluno.nome}</h1>
              {faixaAtual && <FaixaChip nome={faixaAtual.nome} size="lg" />}
            </div>
            <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>
              {[aluno.matricula, aluno.email].filter(Boolean).join(' · ')}
            </div>
          </div>
          {/* Avatar placeholder */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `linear-gradient(135deg, ${corDaFaixa(faixaAtual?.nome || '')} 0%, #1e2a38 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 22, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}>
            {aluno.nome[0].toUpperCase()}
          </div>
        </div>
      </div>

      {/* Layout 2 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* Coluna principal */}
        <div>
          <SecaoGraduacao dadosGraduacao={graduacoes} alunoId={alunoId} onRefresh={carregar} />
          <SecaoTurmas matriculas={matriculas} alunoId={alunoId} onRefresh={carregar} />
          <SecaoFrequencia chamadas={chamadas} />
        </div>

        {/* Sidebar */}
        <div>
          <SecaoDadosPessoais aluno={aluno} onEditar={() => setEditando(true)} />
          <SecaoMensalidades mensalidades={mensalidades} alunoId={alunoId} onRefresh={carregar} />
          <SecaoOcorrencias ocorrencias={ocorrencias} alunoId={alunoId} onRefresh={carregar} />
        </div>
      </div>

      {editando && (
        <ModalEditarAluno
          aluno={aluno}
          onFechar={() => setEditando(false)}
          onSalvo={() => { setEditando(false); carregar(); }}
        />
      )}
    </div>
  );
}
