import React, { useState, useEffect } from 'react';
import { corDaFaixa } from '../../utils/faixaCores';

export const estiloInput = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
export const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
export const btnVerde = { ...btnPrimario, background: '#2e7d32' };
export const btnCinza = { background: '#fff', color: '#333', border: '1px solid #ccc', padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
export const btnLink = (cor = '#1565c0') => ({ background: 'none', border: 'none', color: cor, cursor: 'pointer', fontSize: 12, padding: 0, marginRight: 10 });
export const cardEstilo = { background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 };
export const thEstilo = { padding: '8px 10px', textAlign: 'left', fontSize: 11, color: '#888', textTransform: 'uppercase', whiteSpace: 'nowrap' };
export const tdEstilo = { padding: '8px 10px', fontSize: 13, borderTop: '1px solid #f0f0f0', verticalAlign: 'middle' };

export function Faixa({ faixa }) {
  if (!faixa) return <span style={{ color: '#aaa' }}>—</span>;
  const cor = corDaFaixa(faixa.nome, faixa.cor);
  const partes = faixa.nome.split('/');
  const fundo = partes.length === 2 ? `linear-gradient(${corDaFaixa(partes[0])} 50%, ${corDaFaixa(partes[1])} 50%)` : cor;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      <span style={{ width: 11, height: 11, borderRadius: 2, background: fundo, border: '1px solid #bbb', flexShrink: 0 }} />{faixa.nome}
    </span>
  );
}

export function Selo({ cor, children }) {
  return <span style={{ color: cor, border: `1px solid ${cor}`, borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>;
}

export function Campo({ rotulo, children, style }) {
  return <label style={{ display: 'block', fontSize: 12, color: '#555', ...style }}><span style={{ display: 'block', marginBottom: 4 }}>{rotulo}</span>{children}</label>;
}

export function Modal({ titulo, onFechar, largura = 620, children, rodape }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div role="dialog" aria-label={titulo} style={{ background: '#fff', borderRadius: 8, width: largura, maxWidth: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #eee' }}>
          <strong style={{ fontSize: 15 }}>{titulo}</strong>
          <button onClick={onFechar} aria-label="Fechar" style={{ background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 18 }}>{children}</div>
        {rodape && <div style={{ padding: '10px 18px', borderTop: '1px solid #eee' }}>{rodape}</div>}
      </div>
    </div>
  );
}

export function useCelular() {
  const [celular, setCelular] = useState(window.innerWidth < 760);
  useEffect(() => {
    const f = () => setCelular(window.innerWidth < 760);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return celular;
}

// Campos de gestão do exame (RF-01) — criação e edição
export function CamposGestao({ form, set }) {
  const campo = (k, rotulo, props) => <Campo rotulo={rotulo}><input value={form[k] ?? ''} onChange={(e) => set({ [k]: e.target.value })} style={estiloInput} {...props} /></Campo>;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {campo('local', 'Local')}
        {campo('horario', 'Horário', { type: 'time' })}
        {campo('taxa_padrao', 'Taxa padrão (R$)', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' })}
        {campo('preco_faixa_padrao', 'Preço da faixa (R$)', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' })}
        {campo('prazo_pagamento', 'Prazo de pagamento', { type: 'date' })}
        {campo('prazo_pedido_faixa', 'Prazo do pedido de faixa', { type: 'date' })}
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, margin: '12px 0' }}>
        <input type="checkbox" checked={!!form.usa_avaliacao} onChange={(e) => set({ usa_avaliacao: e.target.checked })} />
        <span>Usa avaliação (roteiro, avaliadores e sorteio)<br /><span style={{ color: '#888', fontSize: 11 }}>Desmarcado: exame só de gestão.</span></span>
      </label>
    </>
  );
}

export const camposGestaoDe = (e = {}) => ({
  local: e.local || '', horario: (e.horario || '').slice(0, 5), taxa_padrao: e.taxa_padrao ?? '', preco_faixa_padrao: e.preco_faixa_padrao ?? '',
  prazo_pagamento: e.prazo_pagamento || '', prazo_pedido_faixa: e.prazo_pedido_faixa || '', usa_avaliacao: e.usa_avaliacao ?? true,
});
