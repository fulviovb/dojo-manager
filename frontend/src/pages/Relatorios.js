import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { corDaFaixa } from '../utils/faixaCores';

const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnVerde = { background: '#2e7d32', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const cardEstilo = { background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' };
const cardHeader = { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 14, color: '#1e2a38' };
const cardBody = { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 };
const rotulo = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 };
const linhaRadio = { display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 };

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function abrirRelatorio(tipo, params) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))).toString();
  window.open(`${window.location.origin}/relatorio/${tipo}?${qs}`, '_blank');
}

function Card({ titulo, children }) {
  return (
    <div style={cardEstilo}>
      <div style={cardHeader}>{titulo}</div>
      <div style={cardBody}>{children}</div>
    </div>
  );
}

function RadioSimNao({ label, value, onChange }) {
  return (
    <div>
      <span style={rotulo}>{label}</span>
      <div style={linhaRadio}>
        <label><input type="radio" checked={value === true} onChange={() => onChange(true)} /> Sim</label>
        <label><input type="radio" checked={value === false} onChange={() => onChange(false)} /> Não</label>
      </div>
    </div>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────────

function CardAlunosPorGraduacao({ artes }) {
  const [arteId, setArteId] = useState('');
  const [exibirTurmas, setExibirTurmas] = useState(false);
  return (
    <Card titulo="Alunos por Graduação">
      <div>
        <span style={rotulo}>Programa Marcial</span>
        <select value={arteId} onChange={e => setArteId(e.target.value)} style={estiloInput}>
          <option value="">Todas</option>
          {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <RadioSimNao label="Exibir Turmas?" value={exibirTurmas} onChange={setExibirTurmas} />
      <button style={btnVerde} onClick={() => abrirRelatorio('alunos-por-graduacao', { arte_marcial_id: arteId, exibir_turmas: exibirTurmas })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardAlunosPorTurma({ turmas }) {
  const [turmaId, setTurmaId] = useState('');
  const [comPlano, setComPlano] = useState(false);
  return (
    <Card titulo="Alunos por Turma-Horário">
      <div>
        <span style={rotulo}>Turma de Treino</span>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} style={estiloInput}>
          <option value="">Selecione...</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome.split('\n')[0]}</option>)}
        </select>
      </div>
      <RadioSimNao label="Plano de Pagamento?" value={comPlano} onChange={setComPlano} />
      <button style={btnVerde} disabled={!turmaId} onClick={() => abrirRelatorio('alunos-por-turma', { turma_id: turmaId, plano_pagamento: comPlano })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardFichaCadastral({ alunos }) {
  const [alunoId, setAlunoId] = useState('');
  return (
    <Card titulo="Ficha Cadastral Resumida">
      <div>
        <span style={rotulo}>Pessoa</span>
        <select value={alunoId} onChange={e => setAlunoId(e.target.value)} style={estiloInput}>
          <option value="">Selecione...</option>
          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}{a.matricula ? ` (${a.matricula})` : ''}</option>)}
        </select>
      </div>
      <button style={btnVerde} disabled={!alunoId} onClick={() => abrirRelatorio('ficha-cadastral', { aluno_id: alunoId })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardFrequenciaTurma({ turmas }) {
  const [turmaId, setTurmaId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [modo, setModo] = useState('quantitativo');
  return (
    <Card titulo="Aulas & Frequências (Turma)">
      <div>
        <span style={rotulo}>Turma de Treino</span>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} style={estiloInput}>
          <option value="">Selecione...</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome.split('\n')[0]}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Início</span>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={estiloInput} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Fim</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={estiloInput} />
        </div>
      </div>
      <div>
        <span style={rotulo}>Formato</span>
        <div style={linhaRadio}>
          <label><input type="radio" checked={modo === 'relacao'} onChange={() => setModo('relacao')} /> Relação</label>
          <label><input type="radio" checked={modo === 'quantitativo'} onChange={() => setModo('quantitativo')} /> Quantitativo</label>
        </div>
      </div>
      <button style={btnVerde} disabled={!turmaId} onClick={() => abrirRelatorio('frequencia-turma', { turma_id: turmaId, inicio, fim, modo })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardFrequenciaAluno({ alunos }) {
  const [alunoId, setAlunoId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  return (
    <Card titulo="Aulas & Frequências (Alunos)">
      <div>
        <span style={rotulo}>Pessoa</span>
        <select value={alunoId} onChange={e => setAlunoId(e.target.value)} style={estiloInput}>
          <option value="">Selecione...</option>
          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Início</span>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={estiloInput} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Fim</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={estiloInput} />
        </div>
      </div>
      <button style={btnVerde} disabled={!alunoId} onClick={() => abrirRelatorio('frequencia-aluno', { aluno_id: alunoId, inicio, fim })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardAniversariantes() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  return (
    <Card titulo="Aniversariantes por mês">
      <div>
        <span style={rotulo}>Mês</span>
        <select value={mes} onChange={e => setMes(e.target.value)} style={estiloInput}>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>
      <button style={btnVerde} onClick={() => abrirRelatorio('aniversariantes', { mes })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardPresencaMinima({ artes }) {
  const [arteId, setArteId] = useState('');
  return (
    <Card titulo="Frequência: Presença Mínima">
      <div>
        <span style={rotulo}>Programa Marcial</span>
        <select value={arteId} onChange={e => setArteId(e.target.value)} style={estiloInput}>
          <option value="">Todas</option>
          {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Alunos que atingiram a frequência mínima da graduação.</p>
      <button style={btnVerde} onClick={() => abrirRelatorio('presenca-minima', { arte_marcial_id: arteId })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardFrequenciaPercentual({ artes, turmas }) {
  const [arteId, setArteId] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('percentual');
  return (
    <Card titulo="Frequência: % de Presença">
      <div>
        <span style={rotulo}>Programa Marcial</span>
        <select value={arteId} onChange={e => setArteId(e.target.value)} style={estiloInput}>
          <option value="">Todas</option>
          {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <div>
        <span style={rotulo}>Turma</span>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} style={estiloInput}>
          <option value="">Todas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome.split('\n')[0]}</option>)}
        </select>
      </div>
      <div>
        <span style={rotulo}>Ordenar por</span>
        <select value={ordenarPor} onChange={e => setOrdenarPor(e.target.value)} style={estiloInput}>
          <option value="percentual">Percentual</option>
          <option value="nome">Nome do aluno</option>
          <option value="faixa">Graduação (faixa atual)</option>
        </select>
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Todos os alunos ativos e o % de carência cumprida na faixa atual.</p>
      <button style={btnVerde} onClick={() => abrirRelatorio('frequencia-percentual', { arte_marcial_id: arteId, turma_id: turmaId, ordenar_por: ordenarPor })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardFinanceiro({ turmas, planos }) {
  const [turmaId, setTurmaId] = useState('');
  const [planoId, setPlanoId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [percentualContratante, setPercentualContratante] = useState('');
  return (
    <Card titulo="Financeiro: Pagamentos">
      <div>
        <span style={rotulo}>Turma de Treino</span>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} style={estiloInput}>
          <option value="">Todas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome.split('\n')[0]}</option>)}
        </select>
      </div>
      <div>
        <span style={rotulo}>Plano de Pagamento</span>
        <select value={planoId} onChange={e => setPlanoId(e.target.value)} style={estiloInput}>
          <option value="">Todos</option>
          {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Início</span>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={estiloInput} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={rotulo}>Fim</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={estiloInput} />
        </div>
      </div>
      <div>
        <span style={rotulo}>% do Contratante</span>
        <input type="number" min="0" max="100" step="0.01" placeholder="0" value={percentualContratante}
          onChange={e => setPercentualContratante(e.target.value)} style={estiloInput} />
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Pagamentos recebidos no período, com resumo de arrecadação e inadimplência do recorte.</p>
      <button style={btnVerde} onClick={() => abrirRelatorio('financeiro', { turma_id: turmaId, plano_id: planoId, inicio, fim, percentual_contratante: percentualContratante })}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardAlunosSemPlano() {
  return (
    <Card titulo="Alunos sem Plano de Assinatura">
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Alunos ativos que nunca tiveram nenhum plano de assinatura cadastrado.</p>
      <button style={btnVerde} onClick={() => abrirRelatorio('alunos-sem-plano', {})}>+ Gerar Relatório</button>
    </Card>
  );
}

function CardAlunosSemTurma() {
  return (
    <Card titulo="Lista de Ex-Alunos">
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Alunos marcados como inativos, ordenados pela presença mais recente.</p>
      <button style={btnVerde} onClick={() => abrirRelatorio('alunos-sem-turma', {})}>+ Gerar Relatório</button>
    </Card>
  );
}

// Exame de faixa: escolhe a arte, abre a lista de alunos dela com checkbox e
// gera o relatório só com os marcados. A lista mostra faixa e carência pra
// ajudar a decidir — o relatório em si traz idade, faixa atual/pretendida e
// aulas na faixa atual.
function CardExameFaixa({ artes }) {
  const [arteId, setArteId] = useState('');
  const [aberto, setAberto] = useState(false);
  const [alunos, setAlunos] = useState(null);
  const [erro, setErro] = useState('');
  const [marcados, setMarcados] = useState(new Set());
  const [busca, setBusca] = useState('');

  const abrir = () => {
    setAberto(true); setAlunos(null); setErro(''); setMarcados(new Set()); setBusca('');
    axios.get(`/relatorios/exame-faixa?arte_marcial_id=${arteId}`)
      .then(r => setAlunos(r.data.alunos))
      .catch(ex => setErro(ex.response?.data?.erro || 'Não foi possível carregar os alunos.'));
  };
  const alternar = (id) => setMarcados(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const normalizar = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const visiveis = (alunos || []).filter(a => normalizar(a.nome).includes(normalizar(busca)));
  const marcarVarios = (lista, valor) => setMarcados(prev => {
    const n = new Set(prev);
    lista.forEach(a => (valor ? n.add(a.id) : n.delete(a.id)));
    return n;
  });
  const atingiram = visiveis.filter(a => a.min_aulas != null && a.aulas_na_faixa >= a.min_aulas);
  const gerar = () => {
    // mantém a ordem da lista (por graduação)
    const ids = (alunos || []).filter(a => marcados.has(a.id)).map(a => a.id);
    abrirRelatorio('exame-faixa', { arte_marcial_id: arteId, aluno_ids: ids.join(',') });
  };
  const btnLink = { background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 12, padding: 0 };

  return (
    <Card titulo="Exame de Faixa">
      <div>
        <span style={rotulo}>Programa Marcial</span>
        <select value={arteId} onChange={e => setArteId(e.target.value)} style={estiloInput}>
          <option value="">Selecione...</option>
          {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Marque os alunos que vão fazer o exame: nome, idade, graduação atual e pretendida e aulas na faixa atual.</p>
      <button style={btnVerde} disabled={!arteId} onClick={abrir}>Selecionar alunos</button>

      {aberto && (
        <div onClick={() => setAberto(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, width: 620, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 15 }}>Exame de Faixa — {artes.find(a => a.id === arteId)?.nome}</strong>
              <button onClick={() => setAberto(false)} style={{ ...btnLink, fontSize: 20, color: '#888' }} aria-label="Fechar">×</button>
            </div>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="Buscar aluno..." value={busca} onChange={e => setBusca(e.target.value)} style={estiloInput} />
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <button style={btnLink} onClick={() => marcarVarios(visiveis, true)}>Marcar todos</button>
                <button style={btnLink} onClick={() => marcarVarios(visiveis, false)}>Desmarcar todos</button>
                <button style={btnLink} onClick={() => marcarVarios(atingiram, true)} disabled={!atingiram.length}>Marcar quem atingiu a carência ({atingiram.length})</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {erro && <p style={{ color: '#c62828', padding: '0 18px' }}>{erro}</p>}
              {!erro && !alunos && <p style={{ color: '#888', padding: '0 18px' }}>Carregando...</p>}
              {alunos && visiveis.length === 0 && <p style={{ color: '#888', padding: '0 18px' }}>Nenhum aluno encontrado.</p>}
              {visiveis.map(a => {
                const ok = a.min_aulas != null && a.aulas_na_faixa >= a.min_aulas;
                return (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', background: marcados.has(a.id) ? '#f1f8e9' : undefined }}>
                    <input type="checkbox" checked={marcados.has(a.id)} onChange={() => alternar(a.id)} />
                    <span style={{ flex: 1, fontSize: 13 }}>{a.nome}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555', minWidth: 110 }}>
                      {a.faixa_atual && <span style={{ width: 10, height: 10, borderRadius: 2, background: corDaFaixa(a.faixa_atual.nome, a.faixa_atual.cor), border: '1px solid #ccc' }} />}
                      {a.faixa_atual?.nome || 'Sem faixa'}
                    </span>
                    <span style={{ fontSize: 12, minWidth: 70, textAlign: 'right', color: ok ? '#2e7d32' : '#888', fontWeight: ok ? 600 : 400 }} title="Aulas na faixa atual / mínimo exigido">
                      {a.aulas_na_faixa}{a.min_aulas != null ? ` / ${a.min_aulas}` : ''} aulas
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#555' }}>{marcados.size} selecionado{marcados.size !== 1 ? 's' : ''}</span>
              <button style={btnVerde} disabled={!marcados.size} onClick={gerar}>+ Gerar Relatório</button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Relatorios() {
  const [artes, setArtes] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    axios.get('/artes-marciais').then(r => setArtes(r.data));
    axios.get('/turmas').then(r => setTurmas(r.data));
    axios.get('/usuarios?role=aluno').then(r => setAlunos(r.data));
    axios.get('/planos?todos=true').then(r => setPlanos(r.data));
  }, []);

  const relatorios = [
    { titulo: 'Alunos por Graduação', node: <CardAlunosPorGraduacao artes={artes} /> },
    { titulo: 'Alunos por Turma-Horário', node: <CardAlunosPorTurma turmas={turmas} /> },
    { titulo: 'Ficha Cadastral Resumida', node: <CardFichaCadastral alunos={alunos} /> },
    { titulo: 'Aulas & Frequências (Turma)', node: <CardFrequenciaTurma turmas={turmas} /> },
    { titulo: 'Aulas & Frequências (Alunos)', node: <CardFrequenciaAluno alunos={alunos} /> },
    { titulo: 'Aniversariantes por mês', node: <CardAniversariantes /> },
    { titulo: 'Frequência: Presença Mínima', node: <CardPresencaMinima artes={artes} /> },
    { titulo: 'Frequência: % de Presença', node: <CardFrequenciaPercentual artes={artes} turmas={turmas} /> },
    { titulo: 'Exame de Faixa', node: <CardExameFaixa artes={artes} /> },
    { titulo: 'Financeiro: Pagamentos', node: <CardFinanceiro turmas={turmas} planos={planos} /> },
    { titulo: 'Alunos sem Plano de Assinatura', node: <CardAlunosSemPlano /> },
    { titulo: 'Lista de Ex-Alunos', node: <CardAlunosSemTurma /> },
  ];
  const filtrados = relatorios.filter(r => r.titulo.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <input placeholder="Buscar relatório..." value={busca} onChange={e => setBusca(e.target.value)}
        style={{ ...estiloInput, maxWidth: 320, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtrados.length === 0 && <p style={{ color: '#888' }}>Nenhum relatório encontrado.</p>}
        {filtrados.map((r, i) => <React.Fragment key={i}>{r.node}</React.Fragment>)}
      </div>
    </div>
  );
}
