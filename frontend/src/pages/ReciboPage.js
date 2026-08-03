import React, { useState, useEffect } from 'react';
import axios from 'axios';
import assinaturaImg from '../assets/assinatura.png';

const PERIODICIDADE_LABEL = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };

function formatData(iso) {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}

function formatarMoeda(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

// Página própria (aberta em nova aba a partir do botão "Recibo" em Financeiro)
// em vez de modal — assim o recibo pode ser impresso/salvo como PDF sem o
// resto da aplicação por perto. Reaproveita o token já salvo no localStorage
// (mesma origem, mesma aba de navegador) — sem isso não tem como ver o recibo.
export default function ReciboPage({ mensalidadeId }) {
  const [recibo, setRecibo] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios.get(`/mensalidades/${mensalidadeId}/recibo`)
      .then(r => setRecibo(r.data))
      .catch(ex => setErro(ex.response?.data?.erro || 'Não foi possível carregar o recibo.'));
  }, [mensalidadeId]);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      <style>{`@media print { .acoes-recibo { display: none; } body { background: #fff; } }`}</style>

      {erro && <p style={{ color: '#c62828' }}>{erro}</p>}

      {!erro && !recibo && <p style={{ color: '#888' }}>Carregando...</p>}

      {recibo && (
        <>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 32, width: 560, maxWidth: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Recibo de Pagamento</h2>
              <span>Valor: <strong>{formatarMoeda(recibo.valor_pago)}</strong></span>
            </div>
            <p style={{ lineHeight: 1.8, fontSize: 15 }}>
              Recebemos de <strong>{recibo.aluno_nome}</strong> a quantia de <strong>{formatarMoeda(recibo.valor_pago)}</strong> referente
              ao pagamento da fatura <strong>#{recibo.numero}</strong> com data de vencimento em <strong>{formatData(recibo.data_vencimento)}</strong> da
              assinatura <strong>{PERIODICIDADE_LABEL[recibo.periodicidade] || 'avulsa'}</strong> do <strong>{recibo.plano_nome}</strong>.
            </p>
            <p style={{ fontSize: 13, color: '#555' }}>Em {formatData(recibo.data_pagamento)} · {recibo.forma_pagamento?.replace(/_/g, ' ')}</p>
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <img src={assinaturaImg} alt="Assinatura" style={{ height: 100, display: 'inline-block' }} />
              <div style={{ borderTop: '1px solid #ccc', paddingTop: 4, fontSize: 12, color: '#888' }}>{recibo.escola_nome}</div>
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
