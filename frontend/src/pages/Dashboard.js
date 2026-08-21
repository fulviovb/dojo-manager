import React, { useState, useEffect } from 'react';
import axios from 'axios';

const COR_SEMAFORO = { amarelo: '#f9a825', laranja: '#e65100', vermelho: '#c62828' };
const BG_SEMAFORO  = { amarelo: '#fffde7', laranja: '#fbe9e7', vermelho: '#ffebee' };
const thEstilo = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #eee' };
const tdEstilo = { padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #f5f5f5' };
const cardBranco = { background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatarHoras(h) {
  return `${h.toLocaleString('pt-BR', { minimumFractionDigits: h % 1 === 0 ? 0 : 1, maximumFractionDigits: 2 })}h`;
}

function formatarMoeda(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Card({ title, value, sub, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 160 }}>
      <div style={{ fontSize: 28, fontWeight: 'bold', color: color || '#1e2a38' }}>{value}</div>
      <div style={{ fontWeight: 600, marginTop: 4 }}>{title}</div>
      {sub && <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function formatData(iso) {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}

function TabelaHoras({ titulo, dados, chaveLista, financeiro }) {
  const linhas = dados[chaveLista];
  const ehTurma = chaveLista === 'turmas';
  return (
    <div style={{ ...cardBranco, marginTop: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>{titulo}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={thEstilo}>{ehTurma ? 'Turma' : 'Local'}</th>
          <th style={thEstilo}>{ehTurma ? 'Professor' : 'Turmas'}</th>
          <th style={thEstilo}>Aulas/semana</th>
          <th style={thEstilo}>Horas/semana</th>
          {financeiro && <th style={thEstilo}>Horas/mês</th>}
          {financeiro && <th style={thEstilo}>A receber/mês</th>}
          {financeiro && <th style={thEstilo}>Valor/hora</th>}
        </tr></thead>
        <tbody>
          {linhas.length === 0 && <tr><td colSpan={financeiro ? 7 : 4} style={tdEstilo}>{ehTurma ? 'Nenhuma turma ativa.' : 'Nenhum local com turma ativa.'}</td></tr>}
          {linhas.map(item => (
            <tr key={item.id}>
              <td style={tdEstilo}>{item.nome.split('\n')[0]}</td>
              <td style={ehTurma ? tdEstilo : { ...tdEstilo, color: '#666' }}>{ehTurma ? (item.professor || '—') : item.turmas.join(', ')}</td>
              <td style={tdEstilo}>{item.aulas_semana}</td>
              <td style={tdEstilo}>{formatarHoras(item.horas_semana)}</td>
              {financeiro && <td style={tdEstilo}>{formatarHoras(item.horas_mes)}</td>}
              {financeiro && <td style={tdEstilo}>{formatarMoeda(item.valor_mes)}</td>}
              {financeiro && <td style={tdEstilo}>{item.valor_hora !== null ? formatarMoeda(item.valor_hora) : '—'}</td>}
            </tr>
          ))}
        </tbody>
        {linhas.length > 0 && (
          <tfoot><tr>
            <td style={{ ...tdEstilo, fontWeight: 700, borderBottom: 'none' }}>Total</td>
            <td style={{ ...tdEstilo, borderBottom: 'none' }}></td>
            <td style={{ ...tdEstilo, borderBottom: 'none' }}></td>
            <td style={{ ...tdEstilo, fontWeight: 700, borderBottom: 'none' }}>{formatarHoras(dados.total_horas_semana)}</td>
            {financeiro && <td style={{ ...tdEstilo, fontWeight: 700, borderBottom: 'none' }}>{formatarHoras(dados.total_horas_mes)}</td>}
            {financeiro && <td style={{ ...tdEstilo, fontWeight: 700, borderBottom: 'none' }}>{formatarMoeda(dados.total_valor_mes)}</td>}
            {financeiro && <td style={{ ...tdEstilo, fontWeight: 700, borderBottom: 'none' }}>{dados.valor_hora_medio !== null ? formatarMoeda(dados.valor_hora_medio) : '—'}</td>}
          </tr></tfoot>
        )}
      </table>
    </div>
  );
}

export default function Dashboard({ onVerAluno }) {
  const [aba, setAba] = useState('operacional');
  const [resumo, setResumo] = useState(null);
  const [semaforo, setSemaforo] = useState([]);
  const [semaforoGraduacao, setSemaforoGraduacao] = useState([]);
  const [artes, setArtes] = useState([]);
  const [filtroArte, setFiltroArte] = useState('');
  const [horasPorTurma, setHorasPorTurma] = useState(null);
  const [horasPorLocal, setHorasPorLocal] = useState(null);
  const [aniversariantes, setAniversariantes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const mesAtual = new Date().getMonth() + 1;
    Promise.all([
      axios.get('/dashboard').then(r => r.data),
      axios.get('/dashboard/semaforo').then(r => r.data.alertas),
      axios.get('/dashboard/semaforo-graduacao').then(r => r.data.alertas),
      axios.get('/artes-marciais').then(r => r.data),
      axios.get('/dashboard/horas-por-turma').then(r => r.data),
      axios.get('/dashboard/horas-por-local').then(r => r.data),
      axios.get(`/relatorios/aniversariantes?mes=${mesAtual}`).then(r => r.data.aniversariantes),
    ]).then(([r, s, sg, a, h, hl, an]) => {
      setResumo(r); setSemaforo(s); setSemaforoGraduacao(sg); setArtes(a);
      setHorasPorTurma(h); setHorasPorLocal(hl); setAniversariantes(an);
    })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <p>Carregando...</p>;
  if (!resumo) return <p style={{ color: 'red' }}>Erro ao carregar dashboard.</p>;

  const { alunos, turmas, frequencia, financeiro, periodo } = resumo;
  const pctRecebidoDoProjetado = financeiro.receita_projetada_mes > 0
    ? Math.round((financeiro.receita_mes / financeiro.receita_projetada_mes) * 100)
    : null;

  return (
    <div>
      <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', width: 'fit-content', marginBottom: 20 }}>
        {[['operacional', 'Operacional'], ['financeiro', 'Financeiro']].map(([valor, rotulo]) => (
          <button key={valor} onClick={() => setAba(valor)}
            style={{
              padding: '9px 22px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: aba === valor ? '#1e2a38' : '#fff', color: aba === valor ? '#fff' : '#555',
            }}>
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'operacional' && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <Card title="Alunos ativos" value={alunos.total} />
            <Card title="Turmas ativas" value={turmas.total} />
            <Card title="Aulas (30 dias)" value={frequencia.aulas_periodo} sub={"Média " + frequencia.media_presentes + " alunos/aula"} />
            <Card title="Novos alunos (mês)" value={alunos.novos_mes} color={alunos.novos_mes > 0 ? '#2e7d32' : undefined} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            <div style={cardBranco}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>Semáforo de Ausência</h3>
              {semaforo.length === 0 ? (
                <p style={{ color: '#888' }}>✅ Nenhum alerta de ausência no momento.</p>
              ) : (
                semaforo.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 6, marginBottom: 8, background: BG_SEMAFORO[a.cor], border: "1px solid " + COR_SEMAFORO[a.cor] }}>
                    <span style={{ fontSize: 20 }}>{a.cor === 'amarelo' ? '🟡' : a.cor === 'laranja' ? '🟠' : '🔴'}</span>
                    <div style={{ flex: 1 }}>
                      <button onClick={() => onVerAluno?.(a.aluno.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: '#1565c0', fontWeight: 'bold' }}>
                        {a.aluno.nome}
                      </button> <span style={{ color: '#666', fontSize: 13 }}>— {a.turma.nome}</span>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{a.motivo}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={cardBranco}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Semáforo de Graduação</h3>
                <select value={filtroArte} onChange={e => setFiltroArte(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}>
                  <option value="">Todas as artes</option>
                  {artes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <p style={{ color: '#888', fontSize: 12, marginTop: 8, marginBottom: 16 }}>
                % de presença que o aluno precisa manter dali pra frente pra bater a carência da faixa a tempo do
                próximo exame. Sem data de exame cadastrada (Configurações → Artes Marciais), a arte fica de fora.
              </p>
              {(() => {
                const lista = filtroArte ? semaforoGraduacao.filter(a => a.arte_marcial_id === filtroArte) : semaforoGraduacao;
                if (lista.length === 0) return <p style={{ color: '#888' }}>✅ Nenhum aluno em risco de não bater a carência a tempo.</p>;
                return lista.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 6, marginBottom: 8, background: BG_SEMAFORO[a.cor], border: "1px solid " + COR_SEMAFORO[a.cor] }}>
                    <span style={{ fontSize: 20 }}>{a.cor === 'amarelo' ? '🟡' : a.cor === 'laranja' ? '🟠' : '🔴'}</span>
                    <div style={{ flex: 1 }}>
                      <button onClick={() => onVerAluno?.(a.aluno.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: '#1565c0', fontWeight: 'bold' }}>
                        {a.aluno.nome}
                      </button> <span style={{ color: '#666', fontSize: 13 }}>— {a.arte_marcial_nome}, faixa {a.faixa_atual}</span>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                        {a.percentual_necessario === null
                          ? `Faltam ${a.aulas_faltando} aulas e não há mais nenhuma programada antes do exame (${formatData(a.data_exame)}).`
                          : `Precisa comparecer em ${a.percentual_necessario}% das ${a.aulas_restantes_ate_exame} aulas restantes até o exame (${formatData(a.data_exame)}) — faltam ${a.aulas_faltando} presenças.`}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div style={{ ...cardBranco, marginTop: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Aniversariantes de {MESES[new Date().getMonth()]}</h3>
            {aniversariantes.length === 0 ? (
              <p style={{ color: '#888' }}>Nenhum aniversariante este mês.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {aniversariantes.map(a => (
                  <span key={a.id} style={{ background: '#f5f5f5', padding: '6px 12px', borderRadius: 20, fontSize: 13 }}>
                    🎂 {a.nome} — {formatData(a.data_nascimento)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {horasPorTurma && <TabelaHoras titulo="Carga Horária Semanal por Turma" dados={horasPorTurma} chaveLista="turmas" financeiro={false} />}
          {horasPorLocal && <TabelaHoras titulo="Carga Horária Semanal por Local" dados={horasPorLocal} chaveLista="locais" financeiro={false} />}
        </>
      )}

      {aba === 'financeiro' && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <Card title="Receita do mês" value={formatarMoeda(financeiro.receita_mes)} color="#2e7d32"
              sub={pctRecebidoDoProjetado !== null ? `${pctRecebidoDoProjetado}% da receita projetada` : undefined} />
            <Card title="Receita projetada do mês" value={formatarMoeda(financeiro.receita_projetada_mes)} color="#1565c0"
              sub="Valor cheio de todas as assinaturas ativas" />
            <Card title="Mensalidades pendentes" value={financeiro.mensalidades_pendentes} color={financeiro.mensalidades_pendentes > 0 ? '#ef6c00' : undefined} />
            <Card title="Mensalidades vencidas" value={financeiro.mensalidades_vencidas} color={financeiro.mensalidades_vencidas > 0 ? '#c62828' : undefined} />
            {horasPorTurma && (
              <Card title="Valor da sua hora"
                value={horasPorTurma.valor_hora_medio !== null ? formatarMoeda(horasPorTurma.valor_hora_medio) + '/h' : '—'}
                color="#6a1b9a"
                sub={`${formatarMoeda(horasPorTurma.total_valor_mes)} a receber ÷ ${formatarHoras(horasPorTurma.total_horas_mes)} este mês`} />
            )}
            <Card title="Alunos sem plano" value={financeiro.alunos_sem_plano} color={financeiro.alunos_sem_plano > 0 ? '#ef6c00' : undefined}
              sub="Ativos sem nenhuma assinatura cadastrada" />
          </div>

          {horasPorTurma && <TabelaHoras titulo="Valor da Hora por Turma" dados={horasPorTurma} chaveLista="turmas" financeiro={true} />}
          {horasPorLocal && <TabelaHoras titulo="Valor da Hora por Local" dados={horasPorLocal} chaveLista="locais" financeiro={true} />}
        </>
      )}

      <div style={{ color: '#aaa', fontSize: 12, marginTop: 12 }}>
        Período: {periodo.inicio} → {periodo.fim}
      </div>
    </div>
  );
}
