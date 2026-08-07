import React from 'react';

// foto_url vem do backend como caminho relativo (/uploads/fotos/xxx.jpg) —
// precisa da origem do servidor (sem o /api do axios.baseURL) pra virar URL
// completa. Nunca fixar "localhost": acessando de outro dispositivo pelo IP
// da rede, "localhost" apontaria pro próprio dispositivo, não pro servidor.
const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`;
export const SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export default function Avatar({ fotoUrl, nome = '', tamanho = 40, corFundo = '#1e2a38' }) {
  const estiloBase = {
    width: tamanho, height: tamanho, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  };

  if (fotoUrl) {
    return <img src={`${SERVER_ORIGIN}${fotoUrl}`} alt={nome} style={{ ...estiloBase, objectFit: 'cover' }} />;
  }

  return (
    <div style={{ ...estiloBase, background: corFundo, color: '#fff', fontWeight: 700, fontSize: tamanho * 0.42 }}>
      {nome ? nome[0].toUpperCase() : '?'}
    </div>
  );
}
