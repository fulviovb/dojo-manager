import React, { useState, useEffect } from 'react';
import axios from 'axios';

const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

function formatData(iso) {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}

// Ficha completa de avaliação de um participante — regra 3.8 do módulo de
// exame de faixa. Mesmo padrão de página própria (nova aba, print) de
// ReciboPage.js/RelatorioPage.js.
export default function ExameFichaPage({ exameId, participanteId }) {
  const [ficha, setFicha] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios.get(`/exames/${exameId}/participantes/${participanteId}/ficha`)
      .then((r) => setFicha(r.data))
      .catch((ex) => setErro(ex.response?.data?.erro || 'Não foi possível carregar a ficha.'));
  }, [exameId, participanteId]);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      <style>{`@media print { .acoes-ficha { display: none; } body { background: #fff; } }`}</style>

      {erro && <p style={{ color: '#c62828' }}>{erro}</p>}
      {!erro && !ficha && <p style={{ color: '#888' }}>Carregando...</p>}

      {ficha && (
        <>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 32, width: 640, maxWidth: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <h2 style={{ margin: 0 }}>Ficha de Avaliação</h2>
              <span style={{ fontSize: 13, color: '#888' }}>{formatData(ficha.exame.data)}</span>
            </div>
            <p style={{ color: '#555', marginBottom: 20 }}>{ficha.exame.nome}</p>

            <div style={{ marginBottom: 20 }}>
              <strong style={{ fontSize: 16 }}>{ficha.participante.aluno?.nome}</strong>
              <div style={{ fontSize: 14, color: '#555', marginTop: 2 }}>
                {ficha.participante.faixa_atual?.nome || '—'} → {ficha.participante.faixa_pretendida?.nome}
              </div>
            </div>

            {ficha.fases.map((fase) => (
              <div key={fase.fase_id} style={{ marginBottom: 20, borderTop: '1px solid #eee', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>{fase.fase_nome}</strong>
                  <span style={{ fontSize: 13, color: '#555' }}>
                    {fase.avaliador_nome ? `Avaliador(a): ${fase.avaliador_nome}` : 'Ainda não sorteado'}
                    {fase.nota != null ? ` · Nota: ${fase.nota}` : ''}
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {fase.criterios.map((c, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '4px 0' }}>{c.nome}</td>
                        <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600 }}>{c.conceito || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 700, marginTop: 16 }}>
              Nota final: {ficha.nota_final != null ? ficha.nota_final : '—'}
            </div>
          </div>

          <div className="acoes-ficha" style={{ marginTop: 20 }}>
            <button onClick={() => window.print()} style={btnPrimario}>🖨 Imprimir / Salvar PDF</button>
          </div>
        </>
      )}
    </div>
  );
}
