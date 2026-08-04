import React, { useRef, useState } from 'react';
import axios from 'axios';
import { SERVER_ORIGIN } from './Avatar';

const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnSecundario = { background: '#fff', color: '#555', border: '1px solid #ddd', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

// Pad de assinatura desenhada à mão (canvas), pra escolas novas que não têm
// a assinatura pessoal do administrador salva localmente — desenha, salva
// como PNG no servidor, e o recibo passa a usar essa imagem em vez da
// assinatura local (frontend/src/assets/assinatura.png), que continua
// sendo o fallback pra quem já usa o sistema e não quer trocar nada.
export default function AssinaturaPad({ escolaId, assinaturaAtualUrl, onSalvo }) {
  const canvasRef = useRef(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const coordenadas = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ponto = e.touches ? e.touches[0] : e;
    return { x: ponto.clientX - rect.left, y: ponto.clientY - rect.top };
  };

  const iniciar = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = coordenadas(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    desenhando.current = true;
  };

  const desenhar = (e) => {
    if (!desenhando.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = coordenadas(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e2a38';
    ctx.lineTo(x, y);
    ctx.stroke();
    setTemTraco(true);
  };

  const parar = () => { desenhando.current = false; };

  const limpar = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setTemTraco(false);
  };

  const salvar = () => {
    setErro('');
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      setSalvando(true);
      try {
        const form = new FormData();
        form.append('assinatura', blob, 'assinatura.png');
        await axios.post(`/escolas/${escolaId}/assinatura`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        limpar();
        onSalvo?.();
      } catch (ex) {
        setErro(ex.response?.data?.erro || 'Erro ao salvar assinatura');
      } finally {
        setSalvando(false);
      }
    }, 'image/png');
  };

  return (
    <div>
      {assinaturaAtualUrl && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Assinatura atual (usada nos recibos):</p>
          <img src={`${SERVER_ORIGIN}${assinaturaAtualUrl}`} alt="Assinatura atual" style={{ height: 80, border: '1px solid #eee', borderRadius: 4, padding: 8 }} />
        </div>
      )}
      <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
        {assinaturaAtualUrl ? 'Desenhar uma nova assinatura (substitui a atual):' : 'Desenhe sua assinatura abaixo:'}
      </p>
      <canvas
        ref={canvasRef}
        width={400}
        height={140}
        style={{ border: '2px solid #ddd', borderRadius: 4, background: '#fff', touchAction: 'none', cursor: 'crosshair', maxWidth: '100%' }}
        onMouseDown={iniciar}
        onMouseMove={desenhar}
        onMouseUp={parar}
        onMouseLeave={parar}
        onTouchStart={iniciar}
        onTouchMove={desenhar}
        onTouchEnd={parar}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={limpar} style={btnSecundario} disabled={salvando}>Limpar</button>
        <button type="button" onClick={salvar} style={btnPrimario} disabled={!temTraco || salvando}>
          {salvando ? 'Salvando...' : 'Salvar Assinatura'}
        </button>
      </div>
      {erro && <p style={{ color: '#c62828', fontSize: 13, marginTop: 8 }}>{erro}</p>}
    </div>
  );
}
