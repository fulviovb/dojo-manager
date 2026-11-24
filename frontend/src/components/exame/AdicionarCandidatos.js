import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Faixa, btnVerde, btnCinza, btnLink, estiloInput } from './ui';
import { textoCarencia } from '../../utils/gestaoExame';

const ABAS = [['indicados', 'Indicados'], ['turma', 'Por turma'], ['avulso', 'Avulso']];

export default function AdicionarCandidatos({ exameId, onFechar, onIncluido }) {
  const [aba, setAba] = useState('indicados');
  const [turmas, setTurmas] = useState([]);
  const [turmaId, setTurmaId] = useState('');
  const [busca, setBusca] = useState('');
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [marcados, setMarcados] = useState(new Set());
  const [faixas, setFaixas] = useState({}); // aluno_id → faixa escolhida (opcional)
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    if (aba === 'turma' && !turmaId) {
      setAlunos([]);
      axios.get(`/exames/${exameId}/elegiveis`, { params: { origem: 'avulso' } }).then((r) => { if (vivo) setTurmas(r.data.turmas); })
        .catch(() => { if (vivo) setErro('Não foi possível carregar as turmas.'); });
      return () => { vivo = false; };
    }
    setCarregando(true);
    const t = setTimeout(() => {
      axios.get(`/exames/${exameId}/elegiveis`, { params: { origem: aba, turma_id: turmaId || undefined, busca: busca || undefined } })
        .then((r) => {
          if (!vivo) return;
          setAlunos(r.data.alunos); setTurmas(r.data.turmas);
          // indicados já vêm todos marcados; nas outras abas escolhe-se um a um
          setMarcados(aba === 'indicados' ? new Set(r.data.alunos.filter((a) => !a.bloqueio && !a.desistiu).map((a) => a.id)) : new Set());
        })
        .catch((ex) => { if (vivo) setErro(ex.response?.data?.erro || 'Não foi possível carregar os alunos.'); })
        .finally(() => { if (vivo) setCarregando(false); });
    }, aba === 'avulso' ? 300 : 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [exameId, aba, turmaId, busca, versao]);

  const trocarAba = (a) => { setAba(a); setAlunos([]); setMarcados(new Set()); setErro(''); setAviso(''); setBusca(''); setTurmaId(''); };
  const livres = alunos.filter((a) => !a.bloqueio);
  const alternar = (id) => setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const escolhidos = livres.filter((a) => marcados.has(a.id));
  const semFaixa = escolhidos.filter((a) => a.opcoes.length && !faixas[a.id]);

  const incluir = async () => {
    setErro(''); setAviso('');
    if (semFaixa.length) { setErro(`Escolha a faixa pretendida de: ${semFaixa.map((a) => a.nome).join(', ')}`); return; }
    setSalvando(true);
    try {
      const { data } = await axios.post(`/exames/${exameId}/candidatos`, {
        turma_id: aba === 'turma' ? turmaId : undefined,
        alunos: escolhidos.map((a) => ({ aluno_id: a.id, faixa_pretendida_id: faixas[a.id] })),
      });
      onIncluido();
      if (data.erros.length) {
        setErro(data.erros.map((e) => `${e.nome}: ${e.erro}`).join(' · '));
        setAviso(`${data.incluidos} incluído(s).`);
        setVersao((v) => v + 1);
      } else if (aba === 'indicados') onFechar();
      else { setAviso(`${data.incluidos} incluído(s).`); setVersao((v) => v + 1); }
    } catch (ex) { setErro(ex.response?.data?.erro || 'Não foi possível incluir.'); } finally { setSalvando(false); }
  };

  return (
    <Modal titulo="Adicionar candidatos" onFechar={onFechar} largura={760} rodape={(
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#555' }}>{escolhidos.length} selecionado(s)</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnCinza} onClick={onFechar}>Fechar</button>
          <button style={{ ...btnVerde, opacity: escolhidos.length ? 1 : 0.5 }} disabled={!escolhidos.length || salvando} onClick={incluir}>{salvando ? 'Incluindo...' : 'Incluir no exame'}</button>
        </div>
      </div>
    )}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {ABAS.map(([id, rotulo]) => <button key={id} onClick={() => trocarAba(id)} style={{ ...btnCinza, ...(aba === id ? { background: '#1e2a38', color: '#fff', border: '1px solid #1e2a38' } : {}) }}>{rotulo}</button>)}
      </div>
      {aba === 'turma' && (
        <select aria-label="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} style={{ ...estiloInput, marginBottom: 10 }}>
          <option value="">Selecione a turma...</option>
          {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      )}
      {aba === 'avulso' && <input autoFocus placeholder="Nome do aluno (mínimo 2 letras)" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ ...estiloInput, marginBottom: 10 }} />}
      {aba !== 'indicados' && <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>Quem ainda não foi indicado é indicado automaticamente ao entrar.</p>}
      {erro && <p style={{ color: '#c62828', fontSize: 13 }}>{erro}</p>}
      {aviso && <p style={{ color: '#2e7d32', fontSize: 13 }}>{aviso}</p>}
      {carregando && !alunos.length && <p style={{ color: '#888', fontSize: 13 }}>Carregando...</p>}
      {!carregando && !alunos.length && (aba === 'indicados' || (aba === 'turma' && turmaId) || busca.length > 1) && <p style={{ color: '#888', fontSize: 13 }}>Nenhum aluno encontrado.</p>}
      {livres.length > 1 && (
        <div style={{ marginBottom: 6 }}>
          <button style={btnLink()} onClick={() => setMarcados(new Set(livres.map((a) => a.id)))}>Marcar todos</button>
          <button style={btnLink()} onClick={() => setMarcados(new Set())}>Desmarcar todos</button>
        </div>
      )}
      {alunos.map((a) => (
        <div key={a.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '8px 4px', borderTop: '1px solid #f0f0f0', opacity: a.bloqueio ? 0.5 : 1, fontSize: 13 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 210px' }}>
            <input type="checkbox" disabled={!!a.bloqueio} checked={!a.bloqueio && marcados.has(a.id)} onChange={() => alternar(a.id)} />
            <span>{a.nome}{a.desistiu && <span style={{ color: '#888', fontSize: 11 }}> (desistiu)</span>}</span>
          </label>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <Faixa faixa={a.faixa_atual} /> →
            {a.opcoes.length ? (
              <select aria-label={`Faixa pretendida de ${a.nome}`} disabled={!!a.bloqueio} value={faixas[a.id] || ''} onChange={(e) => { const v = e.target.value; setFaixas((f) => ({ ...f, [a.id]: v })); if (v) setMarcados((m) => new Set(m).add(a.id)); }} style={{ ...estiloInput, width: 'auto', padding: '3px 6px', fontSize: 12 }}>
                <option value="">Qual faixa?</option>
                {a.opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}{o.opcional ? ' (opcional)' : ''}</option>)}
              </select>
            ) : <Faixa faixa={a.faixa_pretendida} />}
          </span>
          <span style={{ fontSize: 12, minWidth: 80, textAlign: 'right', color: a.carencia.situacao === 'abaixo' ? '#c62828' : a.carencia.situacao === 'ok' ? '#2e7d32' : '#888' }}>{textoCarencia(a.carencia)}</span>
          {(a.bloqueio || (a.indicado && aba !== 'indicados')) && <span style={{ fontSize: 11, color: '#888' }}>{a.bloqueio || 'já indicado'}</span>}
        </div>
      ))}
    </Modal>
  );
}
