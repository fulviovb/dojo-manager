import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER_ORIGIN } from '../components/Avatar';
import { btnPrimario } from '../components/exame/ui';
import { moeda, formatData, FORMAS } from '../utils/gestaoExame';

// Recibo de um pagamento da taxa do exame — mesmo padrão de ReciboPage
// (mensalidade): nova aba, imprimível.
export default function ReciboExamePage({ exameId, pagamentoId }) {
  const [r, setRecibo] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios.get(`/exames/${exameId}/pagamentos/${pagamentoId}/recibo`)
      .then((x) => setRecibo(x.data))
      .catch((ex) => setErro(ex.response?.data?.erro || 'Não foi possível carregar o recibo.'));
  }, [exameId, pagamentoId]);

  return (
    <div className="fundo" style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <style>{`@media print { .acoes-recibo { display: none; } body, .fundo { background: #fff !important; } .fundo { min-height: 0 !important; padding: 0 !important; } }`}</style>
      {erro && <p style={{ color: '#c62828' }}>{erro}</p>}
      {!erro && !r && <p style={{ color: '#888' }}>Carregando...</p>}
      {r && (
        <>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 32, width: 560, maxWidth: '100%', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Recibo de Pagamento</h2>
              <span>Valor: <strong>{moeda(r.valor)}</strong></span>
            </div>
            <p style={{ lineHeight: 1.8, fontSize: 15 }}>
              Recebemos de <strong>{r.pagador}</strong> a quantia de <strong>{moeda(r.valor)}</strong> referente
              ao {r.parcial ? 'pagamento parcial' : 'pagamento'} da taxa do exame de faixa <strong>{r.exame_nome}</strong> ({r.arte_marcial}),
              {' '}de <strong>{formatData(r.exame_data)}</strong>,
              {r.pagador !== r.aluno_nome && <> do(a) aluno(a) <strong>{r.aluno_nome}</strong>,</>}
              {' '}para a faixa <strong>{r.faixa_pretendida}</strong>.
            </p>
            <p style={{ fontSize: 13, color: '#555' }}>
              Pago em {formatData(r.data_pagamento)} · {FORMAS[r.forma]} · Recibo #{r.numero}
              {r.saldo > 0 && <><br />Saldo da taxa em aberto em {formatData(r.hoje)}: <strong>{moeda(r.saldo)}</strong></>}
            </p>
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              {r.escola_assinatura_url && <img src={`${SERVER_ORIGIN}${r.escola_assinatura_url}`} alt="Assinatura" style={{ height: 100, display: 'inline-block' }} />}
              <div style={{ borderTop: '1px solid #ccc', paddingTop: 4, fontSize: 12, color: '#888' }}>{r.escola_nome}</div>
            </div>
          </div>
          <div className="acoes-recibo" style={{ marginTop: 20 }}>
            <button onClick={() => window.print()} style={btnPrimario}>🖨 Imprimir / Salvar PDF</button>
          </div>
        </>
      )}
    </div>
  );
}
