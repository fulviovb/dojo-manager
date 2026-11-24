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
        {campo('preco_faixa_padrao', 'Preço padrão da faixa (R$)', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' })}
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
export const camposPrecosDe = (e) => ({ taxas_por_faixa: { ...(e.taxas_por_faixa || {}) }, tipos_faixa: [...(e.tipos_faixa || [])] });

// Taxa por faixa pretendida e tipos (qualidades) de faixa — edição do exame
export function PrecosExame({ form, set, faixas }) {
  const num = { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' };
  const mudarTipo = (i, v) => set({ tipos_faixa: form.tipos_faixa.map((t, j) => (j === i ? { ...t, ...v } : t)) });
  return (
    <>
      <h4 style={{ margin: '14px 0 4px', fontSize: 14 }}>Taxa por faixa pretendida</h4>
      <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>Em branco, vale a taxa padrão.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        {faixas.map((f) => (
          <Campo key={f.id} rotulo={<Faixa faixa={f} />}>
            <input {...num} aria-label={`Taxa ${f.nome}`} value={form.taxas_por_faixa[f.id] ?? ''} onChange={(e) => set({ taxas_por_faixa: { ...form.taxas_por_faixa, [f.id]: e.target.value } })} style={estiloInput} />
          </Campo>
        ))}
      </div>
      <h4 style={{ margin: '16px 0 4px', fontSize: 14 }}>Tipos de faixa à venda</h4>
      <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>Opcional. Ex.: Simples, Bordada, Premium. Sem tipos, vale o preço padrão da faixa.</p>
      {form.tipos_faixa.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input required aria-label="Nome do tipo" placeholder="Nome" maxLength={60} value={t.nome} onChange={(e) => mudarTipo(i, { nome: e.target.value })} style={{ ...estiloInput, flex: 2 }} />
          <input required {...num} aria-label="Preço do tipo" placeholder="R$" value={t.preco} onChange={(e) => mudarTipo(i, { preco: e.target.value })} style={{ ...estiloInput, flex: 1 }} />
          <button type="button" aria-label="Remover tipo" onClick={() => set({ tipos_faixa: form.tipos_faixa.filter((_, j) => j !== i) })} style={btnLink('#c62828')}>remover</button>
        </div>
      ))}
      <button type="button" style={{ ...btnCinza, marginBottom: 12 }} onClick={() => set({ tipos_faixa: [...form.tipos_faixa, { nome: '', preco: '' }] })}>+ Tipo de faixa</button>
    </>
  );
}

// Formulário do candidato externo — inclusão e edição
export function FormExterno({ inicial, faixas, onSalvar, rotulo, salvando }) {
  const [f, setF] = useState({ ...inicial });
  const campo = (k, r, props) => <Campo rotulo={r}><input maxLength={255} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={estiloInput} {...props} /></Campo>;
  const faixa = (k, r, props) => (
    <Campo rotulo={r}><select value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={estiloInput} {...props}>
      <option value="">{props?.required ? 'Selecione...' : 'Sem faixa'}</option>
      {faixas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
    </select></Campo>
  );
  return (
    <form onSubmit={async (e) => { e.preventDefault(); if (await onSalvar(f) && !inicial) setF({ origem: f.origem }); }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 12 }}>
        {campo('nome', 'Nome *', { required: true })}
        {campo('nascimento', 'Nascimento', { type: 'date' })}
        {campo('responsavel', 'Responsável')}
        {campo('telefone', 'Telefone', { maxLength: 40, inputMode: 'tel' })}
        {campo('origem', 'Academia / professor de origem')}
        {faixa('faixa_atual_id', 'Faixa atual')}
        {faixa('faixa_pretendida_id', 'Faixa pretendida *', { required: true })}
      </div>
      <button type="submit" disabled={salvando} style={btnVerde}>{rotulo}</button>
    </form>
  );
}
