import React, { useState, useEffect } from 'react';
import axios from 'axios';

const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

function formatData(iso) {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}

// Relatório final do exame — regra 3.9. Versão limpa (sem os botões de ação
// da tela interativa) só pra imprimir/exportar em PDF.
export default function ExameRelatorioPage({ exameId }) {
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios.get(`/exames/${exameId}/relatorio`)
      .then((r) => setRelatorio(r.data))
      .catch((ex) => setErro(ex.response?.data?.erro || 'Não foi possível carregar o relatório.'));
  }, [exameId]);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      <style>{`@media print { .acoes-relatorio-exame { display: none; } body { background: #fff; } }`}</style>

      {erro && <p style={{ color: '#c62828' }}>{erro}</p>}
      {!erro && !relatorio && <p style={{ color: '#888' }}>Carregando...</p>}

      {relatorio && (
        <>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 32, width: 720, maxWidth: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <h2 style={{ margin: 0 }}>Relatório Final do Exame</h2>
              <span style={{ fontSize: 13, color: '#888' }}>{formatData(relatorio.exame.data)}</span>
            </div>
            <p style={{ color: '#555', marginBottom: 20 }}>{relatorio.exame.nome}</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Aluno</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Faixa atual → pretendida</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Fases</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Nota final</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.participantes.map((p) => (
                  <tr key={p.participante_id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '8px 10px' }}>{p.aluno?.nome}</td>
                    <td style={{ padding: '8px 10px', color: '#555' }}>{p.faixa_atual?.nome || '—'} → {p.faixa_pretendida?.nome}</td>
                    <td style={{ padding: '8px 10px', color: '#555' }}>{p.fases_finalizadas}/{p.fases_total}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{p.nota_final != null ? p.nota_final : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="acoes-relatorio-exame" style={{ marginTop: 20 }}>
            <button onClick={() => window.print()} style={btnPrimario}>🖨 Imprimir / Salvar PDF</button>
          </div>
        </>
      )}
    </div>
  );
}
