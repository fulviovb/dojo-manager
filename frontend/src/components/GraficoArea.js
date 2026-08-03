import React, { useState } from 'react';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Paleta categórica validada (skill dataviz): slot 1 azul = Ganhos (realizado),
// slot 2 laranja = A Receber (pendente) — ordem fixa, nunca ciclada.
const COR_GANHOS = '#2a78d6';
const COR_A_RECEBER = '#eb6834';

function formatarMoeda(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Gráfico de área com duas séries (Ganhos vs A Receber), sem dependência
// externa — SVG desenhado à mão seguindo a skill dataviz deste ambiente:
// linhas 2px, área a ~10% de opacidade, grid hairline recessivo, legenda
// sempre visível (2 séries), tooltip por hover.
export default function GraficoArea({ serie }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const W = 720, H = 260;
  const padL = 44, padR = 16, padT = 16, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxValor = Math.max(1, ...serie.map(s => s.ganhos), ...serie.map(s => s.a_receber));
  const passo = Math.pow(10, Math.floor(Math.log10(maxValor || 1)));
  const tetoBruto = Math.ceil((maxValor * 1.15) / passo) * passo;
  const teto = tetoBruto || 1;

  const x = (i) => padL + (i / (serie.length - 1)) * plotW;
  const y = (v) => padT + plotH - (v / teto) * plotH;

  const linha = (campo) => serie.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s[campo])}`).join(' ');
  const area = (campo) => `${linha(campo)} L ${x(serie.length - 1)} ${padT + plotH} L ${x(0)} ${padT + plotH} Z`;

  const ticksY = 4;
  const hover = hoverIdx != null ? serie[hoverIdx] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHoverIdx(null)}>
        {/* gridlines horizontais — hairline, recessivo */}
        {Array.from({ length: ticksY + 1 }, (_, i) => {
          const valor = (teto / ticksY) * i;
          const yy = y(valor);
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#e5e5e0" strokeWidth={1} />
              <text x={padL - 8} y={yy + 4} textAnchor="end" fontSize={10} fill="#8a8a85">
                {valor >= 1000 ? `${(valor / 1000).toFixed(valor % 1000 === 0 ? 0 : 1)}k` : Math.round(valor)}
              </text>
            </g>
          );
        })}

        {/* áreas — wash a 10% de opacidade */}
        <path d={area('a_receber')} fill={COR_A_RECEBER} opacity={0.1} />
        <path d={area('ganhos')} fill={COR_GANHOS} opacity={0.1} />

        {/* linhas — 2px */}
        <path d={linha('a_receber')} fill="none" stroke={COR_A_RECEBER} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={linha('ganhos')} fill="none" stroke={COR_GANHOS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* eixo X */}
        {serie.map((s, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#8a8a85">{MESES[i]}</text>
        ))}

        {/* hit targets por mês (hover) */}
        {serie.map((s, i) => (
          <rect key={i} x={x(i) - plotW / serie.length / 2} y={padT} width={plotW / serie.length} height={plotH}
            fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
        ))}

        {/* crosshair + marcadores no mês em hover */}
        {hover && (
          <g>
            <line x1={x(hoverIdx)} y1={padT} x2={x(hoverIdx)} y2={padT + plotH} stroke="#c3c2b7" strokeWidth={1} />
            <circle cx={x(hoverIdx)} cy={y(hover.ganhos)} r={4} fill={COR_GANHOS} stroke="#fff" strokeWidth={2} />
            <circle cx={x(hoverIdx)} cy={y(hover.a_receber)} r={4} fill={COR_A_RECEBER} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>

      {hover && (
        <div style={{
          position: 'absolute', top: 4,
          left: `${Math.min(78, Math.max(2, (hoverIdx / (serie.length - 1)) * 100))}%`,
          background: '#1e2a38', color: '#fff', borderRadius: 6, padding: '8px 12px',
          fontSize: 12, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{MESES[hoverIdx]}</div>
          <div><span style={{ color: COR_GANHOS }}>●</span> Ganhos: {formatarMoeda(hover.ganhos)}</div>
          <div><span style={{ color: COR_A_RECEBER }}>●</span> A Receber: {formatarMoeda(hover.a_receber)}</div>
        </div>
      )}

      {/* legenda — sempre visível com 2+ séries */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#555' }}>
        <span><span style={{ color: COR_GANHOS, marginRight: 4 }}>●</span>Ganhos (R$)</span>
        <span><span style={{ color: COR_A_RECEBER, marginRight: 4 }}>●</span>A Receber (R$)</span>
      </div>
    </div>
  );
}
