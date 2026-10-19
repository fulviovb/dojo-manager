import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { SERVER_ORIGIN } from '../components/Avatar';
import { EvolucaoAluno, formatMes, formatData, idadeEm, hojeLocal, btnCinza, estiloInput } from '../components/EvolucaoInfantil';
import { MapaTurma, PreencherMensal } from '../components/EvolucaoInfantilTurma';

// Tela do menu "Evolução Infantil": turma → mês → três visões: quem já tem
// as fichas, o mapa da turma (Mensal aluno × área) e o preenchimento rápido.
// Só aparecem turmas marcadas como educação infantil (TurmaDetalhe).
const chip = (ok) => ({
  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: ok ? '#e6f4ea' : '#fff4d6', color: ok ? '#2e7d32' : '#b26a00',
});

export default function EvolucaoInfantil({ onVerAluno }) {
  const [mes, setMes] = useState(hojeLocal().slice(0, 7));
  const [dados, setDados] = useState(null);
  const [turmaId, setTurmaId] = useState(null);
  const [selecionado, setSelecionado] = useState(null); // { aluno, abrirModelo }
  const [visao, setVisao] = useState('alunos'); // alunos | mapa | preencher

  const carregar = useCallback(() => {
    axios.get('/evolucao-infantil/turmas', { params: { mes } }).then((r) => {
      setDados(r.data);
      setTurmaId((atual) => (r.data.turmas.some((t) => t.id === atual) ? atual : r.data.turmas[0]?.id || null));
    });
  }, [mes]);

  useEffect(() => { carregar(); }, [carregar]);

  if (!dados) return <p style={{ color: '#888' }}>Carregando...</p>;

  if (dados.turmas.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, maxWidth: 640 }}>
        <h3 style={{ marginTop: 0 }}>Nenhuma turma de educação infantil</h3>
        <p style={{ color: '#666', fontSize: 14 }}>
          Abra a turma em <strong>Turmas</strong> e marque “Turma de educação infantil” para acompanhar os alunos com as Fichas de Evolução.
        </p>
      </div>
    );
  }

  const turma = dados.turmas.find((t) => t.id === turmaId) || dados.turmas[0];

  if (selecionado) {
    return (
      <div>
        <button onClick={() => { setSelecionado(null); carregar(); }} style={{ ...btnCinza, marginBottom: 12 }}>← Voltar para {turma.nome.split('\n')[0]}</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, color: '#1e2a38' }}>{selecionado.aluno.nome}</h2>
          {selecionado.aluno.data_nascimento && <span style={{ color: '#888' }}>{idadeEm(selecionado.aluno.data_nascimento)} anos</span>}
          <button onClick={() => onVerAluno(selecionado.aluno.id)} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 13 }}>Ver perfil completo →</button>
        </div>
        <EvolucaoAluno aluno={selecionado.aluno} turmas={[{ id: turma.id, nome: turma.nome }]} turmaIdInicial={turma.id}
          abrirModelo={selecionado.abrirModelo} />
      </div>
    );
  }

  if (visao === 'preencher') {
    return <PreencherMensal turmaId={turma.id} mes={mes} onSair={() => { setVisao('alunos'); carregar(); }} />;
  }

  const comMensal = turma.alunos.filter((a) => a.mensal_id).length;
  const comInicial = turma.alunos.filter((a) => a.tem_observacao_inicial).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {dados.turmas.map((t) => (
            <button key={t.id} onClick={() => setTurmaId(t.id)}
              style={{ padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: t.id === turma.id ? '2px solid #c62828' : '1px solid #ddd', background: t.id === turma.id ? '#fff' : '#fafafa', color: '#1e2a38' }}>
              {t.nome.split('\n')[0]} <span style={{ color: '#888', fontWeight: 400 }}>({t.alunos.length})</span>
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#555' }}>Mês</label>
          <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} style={{ ...estiloInput, width: 160 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e5e5', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {[['alunos', 'Alunos e fichas'], ['mapa', 'Mapa da turma']].map(([k, l]) => (
          <button key={k} onClick={() => setVisao(k)}
            style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: visao === k ? '3px solid #c62828' : '3px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: visao === k ? '#1e2a38' : '#888' }}>
            {l}
          </button>
        ))}
        <button onClick={() => setVisao('preencher')}
          style={{ marginLeft: 'auto', marginBottom: 6, background: '#2e7d32', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          ⚡ Preencher Mensal de {formatMes(mes)}
        </button>
      </div>

      {visao === 'mapa' ? (
        <MapaTurma turmaId={turma.id} mes={mes} onAbrirAluno={(a) => setSelecionado({ aluno: a })} onPreencher={() => setVisao('preencher')} />
      ) : (<>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['Observação inicial', comInicial, turma.alunos.length],
          [`Mensal de ${formatMes(mes)}`, comMensal, turma.alunos.length],
        ].map(([l, n, total]) => (
          <div key={l} style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 180 }}>
            <div style={{ fontSize: 12, color: '#888' }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: n === total ? '#2e7d32' : '#1e2a38' }}>{n}/{total}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafafa', textAlign: 'left', color: '#666' }}>
              <th style={{ padding: '10px 16px' }}>Aluno</th>
              <th style={{ padding: 10 }}>Idade</th>
              <th style={{ padding: 10 }}>Observação inicial</th>
              <th style={{ padding: 10 }}>Mensal {formatMes(mes)}</th>
              <th style={{ padding: 10 }}>Fichas no mês</th>
              <th style={{ padding: 10 }}>Última ficha</th>
            </tr>
          </thead>
          <tbody>
            {turma.alunos.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 16px' }}>
                  <button onClick={() => setSelecionado({ aluno: a })}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 600, color: '#1e2a38', textAlign: 'left' }}>
                    {a.foto_url
                      ? <img src={`${SERVER_ORIGIN}${a.foto_url}`} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                      : <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#c62828', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{a.nome[0]}</span>}
                    {a.nome}
                  </button>
                </td>
                <td style={{ padding: 10, color: '#666' }}>{a.data_nascimento ? `${idadeEm(a.data_nascimento)} anos` : '—'}</td>
                <td style={{ padding: 10 }}>
                  {a.tem_observacao_inicial
                    ? <span style={chip(true)}>✓ feita</span>
                    : <button style={chip(false)} onClick={() => setSelecionado({ aluno: a, abrirModelo: { modeloSlug: 'observacao_inicial' } })}>+ registrar</button>}
                </td>
                <td style={{ padding: 10 }}>
                  {a.mensal_id
                    ? <button style={chip(true)} onClick={() => setSelecionado({ aluno: a, abrirModelo: { fichaId: a.mensal_id } })}>✓ feita</button>
                    : <button style={chip(false)} onClick={() => setSelecionado({ aluno: a, abrirModelo: { modeloSlug: 'mensal', mes } })}>+ registrar</button>}
                </td>
                <td style={{ padding: 10, color: '#666' }}>{a.fichas_no_mes || '—'}</td>
                <td style={{ padding: 10, color: '#666' }}>{formatData(a.ultima_ficha)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>)}
    </div>
  );
}
