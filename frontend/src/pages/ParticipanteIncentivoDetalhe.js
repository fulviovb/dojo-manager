import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Modal, SeletorEntidade, SeletorEsporte, CamposPJ, formatarCep, estiloInput, btnVerde, btnAzul, btnCinza, formatData, formatarMoeda } from './IncentivoEsporte';
import { SERVER_ORIGIN } from '../components/Avatar';
import SecaoProjetoIncentivo from './ParticipanteIncentivoProjeto';

const card = (extra = {}) => ({ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16, ...extra });
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #f0f0f0' };
const cardTitle = { fontWeight: 700, fontSize: 15, color: '#1e2a38' };
const btnPerigo = { background: '#c62828', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 };

const TIPO_PESSOA_LABEL = { atleta: 'Atleta', tecnico: 'Técnico', pessoa_juridica: 'Pessoa Jurídica' };
const STATUS_PROGRAMA_LABEL = { documentacao_pendente: 'Documentação Pendente', documentacao_ok: 'Documentação OK — aguardando inscrição', inscrito: 'Inscrito', habilitado: 'Habilitado', indeferido: 'Indeferido', inabilitado: 'Inabilitado' };
const STATUS_DOC_LABEL = { pendente: 'Pendente', recebido: 'Recebido', aprovado: 'Aprovado', rejeitado: 'Rejeitado' };
const STATUS_DOC_COR = { pendente: '#888', recebido: '#1565c0', aprovado: '#2e7d32', rejeitado: '#c62828' };
const STATUS_DOC_BG = { pendente: '#f0f0f0', recebido: '#e3f2fd', aprovado: '#e8f5e9', rejeitado: '#ffebee' };
const TIPO_CONTRAPARTIDA_LABEL = { campanha_doacao: 'Campanha de Doação', divulgacao_rede_social: 'Divulgação em Rede Social', exposicao_banner: 'Exposição de Bandeira/Banner' };

function LinhaInfo({ label, valor }) {
  if (!valor) return null;
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: '#888', minWidth: 90 }}>{label}:</span>
      <span style={{ color: '#222', fontWeight: 500 }}>{valor}</span>
    </div>
  );
}

// ── Seção: Documentos ──────────────────────────────────────────────────────

function ModalGerarAnexo({ participanteId, tipoPessoa, anexo, onFechar, onGerado }) {
  const [campos, setCampos] = useState(() => Object.fromEntries(anexo.campos.filter(c => !c.temFonte).map(c => [c.key, c.padrao_por_tipo?.[tipoPessoa] || ''])));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  // Anexos com lista de pessoas escolhida na geração:
  //  - XI (relação de atletas do técnico): atletas do módulo — pré-marca os
  //    que já têm este técnico como responsável;
  //  - X (lista nominal de participantes do projeto PJ): alunos ativos da
  //    escola — nada pré-marcado.
  const ehRelacaoAtletas = anexo.codigo === 'XI' || anexo.codigo === 'X';
  const ehListaAlunos = anexo.codigo === 'X';
  const [atletas, setAtletas] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());
  useEffect(() => {
    if (!ehRelacaoAtletas) return;
    const url = ehListaAlunos ? '/usuarios?role=aluno' : '/incentivo-esporte/participantes?tipo_pessoa=atleta';
    axios.get(url).then(r => {
      const lista = [...r.data].sort((a, b) => a.nome.localeCompare(b.nome));
      setAtletas(lista);
      if (!ehListaAlunos) setSelecionados(new Set(lista.filter(a => a.tecnico_responsavel_id === participanteId).map(a => a.id)));
    }).catch(() => setErro('Erro ao carregar a lista'));
  }, [ehRelacaoAtletas, ehListaAlunos, participanteId]);

  const alternarAtleta = (id) => setSelecionados(prev => {
    const novo = new Set(prev);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    return novo;
  });

  const gerar = async () => {
    if (ehRelacaoAtletas && selecionados.size === 0) return setErro(ehListaAlunos ? 'Selecione ao menos um participante' : 'Selecione ao menos um atleta');
    setSalvando(true); setErro('');
    try {
      // Documento gerado sai sem assinatura: vai direto pra download (não
      // entra no checklist como entregue) — o backend só cria o item
      // pendente se ele não existir mais no checklist.
      const r = await axios.post('/incentivo-esporte/documentos/gerar', {
        participante_id: participanteId, tipo_anexo: anexo.codigo, campos,
        ...(ehRelacaoAtletas ? { [ehListaAlunos ? 'alunos_ids' : 'atletas_ids']: [...selecionados] } : {}),
      }, { responseType: 'blob' });
      const nomeArquivo = /filename="([^"]+)"/.exec(r.headers['content-disposition'] || '')?.[1] || `Anexo_${anexo.codigo}.pdf`;
      const url = URL.createObjectURL(r.data);
      const link = document.createElement('a');
      link.href = url; link.download = nomeArquivo;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      onGerado({
        item: decodeURIComponent(r.headers['x-item-checklist'] || ''),
        adicionado: r.headers['x-item-adicionado'] === '1',
      });
    } catch (ex) {
      // Com responseType 'blob' o corpo de erro (JSON) também vem como Blob.
      let msg = 'Erro ao gerar documento';
      try { msg = JSON.parse(await ex.response.data.text()).erro || msg; } catch { /* mantém genérica */ }
      setErro(msg);
    }
    finally { setSalvando(false); }
  };

  const camposManuais = anexo.campos.filter(c => !c.temFonte);

  return (
    <Modal titulo={`Gerar Anexo ${anexo.codigo} — ${anexo.nome}`} onFechar={onFechar} largura={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
          Campos que já vêm do cadastro do participante são preenchidos automaticamente. Preencha o restante abaixo.
        </p>
        {camposManuais.map(c => (
          <div key={c.key}>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{c.label}</label>
            {c.opcoes ? (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {c.opcoes.map(op => (
                  <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={campos[c.key] === op} onChange={() => setCampos(p => ({ ...p, [c.key]: op }))} />
                    {op.charAt(0).toUpperCase() + op.slice(1)}
                  </label>
                ))}
              </div>
            ) : (
              <input value={campos[c.key] || ''} onChange={e => setCampos(p => ({ ...p, [c.key]: e.target.value }))} style={estiloInput} />
            )}
          </div>
        ))}
        {camposManuais.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>Nenhum campo adicional — tudo vem do cadastro.</p>}
        {ehRelacaoAtletas && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 12 }}>{ehListaAlunos ? 'Alunos participantes do projeto' : 'Atletas na relação'} ({selecionados.size} selecionado{selecionados.size === 1 ? '' : 's'})</label>
              {atletas?.length > 0 && (
                <span style={{ fontSize: 11 }}>
                  <button type="button" onClick={() => setSelecionados(new Set(atletas.map(a => a.id)))} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', padding: 0 }}>todos</button>
                  {' · '}
                  <button type="button" onClick={() => setSelecionados(new Set())} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', padding: 0 }}>nenhum</button>
                </span>
              )}
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 6, padding: '4px 8px' }}>
              {atletas === null && <p style={{ fontSize: 12, color: '#888', margin: '6px 0' }}>Carregando...</p>}
              {atletas?.length === 0 && <p style={{ fontSize: 12, color: '#888', margin: '6px 0' }}>{ehListaAlunos ? 'Nenhum aluno ativo.' : 'Nenhum atleta cadastrado no módulo.'}</p>}
              {atletas?.map(a => (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selecionados.has(a.id)} onChange={() => alternarAtleta(a.id)} />
                  <span style={{ flex: 1 }}>{a.nome}</span>
                  {ehListaAlunos && !a.data_nascimento && <span style={{ fontSize: 11, color: '#ef6c00' }}>sem nascimento</span>}
                  {!a.cpf && !a.rg && <span style={{ fontSize: 11, color: '#ef6c00' }}>sem CPF/RG</span>}
                </label>
              ))}
            </div>
          </div>
        )}
        {erro && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onFechar} style={btnCinza}>Cancelar</button>
          <button onClick={gerar} disabled={salvando} style={btnVerde}>{salvando ? 'Gerando...' : 'Gerar e baixar PDF'}</button>
        </div>
      </div>
    </Modal>
  );
}

function LinhaDocumento({ doc, rotulo, mudarStatus, enviarArquivo, remover }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        {rotulo && <div style={{ fontSize: 12, color: '#888' }}>{rotulo}</div>}
        {!rotulo && <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.nome_exibicao}</div>}
        <div style={{ fontSize: 11, color: '#aaa' }}>
          {doc.origem === 'gerado' ? 'Gerado pelo sistema' : 'Upload'}
          {doc.data_validade ? ` · válido até ${formatData(doc.data_validade)}` : ''}
        </div>
      </div>
      <select value={doc.status} onChange={e => mudarStatus(doc, e.target.value)}
        style={{ fontSize: 11, padding: '3px 6px', borderRadius: 10, border: 'none', fontWeight: 700, background: STATUS_DOC_BG[doc.status], color: STATUS_DOC_COR[doc.status] }}>
        {Object.entries(STATUS_DOC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {doc.arquivo_url && (
        <a href={`${SERVER_ORIGIN}${doc.arquivo_url}`} target="_blank" rel="noreferrer" style={{ ...btnAzul, textDecoration: 'none', display: 'inline-block' }}>Ver</a>
      )}
      <label style={{ ...btnCinza, cursor: 'pointer', margin: 0 }}>
        {doc.arquivo_url ? 'Trocar arquivo' : 'Enviar arquivo'}
        <input type="file" hidden onChange={e => e.target.files[0] && enviarArquivo(doc, e.target.files[0])} />
      </label>
      <button onClick={() => remover(doc)} style={btnPerigo}>✕</button>
    </div>
  );
}

// Item "Login e senha do Sistema Incentivo online": não tem arquivo — a
// senha fica cifrada no backend (CredencialIncentivo) e só vem em texto
// claro quando o admin clica em "Mostrar"/"Copiar".
function LinhaCredencial({ doc, participanteId, tipoPessoa, mudarStatus, onAlterado }) {
  const [credencial, setCredencial] = useState(undefined);
  const [senhaVisivel, setSenhaVisivel] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ login: '', senha: '' });
  const [mostrarNoForm, setMostrarNoForm] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const base = `/incentivo-esporte/participantes/${participanteId}/credencial`;

  const carregar = useCallback(() => {
    axios.get(base).then(r => setCredencial(r.data)).catch(() => setCredencial(null));
  }, [base]);
  useEffect(() => { carregar(); }, [carregar]);

  const obterSenha = async () => {
    if (senhaVisivel !== null) return senhaVisivel;
    const r = await axios.post(`${base}/revelar`);
    return r.data.senha;
  };

  const alternarMostrar = async () => {
    setErro('');
    if (senhaVisivel !== null) return setSenhaVisivel(null);
    try { setSenhaVisivel(await obterSenha()); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao buscar senha'); }
  };

  const copiar = async (texto, rotulo) => {
    setErro('');
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(`${rotulo} copiado`);
      setTimeout(() => setAviso(''), 2000);
    } catch { setErro('Não foi possível copiar'); }
  };

  const copiarSenha = async () => {
    try { await copiar(await obterSenha(), 'Senha'); }
    catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao buscar senha'); }
  };

  const abrirModal = () => {
    setForm({ login: credencial?.login || '', senha: '' });
    setMostrarNoForm(false); setErro(''); setModal(true);
  };

  const salvar = async () => {
    setSalvando(true); setErro('');
    try {
      await axios.put(base, form);
      setModal(false); setSenhaVisivel(null);
      carregar(); onAlterado();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
    finally { setSalvando(false); }
  };

  const apagar = async () => {
    if (!window.confirm('Apagar o login e a senha salvos deste participante?')) return;
    await axios.delete(base);
    setSenhaVisivel(null); carregar(); onAlterado();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.nome_exibicao}</div>
        {credencial ? (
          <div style={{ fontSize: 12, color: '#444', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>Login: <b>{credencial.login}</b></span>
            <span>Senha: <b style={{ fontFamily: 'monospace' }}>{senhaVisivel ?? '••••••••'}</b></span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#aaa' }}>{credencial === undefined ? 'Carregando...' : 'Não cadastrado · senha salva criptografada'}</div>
        )}
        {aviso && <div style={{ fontSize: 11, color: '#2e7d32' }}>{aviso}</div>}
        {erro && !modal && <div style={{ fontSize: 11, color: '#c62828' }}>{erro}</div>}
      </div>
      <select value={doc.status} onChange={e => mudarStatus(doc, e.target.value)}
        style={{ fontSize: 11, padding: '3px 6px', borderRadius: 10, border: 'none', fontWeight: 700, background: STATUS_DOC_BG[doc.status], color: STATUS_DOC_COR[doc.status] }}>
        {Object.entries(STATUS_DOC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {credencial && (
        <>
          <button onClick={() => copiar(credencial.login, 'Login')} style={btnCinza}>Copiar login</button>
          <button onClick={alternarMostrar} style={btnAzul}>{senhaVisivel !== null ? 'Ocultar' : 'Mostrar'}</button>
          <button onClick={copiarSenha} style={btnCinza}>Copiar senha</button>
        </>
      )}
      <button onClick={abrirModal} style={credencial ? btnCinza : btnVerde}>{credencial ? 'Editar' : 'Cadastrar'}</button>
      {credencial && <button onClick={apagar} style={btnPerigo}>✕</button>}

      {modal && (
        <Modal titulo="Login e senha — Sistema Incentivo online" onFechar={() => setModal(false)} largura={400}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{tipoPessoa === 'pessoa_juridica' ? 'Login (e-mail institucional da entidade)' : 'Login (CPF no e-Cidadão)'}</label>
              <input value={form.login} autoComplete="off" onChange={e => setForm(f => ({ ...f, login: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Senha{credencial ? ' (deixe em branco para manter a atual)' : ''}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type={mostrarNoForm ? 'text' : 'password'} value={form.senha} autoComplete="new-password"
                  onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} style={estiloInput} />
                <button type="button" onClick={() => setMostrarNoForm(v => !v)} style={btnCinza}>{mostrarNoForm ? 'Ocultar' : 'Ver'}</button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: 0 }}>A senha é guardada criptografada e só aparece para administradores.</p>
            {erro && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={btnVerde}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Dados que a prefeitura pede junto de cada comprovante de resultado
// (evento, colocação, ano, competição, entidade). "Preencher com conquista"
// copia de um resultado do histórico (Conquistas) do participante.
function DadosResultado({ doc, eventos, anos, sugestoes, onSalvo }) {
  const doDoc = () => ({
    evento: doc.resultado_evento || '', colocacao: doc.resultado_colocacao ?? '', ano: doc.resultado_ano || '',
    competicao: doc.resultado_competicao || '', entidade: doc.resultado_entidade || '',
  });
  const [form, setForm] = useState(doDoc);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [leitura, setLeitura] = useState(null); // resultado da leitura do arquivo
  const [lendo, setLendo] = useState(false);

  // Lê o arquivo (no servidor, sem IA) e preenche o formulário SEM salvar.
  const lerArquivo = async () => {
    setLendo(true); setErro('');
    try {
      const r = await axios.post(`/incentivo-esporte/documentos/${doc.id}/ler-resultado`);
      setLeitura(r.data);
      setForm({ evento: r.data.evento || '', colocacao: r.data.colocacao ?? '', ano: r.data.ano || '', competicao: r.data.competicao || '', entidade: r.data.entidade || '' });
    } catch (ex) { setErro(ex.response?.data?.erro || 'Não foi possível ler o arquivo'); }
    finally { setLendo(false); }
  };

  useEffect(() => {
    setForm(doDoc());
    setLeitura(null);
    // Arquivo enviado e dados vazios → lê sozinho.
    if (doc.arquivo_url && !doc.resultado_evento) lerArquivo();
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps
  const alterado = JSON.stringify(form) !== JSON.stringify(doDoc());
  const inp = { ...estiloInput, padding: '5px 7px', fontSize: 12 };
  const preenchido = !!doc.resultado_evento;

  const salvar = async () => {
    setErro('');
    try {
      await axios.put(`/incentivo-esporte/documentos/${doc.id}`, { resultado: form });
      setSalvo(true); setTimeout(() => setSalvo(false), 1500);
      onSalvo();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  return (
    <div style={{ marginLeft: 12, padding: '6px 10px', borderLeft: `3px solid ${preenchido ? '#2e7d32' : '#ef6c00'}`, background: '#fafafa', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sugestoes.length > 0 && (
        <select value="" onChange={e => { const s = sugestoes.find(x => x.id === e.target.value); if (s) setForm({ evento: s.evento, colocacao: s.colocacao, ano: s.ano, competicao: s.competicao, entidade: s.entidade }); }} style={{ ...inp, color: '#1565c0' }}>
          <option value="">Preencher com uma conquista do histórico...</option>
          {sugestoes.map(s => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
        </select>
      )}
      {lendo && <span style={{ fontSize: 11, color: '#888' }}>Lendo o comprovante...</span>}
      {leitura && (
        <div style={{ fontSize: 11, color: '#1565c0' }}>
          Lido do arquivo{leitura.metodo === 'ocr' ? ' (OCR — confira com atenção)' : ''} — confira e clique em "Salvar dados".
          {leitura.ano && !anos.includes(Number(leitura.ano)) && (
            <div style={{ color: '#c62828', fontWeight: 700 }}>Resultado de {leitura.ano}: fora da validade ({anos.join(' ou ')}). Troque este comprovante.</div>
          )}
        </div>
      )}
      {leitura?.colocacoes?.length > 1 && (
        <select value="" onChange={e => { const c = leitura.colocacoes[Number(e.target.value)]; if (c) setForm(f => ({ ...f, colocacao: c.colocacao, evento: c.evento || f.evento })); }} style={{ ...inp, color: '#1565c0' }}>
          <option value="">Este documento tem {leitura.colocacoes.length} colocações — escolha qual usar...</option>
          {leitura.colocacoes.map((c, i) => <option key={i} value={i}>{c.colocacao}º {c.prova}</option>)}
        </select>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select value={form.evento} onChange={e => setForm(f => ({ ...f, evento: e.target.value }))} style={{ ...inp, width: 230 }}>
          <option value="">Evento...</option>
          {eventos.map(ev => <option key={ev.valor} value={ev.valor}>{ev.label}</option>)}
        </select>
        <input type="number" min="1" placeholder="Colocação" value={form.colocacao} onChange={e => setForm(f => ({ ...f, colocacao: e.target.value }))} style={{ ...inp, width: 95 }} />
        <select value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} style={{ ...inp, width: 90 }}>
          <option value="">Ano...</option>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <input placeholder="Competição (título)" value={form.competicao} onChange={e => setForm(f => ({ ...f, competicao: e.target.value }))} style={inp} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input placeholder="Entidade promotora (nome completo)" value={form.entidade} onChange={e => setForm(f => ({ ...f, entidade: e.target.value }))} style={{ ...inp, flex: 1 }} />
        {doc.arquivo_url && <button type="button" onClick={lerArquivo} disabled={lendo} style={{ ...btnCinza, padding: '5px 10px' }}>Ler do arquivo</button>}
        <button type="button" onClick={salvar} disabled={!alterado} style={{ ...btnVerde, padding: '5px 10px' }}>{salvo ? 'Salvo ✓' : 'Salvar dados'}</button>
      </div>
      {!preenchido && !alterado && !lendo && <span style={{ fontSize: 11, color: '#ef6c00' }}>Dados do resultado não preenchidos.</span>}
      {erro && <span style={{ fontSize: 11, color: '#c62828' }}>{erro}</span>}
    </div>
  );
}

function SecaoDocumentos({ participante, onRefresh }) {
  const [documentos, setDocumentos] = useState([]);
  const [checklistDef, setChecklistDef] = useState({});
  const [eventosResultado, setEventosResultado] = useState([]);
  const [anosResultado, setAnosResultado] = useState([]);
  const [sugestoesResultado, setSugestoesResultado] = useState([]);
  const [anexosDisponiveis, setAnexosDisponiveis] = useState([]);
  const [anexoEscolhido, setAnexoEscolhido] = useState(null);
  const [modalExtra, setModalExtra] = useState(false);
  const [formExtra, setFormExtra] = useState({ nome_exibicao: '', arquivo: null });
  const [erroExtra, setErroExtra] = useState('');
  const [erroGrupo, setErroGrupo] = useState('');
  const [avisoGerado, setAvisoGerado] = useState('');

  const carregar = useCallback(() => {
    axios.get(`/incentivo-esporte/documentos?participante_id=${participante.id}`).then(r => setDocumentos(r.data));
  }, [participante.id]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { axios.get('/incentivo-esporte/anexos').then(r => setAnexosDisponiveis(r.data)); }, []);
  useEffect(() => {
    axios.get('/incentivo-esporte/catalogos').then(r => {
      const lista = { tecnico: r.data.checklistTecnico, pessoa_juridica: r.data.checklistPessoaJuridica }[participante.tipo_pessoa] || r.data.checklistAtleta;
      setChecklistDef(Object.fromEntries(lista.map(i => [i.key, i])));
      setEventosResultado(r.data.resultadoEventos || []);
      setAnosResultado(r.data.anosResultado || []);
    });
  }, [participante.tipo_pessoa]);

  useEffect(() => {
    axios.get(`/incentivo-esporte/participantes/${participante.id}/projeto/sugestoes-resultado`).then(r => setSugestoesResultado(r.data)).catch(() => {});
  }, [participante.id]);

  const anexosParaEsteTipo = anexosDisponiveis.filter(a => a.gerar_para.includes(participante.tipo_pessoa));

  const mudarStatus = async (doc, status) => {
    await axios.put(`/incentivo-esporte/documentos/${doc.id}`, { status });
    carregar();
  };

  const enviarArquivo = async (doc, file) => {
    const fd = new FormData();
    fd.append('arquivo', file);
    await axios.put(`/incentivo-esporte/documentos/${doc.id}/arquivo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    carregar();
  };

  const remover = async (doc) => {
    if (!window.confirm(`Remover "${doc.nome_exibicao}" do checklist?`)) return;
    await axios.delete(`/incentivo-esporte/documentos/${doc.id}`);
    carregar();
  };

  const adicionarInstancia = async (tipoDocumento, nomeExibicao, file) => {
    setErroGrupo('');
    const fd = new FormData();
    fd.append('participante_id', participante.id);
    fd.append('tipo_documento', tipoDocumento);
    fd.append('nome_exibicao', nomeExibicao);
    fd.append('arquivo', file);
    try {
      await axios.post('/incentivo-esporte/documentos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      carregar();
    } catch (ex) { setErroGrupo(ex.response?.data?.erro || 'Erro ao adicionar arquivo'); }
  };

  const salvarExtra = async () => {
    setErroExtra('');
    if (!formExtra.nome_exibicao.trim()) return setErroExtra('Informe o nome do documento');
    const fd = new FormData();
    fd.append('participante_id', participante.id);
    fd.append('tipo_documento', 'extra');
    fd.append('nome_exibicao', formExtra.nome_exibicao);
    if (formExtra.arquivo) fd.append('arquivo', formExtra.arquivo);
    try {
      await axios.post('/incentivo-esporte/documentos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModalExtra(false);
      setFormExtra({ nome_exibicao: '', arquivo: null });
      carregar();
    } catch (ex) { setErroExtra(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  // documentos já vem ordenado por `ordem` (backend) — instâncias de um
  // mesmo item múltiplo (ex: comprovantes de resultado) ficam sempre juntas
  // na lista, então basta agrupar a primeira vez que a chave aparece.
  const gruposRenderizados = new Set();

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Documentos</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {anexosParaEsteTipo.length > 0 && (
            <select value="" onChange={e => { const a = anexosParaEsteTipo.find(x => x.codigo === e.target.value); if (a) setAnexoEscolhido(a); }}
              style={{ ...estiloInput, width: 220, padding: '5px 8px', fontSize: 12 }}>
              <option value="">Gerar anexo padrão...</option>
              {anexosParaEsteTipo.map(a => <option key={a.codigo} value={a.codigo}>Anexo {a.codigo} — {a.nome}</option>)}
            </select>
          )}
          <button onClick={() => setModalExtra(true)} style={btnVerde}>+ Documento</button>
        </div>
      </div>
      {erroGrupo && <p style={{ color: 'red', fontSize: 12, margin: '4px 18px 0' }}>{erroGrupo}</p>}
      {avisoGerado && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '8px 18px 0', padding: '8px 12px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 6, fontSize: 12, color: '#6d4c00' }}>
          <span style={{ flex: 1 }}>✍️ {avisoGerado}</span>
          <button onClick={() => setAvisoGerado('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d4c00' }}>✕</button>
        </div>
      )}
      <div style={{ padding: '4px 0' }}>
        {documentos.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '12px 18px' }}>Nenhum documento no checklist.</p>
        ) : (
          documentos.map(doc => {
            const def = checklistDef[doc.tipo_documento];
            if (def?.tipo === 'credencial') {
              return (
                <div key={doc.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f5f5f5' }}>
                  <LinhaCredencial doc={doc} participanteId={participante.id} tipoPessoa={participante.tipo_pessoa} mudarStatus={mudarStatus} onAlterado={carregar} />
                </div>
              );
            }
            if (def?.multiplo) {
              if (gruposRenderizados.has(doc.tipo_documento)) return null;
              gruposRenderizados.add(doc.tipo_documento);
              const instancias = documentos.filter(d => d.tipo_documento === doc.tipo_documento);
              // "+ Adicionar" só aparece quando todo slot existente já tem
              // arquivo — senão fica ambíguo com o "Enviar arquivo" do slot
              // vazio (as duas ações pareciam fazer a mesma coisa).
              const temSlotVazio = instancias.some(i => !i.arquivo_url);
              const podeAdicionar = !temSlotVazio && (!def.max || instancias.length < def.max);
              return (
                <div key={doc.tipo_documento} style={{ padding: '10px 18px', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{def.nome}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {instancias.map((inst, i) => (
                      <React.Fragment key={inst.id}>
                        <LinhaDocumento doc={inst} rotulo={`${def.rotulo_instancia || 'Arquivo'} ${i + 1}`}
                          mudarStatus={mudarStatus} enviarArquivo={enviarArquivo} remover={remover} />
                        {def.dados_resultado && (
                          <DadosResultado doc={inst} eventos={eventosResultado} anos={anosResultado} sugestoes={sugestoesResultado} onSalvo={carregar} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {podeAdicionar && (
                    <label style={{ ...btnCinza, cursor: 'pointer', display: 'inline-block', marginTop: 8 }}>
                      + Adicionar mais um{def.max ? ` (${instancias.length}/${def.max})` : ''}
                      <input type="file" hidden onChange={e => e.target.files[0] && adicionarInstancia(doc.tipo_documento, def.nome, e.target.files[0])} />
                    </label>
                  )}
                </div>
              );
            }
            return (
              <div key={doc.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f5f5f5' }}>
                <LinhaDocumento doc={doc} mudarStatus={mudarStatus} enviarArquivo={enviarArquivo} remover={remover} />
              </div>
            );
          })
        )}
      </div>

      {anexoEscolhido && (
        <ModalGerarAnexo participanteId={participante.id} tipoPessoa={participante.tipo_pessoa} anexo={anexoEscolhido}
          onFechar={() => setAnexoEscolhido(null)}
          onGerado={({ item, adicionado }) => {
            setAnexoEscolhido(null);
            setAvisoGerado(`Documento baixado. Imprima, colete a(s) assinatura(s) e envie o arquivo assinado no item "${item}"${adicionado ? ' (item adicionado de volta ao checklist como pendente)' : ''}.`);
            carregar();
          }} />
      )}

      {modalExtra && (
        <Modal titulo="Novo Documento" onFechar={() => setModalExtra(false)} largura={400}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nome do documento</label>
              <input value={formExtra.nome_exibicao} onChange={e => setFormExtra(f => ({ ...f, nome_exibicao: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Arquivo (opcional agora)</label>
              <input type="file" onChange={e => setFormExtra(f => ({ ...f, arquivo: e.target.files[0] }))} />
            </div>
            {erroExtra && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erroExtra}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalExtra(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvarExtra} style={btnVerde}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Seção: Contrapartidas ──────────────────────────────────────────────────

function SecaoContrapartidas({ participante }) {
  const [lista, setLista] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ tipo: 'campanha_doacao', descricao: '', data: '', arquivo: null });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    axios.get(`/incentivo-esporte/contrapartidas?participante_id=${participante.id}`).then(r => setLista(r.data));
  }, [participante.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const abrirModal = () => { setForm({ tipo: 'campanha_doacao', descricao: '', data: new Date().toISOString().slice(0, 10), arquivo: null }); setModalAberto(true); };

  const salvar = async () => {
    setSalvando(true);
    try {
      const fd = new FormData();
      fd.append('participante_id', participante.id);
      Object.entries(form).forEach(([k, v]) => { if (k !== 'arquivo' && v) fd.append(k, v); });
      if (form.arquivo) fd.append('comprovante', form.arquivo);
      await axios.post('/incentivo-esporte/contrapartidas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModalAberto(false);
      carregar();
    } finally { setSalvando(false); }
  };

  const marcarCumprida = async (c) => { await axios.put(`/incentivo-esporte/contrapartidas/${c.id}`, { status: 'cumprida' }); carregar(); };
  const remover = async (c) => { if (window.confirm('Remover esta contrapartida?')) { await axios.delete(`/incentivo-esporte/contrapartidas/${c.id}`); carregar(); } };

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Contrapartida Social</span>
        <button onClick={abrirModal} style={btnVerde}>+ Nova</button>
      </div>
      <div style={{ padding: '4px 0' }}>
        {lista.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '12px 18px' }}>Nenhuma contrapartida registrada.</p>
        ) : (
          lista.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{TIPO_CONTRAPARTIDA_LABEL[c.tipo]}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{c.descricao} {c.data ? `· ${formatData(c.data)}` : ''}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: c.status === 'cumprida' ? '#e8f5e9' : '#fff3e0', color: c.status === 'cumprida' ? '#2e7d32' : '#ef6c00' }}>
                {c.status === 'cumprida' ? 'Cumprida' : 'Pendente'}
              </span>
              {c.comprovante_url && (
                <a href={`${SERVER_ORIGIN}${c.comprovante_url}`} target="_blank" rel="noreferrer" style={{ ...btnAzul, textDecoration: 'none' }}>Ver</a>
              )}
              {c.status !== 'cumprida' && <button onClick={() => marcarCumprida(c)} style={btnVerde}>Marcar cumprida</button>}
              <button onClick={() => remover(c)} style={btnPerigo}>✕</button>
            </div>
          ))
        )}
      </div>

      {modalAberto && (
        <Modal titulo="Nova Contrapartida" onFechar={() => setModalAberto(false)} largura={420}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={estiloInput}>
                {Object.entries(TIPO_CONTRAPARTIDA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Descrição</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Comprovante (opcional)</label>
              <input type="file" onChange={e => setForm(f => ({ ...f, arquivo: e.target.files[0] }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalAberto(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={btnVerde}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Seção: Despesas ─────────────────────────────────────────────────────────

function SecaoDespesas({ participante }) {
  const [lista, setLista] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ categoria: '', descricao: '', valor: '', data_despesa: '', arquivo: null });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    axios.get(`/incentivo-esporte/despesas?participante_id=${participante.id}`).then(r => setLista(r.data));
  }, [participante.id]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { axios.get('/incentivo-esporte/catalogos').then(r => setCategorias(r.data.categoriasDespesa)); }, []);

  const catLabel = (v) => categorias.find(c => c.valor === v)?.label || v;

  const abrirModal = () => { setForm({ categoria: categorias[0]?.valor || '', descricao: '', valor: '', data_despesa: new Date().toISOString().slice(0, 10), arquivo: null }); setModalAberto(true); };

  const salvar = async () => {
    setSalvando(true);
    try {
      const fd = new FormData();
      fd.append('participante_id', participante.id);
      Object.entries(form).forEach(([k, v]) => { if (k !== 'arquivo' && v !== '') fd.append(k, v); });
      if (form.arquivo) fd.append('comprovante', form.arquivo);
      await axios.post('/incentivo-esporte/despesas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModalAberto(false);
      carregar();
    } finally { setSalvando(false); }
  };

  const alternarReportado = async (d) => {
    await axios.put(`/incentivo-esporte/despesas/${d.id}`, { reportado_prefeitura: !d.reportado_prefeitura });
    carregar();
  };
  const remover = async (d) => { if (window.confirm('Remover esta despesa?')) { await axios.delete(`/incentivo-esporte/despesas/${d.id}`); carregar(); } };

  const total = lista.reduce((s, d) => s + parseFloat(d.valor || 0), 0);

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Despesas da Verba — total {formatarMoeda(total)}</span>
        <button onClick={abrirModal} style={btnVerde}>+ Nova Despesa</button>
      </div>
      <div style={{ padding: '4px 0' }}>
        {lista.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, margin: '12px 18px' }}>Nenhuma despesa lançada.</p>
        ) : (
          lista.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{catLabel(d.categoria)}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{d.descricao} · {formatData(d.data_despesa)}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, minWidth: 80 }}>{formatarMoeda(d.valor)}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: d.comprovante_url ? '#2e7d32' : '#c62828' }}>{d.comprovante_url ? '✓ Comprovante' : '✕ Sem comprovante'}</span>
              <button onClick={() => alternarReportado(d)}
                style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: d.reportado_prefeitura ? '#e8f5e9' : '#f0f0f0', color: d.reportado_prefeitura ? '#2e7d32' : '#888' }}>
                {d.reportado_prefeitura ? '✓ Reportado à Prefeitura' : 'Marcar reportado'}
              </button>
              {d.comprovante_url && (
                <a href={`${SERVER_ORIGIN}${d.comprovante_url}`} target="_blank" rel="noreferrer" style={{ ...btnAzul, textDecoration: 'none' }}>Ver</a>
              )}
              <button onClick={() => remover(d)} style={btnPerigo}>✕</button>
            </div>
          ))
        )}
      </div>

      {modalAberto && (
        <Modal titulo="Nova Despesa" onFechar={() => setModalAberto(false)} largura={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Categoria (rubrica do edital)</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={estiloInput}>
                {categorias.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Descrição</label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={estiloInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Valor (R$)</label>
                <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={estiloInput} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Data</label>
              <input type="date" value={form.data_despesa} onChange={e => setForm(f => ({ ...f, data_despesa: e.target.value }))} style={estiloInput} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Comprovante (opcional agora)</label>
              <input type="file" onChange={e => setForm(f => ({ ...f, arquivo: e.target.files[0] }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalAberto(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.categoria} style={btnVerde}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sidebar: Dados pessoais + status + taxa de gestão ─────────────────────

// ── Contrato de consultoria ────────────────────────────────────────────────
// Gera o PDF do contrato (backend: contratoConsultoriaController). Dados do
// contratante vêm do cadastro (editáveis aqui, sem alterar o cadastro); os
// do consultor e as condições ficam salvos neste navegador pra próxima vez.
// v2: remuneração passou a ser % com teto + parcelas (out/2026); da v1 só
// aproveitamos os dados do consultor.
const CHAVE_PREFS_CONTRATO = 'incentivo.contratoConsultoria.prefs.v2';
const CHAVE_PREFS_CONTRATO_V1 = 'incentivo.contratoConsultoria.prefs';
const PREFS_CONTRATO_PADRAO = {
  contratado_nome: '', contratado_nacionalidade: 'brasileiro', contratado_estado_civil: 'casado', contratado_profissao: '',
  contratado_rg: '', contratado_cpf: '', contratado_endereco: '', contratado_email: '', contratado_telefone: '',
  percentual: 20, teto: 1500, parcelas: 1, prazo_pagamento_dias: 10, forma_pagamento: 'PIX para a chave ',
  multa_percentual: 2, indice_correcao: 'IPCA', comprovante_pagamento: 'recibo',
  prazo_notas_dias: 15, prazo_notificacao_dias: 2, aviso_rescisao_dias: 15,
  peso_elaboracao: 60, peso_acompanhamento: 15, peso_prestacao: 25,
  // Técnico do módulo cujo cadastro preenche os dados do consultor.
  contratado_fonte_id: '',
};

// Dados do consultor a partir de um técnico cadastrado no módulo (o
// usuário admin do sistema não tem CPF/endereço). Estado civil não existe
// no cadastro: fica o que já estava no formulário.
function dadosContratadoDeTecnico(t) {
  const endereco = [t.endereco, t.bairro, t.cep && `CEP ${t.cep}`, [t.cidade, t.estado].filter(Boolean).join('/')].filter(Boolean).join(', ');
  return {
    contratado_nome: t.nome || '', contratado_cpf: t.cpf || '', contratado_rg: t.rg || '',
    contratado_endereco: endereco, contratado_email: t.email || '', contratado_telefone: t.telefone || '',
    contratado_profissao: t.confef_cref ? `profissional de educação física (CREF ${t.confef_cref})` : 'profissional de educação física',
  };
}

function lerPrefsContrato() {
  // Valor vazio salvo (tentativa que falhou) não apaga o padrão.
  try {
    let salvas = JSON.parse(localStorage.getItem(CHAVE_PREFS_CONTRATO) || 'null');
    if (!salvas) {
      const v1 = JSON.parse(localStorage.getItem(CHAVE_PREFS_CONTRATO_V1) || '{}');
      salvas = Object.fromEntries(Object.entries(v1).filter(([k]) => k.startsWith('contratado_') || ['forma_pagamento', 'comprovante_pagamento', 'indice_correcao'].includes(k)));
    }
    return { ...PREFS_CONTRATO_PADRAO, ...Object.fromEntries(Object.entries(salvas).filter(([, v]) => v !== '' && v != null)) };
  }
  catch { return { ...PREFS_CONTRATO_PADRAO }; }
}

function idadeEm(iso) {
  if (!iso) return null;
  const hoje = new Date(); const n = new Date(iso + 'T00:00:00');
  let i = hoje.getFullYear() - n.getFullYear();
  if (hoje.getMonth() < n.getMonth() || (hoje.getMonth() === n.getMonth() && hoje.getDate() < n.getDate())) i--;
  return i;
}

function ModalContratoConsultoria({ participante, onFechar }) {
  const pj = participante.tipo_pessoa === 'pessoa_juridica';
  const menor = !pj && (idadeEm(participante.data_nascimento) ?? 99) < 18;
  const p = participante;
  const endereco = [p.endereco, p.bairro, p.cep && `CEP ${p.cep}`, [p.cidade, p.estado].filter(Boolean).join('/')].filter(Boolean).join(', ');
  const [form, setForm] = useState(() => ({
    ...lerPrefsContrato(),
    projeto_nome: p.projeto_nome || '',
    data: new Date().toISOString().slice(0, 10),
    contratante_nome: p.nome || '', contratante_rg: p.rg || '', contratante_cpf: p.cpf || '',
    contratante_nascimento: p.data_nascimento ? formatData(p.data_nascimento) : '', contratante_endereco: endereco,
    responsavel_nome: p.responsavel_legal_nome || '', responsavel_rg: p.responsavel_legal_rg || '', responsavel_cpf: p.responsavel_legal_cpf || '',
    pj_razao_social: p.nome || '', pj_cnpj: p.cnpj || '', pj_sede: endereco, pj_cargo_representante: 'presidente',
    pj_representante_nome: p.responsavel_legal_nome || '', pj_representante_rg: p.responsavel_legal_rg || '', pj_representante_cpf: p.responsavel_legal_cpf || '',
    pj_documento_representacao: 'estatuto social e ata de eleição da diretoria registrada em cartório',
    pj_email_institucional: p.tipo_pessoa === 'pessoa_juridica' ? (p.email || '') : '',
  }));
  const [faltando, setFaltando] = useState([]);
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);

  // Preenche o consultor com o técnico lembrado da última vez — ou, na
  // primeira vez, com o único técnico cadastrado, se houver só um.
  useEffect(() => {
    axios.get('/incentivo-esporte/participantes?tipo_pessoa=tecnico').then(r => {
      setTecnicos(r.data);
      setForm(f => {
        const fonte = r.data.find(t => t.id === f.contratado_fonte_id) || (!f.contratado_nome && r.data.length === 1 ? r.data[0] : null);
        return fonte ? { ...f, ...dadosContratadoDeTecnico(fonte), contratado_fonte_id: fonte.id } : f;
      });
    }).catch(() => {});
  }, []);

  const usarTecnico = (id) => {
    const t = tecnicos.find(x => x.id === id);
    setForm(f => (t ? { ...f, ...dadosContratadoDeTecnico(t), contratado_fonte_id: t.id } : { ...f, contratado_fonte_id: '' }));
  };

  const campo = (k, rotulo, extra = {}) => (
    <div style={{ flex: extra.flex || 1, minWidth: extra.minWidth || 120 }}>
      <label style={{ fontSize: 11, display: 'block', marginBottom: 3, color: faltando.includes(k) ? '#c62828' : '#555' }}>{rotulo}</label>
      <input type={extra.type || 'text'} value={form[k] ?? ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
        style={{ ...estiloInput, padding: '6px 8px', fontSize: 13, borderColor: faltando.includes(k) ? '#c62828' : '#ddd' }} />
    </div>
  );
  const linha = (...filhos) => <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{filhos}</div>;
  const secao = (t) => <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginTop: 8 }}>{t}</div>;

  const gerar = async () => {
    setErro(''); setFaltando([]); setGerando(true);
    try {
      const prefs = Object.fromEntries(Object.keys(PREFS_CONTRATO_PADRAO).map(k => [k, form[k]]));
      try { localStorage.setItem(CHAVE_PREFS_CONTRATO, JSON.stringify(prefs)); } catch { /* sem storage: só não lembra */ }
      const r = await axios.post(`/incentivo-esporte/participantes/${participante.id}/contrato-consultoria`, { campos: form }, { responseType: 'blob' });
      const nomeArquivo = /filename="([^"]+)"/.exec(r.headers['content-disposition'] || '')?.[1] || 'Contrato_Consultoria.pdf';
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = nomeArquivo;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      onFechar();
    } catch (ex) {
      let corpo = {};
      try { corpo = JSON.parse(await ex.response.data.text()); } catch { /* resposta não-JSON */ }
      setErro(corpo.erro || 'Erro ao gerar o contrato');
      setFaltando(corpo.faltando || []);
    } finally { setGerando(false); }
  };

  return (
    <Modal titulo="Gerar contrato de consultoria" onFechar={onFechar} largura={720}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
          Confira e complete os campos. Os dados do contratante vêm do cadastro (alterar aqui não muda o cadastro); os seus dados e as condições ficam salvos neste navegador.
        </p>

        {secao('Contratado (você)')}
        {tecnicos.length > 0 && (
          <div>
            <label style={{ fontSize: 11, display: 'block', marginBottom: 3, color: '#555' }}>Preencher com o cadastro de técnico</label>
            <select value={form.contratado_fonte_id || ''} onChange={e => usarTecnico(e.target.value)} style={{ ...estiloInput, padding: '6px 8px', fontSize: 13 }}>
              <option value="">— digitar manualmente —</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        )}
        {linha(campo('contratado_nome', 'Nome completo', { flex: 2 }), campo('contratado_cpf', 'CPF'), campo('contratado_rg', 'RG'))}
        {linha(campo('contratado_nacionalidade', 'Nacionalidade'), campo('contratado_estado_civil', 'Estado civil'), campo('contratado_profissao', 'Profissão'))}
        {linha(campo('contratado_endereco', 'Endereço completo (com CEP, cidade/UF)', { flex: 3 }))}
        {linha(campo('contratado_email', 'E-mail', { flex: 2 }), campo('contratado_telefone', 'Telefone'))}

        {secao(pj ? 'Contratante (entidade)' : 'Contratante')}
        {pj ? (<>
          {linha(campo('pj_razao_social', 'Razão social', { flex: 2 }), campo('pj_cnpj', 'CNPJ'))}
          {linha(campo('pj_sede', 'Sede (endereço completo)', { flex: 3 }))}
          {linha(campo('pj_email_institucional', 'E-mail institucional (login do CNPJ no Sistema Incentivo online)', { flex: 3 }))}
          {linha(campo('pj_cargo_representante', 'Cargo do representante'), campo('pj_representante_nome', 'Nome do representante', { flex: 2 }))}
          {linha(campo('pj_representante_rg', 'RG do representante'), campo('pj_representante_cpf', 'CPF do representante'))}
          {linha(campo('pj_documento_representacao', 'Documento que dá poderes ao representante', { flex: 3 }))}
        </>) : (<>
          {linha(campo('contratante_nome', 'Nome completo', { flex: 2 }), campo('contratante_cpf', 'CPF'), campo('contratante_rg', 'RG'))}
          {linha(campo('contratante_nascimento', 'Nascimento (dd/mm/aaaa)'), campo('contratante_endereco', 'Endereço completo', { flex: 3 }))}
          {menor && (<>
            {secao('Responsável legal (contratante menor de 18)')}
            {linha(campo('responsavel_nome', 'Nome', { flex: 2 }), campo('responsavel_cpf', 'CPF'), campo('responsavel_rg', 'RG'))}
          </>)}
        </>)}

        {secao('Projeto e remuneração')}
        {linha(campo('projeto_nome', 'Nome do projeto', { flex: 3 }), campo('data', 'Data do contrato', { type: 'date' }))}
        {linha(
          campo('percentual', 'Percentual (%)', { type: 'number', minWidth: 90 }),
          campo('teto', 'Teto (R$)', { type: 'number', minWidth: 110 }),
          <div key="parc" style={{ flex: 1, minWidth: 130 }}>
            <label style={{ fontSize: 11, display: 'block', marginBottom: 3, color: faltando.includes('parcelas') ? '#c62828' : '#555' }}>Parcelas (mensais)</label>
            <select value={form.parcelas} onChange={e => setForm(f => ({ ...f, parcelas: Number(e.target.value) }))} style={{ ...estiloInput, padding: '6px 8px', fontSize: 13 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n === 1 ? 'À vista (1x)' : `${n}x`}</option>)}
            </select>
          </div>,
          campo('prazo_pagamento_dias', '1ª parcela (dias após o incentivo)', { type: 'number', minWidth: 90 }),
        )}
        {linha(campo('forma_pagamento', 'Meio de pagamento (ex.: PIX para a chave ...)', { flex: 3 }), campo('comprovante_pagamento', 'Comprovante (recibo, RPA, nota fiscal)'))}
        {linha(campo('multa_percentual', 'Multa por atraso (%)', { type: 'number' }), campo('indice_correcao', 'Índice de correção'))}

        {secao('Prazos e rescisão')}
        {linha(campo('prazo_notas_dias', 'Entrega de notas fiscais (dias)', { type: 'number' }), campo('prazo_notificacao_dias', 'Aviso de notificação (dias úteis)', { type: 'number' }), campo('aviso_rescisao_dias', 'Aviso de rescisão (dias)', { type: 'number' }))}
        {linha(campo('peso_elaboracao', 'Peso: elaboração (%)', { type: 'number' }), campo('peso_acompanhamento', 'Peso: acompanhamento (%)', { type: 'number' }), campo('peso_prestacao', 'Peso: prestação de contas (%)', { type: 'number' }))}

        {erro && <p style={{ color: '#c62828', fontSize: 13, margin: 0 }}>{erro}{faltando.length > 0 ? ' — campos em vermelho.' : ''}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onFechar} style={btnCinza}>Cancelar</button>
          <button onClick={gerar} disabled={gerando} style={btnVerde}>{gerando ? 'Gerando...' : 'Gerar e baixar PDF'}</button>
        </div>
      </div>
    </Modal>
  );
}

function SecaoDadosPJ({ participante, onAtualizado }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(participante);
  const [erro, setErro] = useState('');
  const pessoa = (n, rg, cpf) => [n, rg && `RG ${rg}`, cpf && `CPF ${cpf}`].filter(Boolean).join(' · ');

  const salvar = async () => {
    setErro('');
    if (!String(form.nome || '').trim()) return setErro('Informe a razão social');
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    try {
      await axios.put(`/incentivo-esporte/participantes/${participante.id}`, payload);
      setEditando(false);
      onAtualizado();
    } catch (ex) { setErro(ex.response?.data?.erro || 'Erro ao salvar'); }
  };

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Dados da Entidade</span>
        {!editando && <button onClick={() => { setForm(participante); setErro(''); setEditando(true); }} style={btnAzul}>✎ Editar</button>}
      </div>
      <div style={{ padding: '12px 18px' }}>
        {!editando ? (
          <>
            <LinhaInfo label="CNPJ" valor={participante.cnpj} />
            <LinhaInfo label="Telefone" valor={participante.telefone} />
            <LinhaInfo label="Email" valor={participante.email} />
            <LinhaInfo label="Sede" valor={[participante.endereco, participante.bairro, participante.cep && `CEP ${participante.cep}`, [participante.cidade, participante.estado].filter(Boolean).join('/')].filter(Boolean).join(' - ')} />
            <LinhaInfo label="Presidente" valor={pessoa(participante.responsavel_legal_nome, participante.responsavel_legal_rg, participante.responsavel_legal_cpf)} />
            <LinhaInfo label="Resp. financeiro" valor={pessoa(participante.responsavel_financeiro_nome, participante.responsavel_financeiro_rg, participante.responsavel_financeiro_cpf)} />
            <LinhaInfo label="Projeto" valor={participante.projeto_nome} />
            <LinhaInfo label="Modalidade" valor={participante.Esporte?.nome} />
            <LinhaInfo label="Local execução" valor={participante.local_execucao} />
            <LinhaInfo label="Atende menores" valor={participante.atua_com_menores ? 'Sim' : 'Não'} />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <CamposPJ form={form} setForm={setForm} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={!!form.atua_com_menores} onChange={e => setForm(f => ({ ...f, atua_com_menores: e.target.checked }))} />
              O projeto atende menores de 18
            </label>
            {!!form.atua_com_menores !== !!participante.atua_com_menores && (
              <p style={{ fontSize: 12, color: '#ef6c00', margin: 0 }}>
                Ao salvar, o checklist troca {form.atua_com_menores ? 'o Anexo XX pelas certidões de antecedentes dos colaboradores' : 'as certidões de antecedentes pelo Anexo XX'} (item antigo só é removido se ainda estiver vazio).
              </p>
            )}
            {erro && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setEditando(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} style={btnVerde}>Salvar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SecaoDadosPessoais({ participante, onAtualizado }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(participante);

  const abrirEdicao = () => { setForm(participante); setEditando(true); };
  const salvar = async () => {
    // Campos de data limpos pelo usuário viram '' no input — o MySQL
    // rejeita '' em colunas DATE/DATEONLY, precisa ir como null.
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    await axios.put(`/incentivo-esporte/participantes/${participante.id}`, payload);
    setEditando(false);
    onAtualizado();
  };

  return (
    <div style={card()}>
      <div style={cardHeader}>
        <span style={cardTitle}>Dados Pessoais</span>
        {!editando && <button onClick={abrirEdicao} style={btnAzul}>✎ Editar</button>}
      </div>
      <div style={{ padding: '12px 18px' }}>
        {!editando ? (
          <>
            <LinhaInfo label="CPF" valor={participante.cpf} />
            <LinhaInfo label="RG" valor={participante.rg} />
            <LinhaInfo label="Nascimento" valor={formatData(participante.data_nascimento)} />
            <LinhaInfo label="Telefone" valor={participante.telefone} />
            <LinhaInfo label="Email" valor={participante.email} />
            <LinhaInfo label="Endereço" valor={[participante.endereco, participante.bairro, participante.cep && `CEP ${participante.cep}`, [participante.cidade, participante.estado].filter(Boolean).join('/')].filter(Boolean).join(' - ')} />
            {participante.tipo_pessoa === 'tecnico' && <LinhaInfo label="CONFEF/CREF" valor={participante.confef_cref} />}
            {participante.tipo_pessoa === 'atleta' && <LinhaInfo label="Técnico" valor={participante.TecnicoResponsavel?.nome} />}
            <LinhaInfo label="Esporte" valor={participante.Esporte ? `${participante.Esporte.nome}${participante.Esporte.olimpico === true ? ' (olímpico — Anexo I)' : participante.Esporte.olimpico === false ? ' (não olímpico — Anexo II)' : ''}` : null} />
            <LinhaInfo label="Vínculo federativo" valor={participante.vinculo_federativo !== 'possui' ? 'Não possui'
              : participante.EntidadeFederativa
                ? `${participante.EntidadeFederativa.nome}${participante.EntidadeFederativa.cnpj ? ` - CNPJ ${participante.EntidadeFederativa.cnpj}` : ''} (${participante.EntidadeFederativa.cidade || '—'})`
                : `${participante.vinculo_federativo_entidade || '—'} (${participante.vinculo_federativo_cidade || '—'}) — sem entidade do cadastro`} />
            <LinhaInfo label="Atua c/ menores" valor={participante.atua_com_menores ? 'Sim' : 'Não'} />
            <LinhaInfo label="Proprietário imóvel" valor={participante.proprietario_imovel ? 'Sim' : 'Não'} />
            {!participante.proprietario_imovel && <LinhaInfo label="Mora c/ responsável" valor={participante.mora_com_responsavel ? 'Sim' : 'Não'} />}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Nome" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={estiloInput} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="CPF" value={form.cpf || ''} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} style={estiloInput} />
              <input placeholder="RG" value={form.rg || ''} onChange={e => setForm(f => ({ ...f, rg: e.target.value }))} style={estiloInput} />
            </div>
            <input type="date" value={form.data_nascimento || ''} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} style={estiloInput} />
            <input placeholder="Telefone" value={form.telefone || ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} style={estiloInput} />
            <input placeholder="Email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={estiloInput} />
            <input placeholder="Endereço (rua, nº, compl.)" value={form.endereco || ''} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} style={estiloInput} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Bairro" value={form.bairro || ''} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} style={estiloInput} />
              <input placeholder="CEP" value={form.cep || ''} onChange={e => setForm(f => ({ ...f, cep: formatarCep(e.target.value) }))} style={{ ...estiloInput, maxWidth: 110 }} />
              <input placeholder="Cidade" value={form.cidade || ''} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} style={estiloInput} />
              <input placeholder="UF" value={form.estado || ''} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} style={{ ...estiloInput, maxWidth: 60 }} />
            </div>
            {form.tipo_pessoa === 'tecnico' && (
              <input placeholder="CONFEF/CREF" value={form.confef_cref || ''} onChange={e => setForm(f => ({ ...f, confef_cref: e.target.value }))} style={estiloInput} />
            )}
            <SeletorEsporte valor={form.esporte_id} onChange={v => setForm(f => ({ ...f, esporte_id: v }))} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Vínculo federativo</label>
                <select value={form.vinculo_federativo || 'nao_possui'} onChange={e => setForm(f => ({ ...f, vinculo_federativo: e.target.value }))} style={estiloInput}>
                  <option value="nao_possui">Não possui</option>
                  <option value="possui">Possui</option>
                </select>
              </div>
              {form.vinculo_federativo === 'possui' && (
                <SeletorEntidade valor={form.entidade_federativa_id} onChange={v => setForm(f => ({ ...f, entidade_federativa_id: v }))}
                  textoLegado={!form.entidade_federativa_id ? participante.vinculo_federativo_entidade : null} />
              )}
            </div>
            {form.vinculo_federativo !== participante.vinculo_federativo && (
              <p style={{ fontSize: 12, color: '#ef6c00', margin: 0 }}>
                Vínculo alterado: em Documentos, remova o Anexo {participante.vinculo_federativo === 'possui' ? 'XVII' : 'XVIII'} já gerado (se houver) e gere o Anexo {form.vinculo_federativo === 'possui' ? 'XVII' : 'XVIII'}.
              </p>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={!!form.atua_com_menores} onChange={e => setForm(f => ({ ...f, atua_com_menores: e.target.checked }))} />
              Atua com menores de 18
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={!!form.proprietario_imovel} onChange={e => setForm(f => ({ ...f, proprietario_imovel: e.target.checked }))} />
              É proprietário do imóvel onde reside
            </label>
            {!form.proprietario_imovel && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.mora_com_responsavel !== false} onChange={e => setForm(f => ({ ...f, mora_com_responsavel: e.target.checked }))} />
                Mora com os pais/responsável legal (se menor de 18)
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setEditando(false)} style={btnCinza}>Cancelar</button>
              <button onClick={salvar} style={btnVerde}>Salvar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SecaoPrograma({ participante, onAtualizado }) {
  const mudarStatus = async (status_programa) => {
    await axios.put(`/incentivo-esporte/participantes/${participante.id}`, { status_programa });
    onAtualizado();
  };
  const alternarTaxaGestao = async () => {
    const taxa_gestao_paga = !participante.taxa_gestao_paga;
    await axios.put(`/incentivo-esporte/participantes/${participante.id}`, {
      taxa_gestao_paga,
      taxa_gestao_data: taxa_gestao_paga ? new Date().toISOString().slice(0, 10) : null,
    });
    onAtualizado();
  };

  return (
    <div style={card()}>
      <div style={cardHeader}><span style={cardTitle}>Programa</span></div>
      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Status no programa</label>
          <select value={participante.status_programa} onChange={e => mudarStatus(e.target.value)} style={estiloInput}>
            {Object.entries(STATUS_PROGRAMA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #f0f0f0' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Taxa de gestão</div>
            <div style={{ fontSize: 11, color: '#888' }}>{participante.taxa_gestao_paga ? `Paga em ${formatData(participante.taxa_gestao_data)}` : 'Ainda não paga'}</div>
          </div>
          <button onClick={alternarTaxaGestao} style={participante.taxa_gestao_paga ? btnCinza : btnVerde}>
            {participante.taxa_gestao_paga ? 'Marcar como não paga' : 'Marcar como paga'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function ParticipanteIncentivoDetalhe({ participanteId, onVoltar }) {
  const [participante, setParticipante] = useState(null);
  const [modalContrato, setModalContrato] = useState(false);
  const [baixandoPacote, setBaixandoPacote] = useState(false);
  const [erroPacote, setErroPacote] = useState('');

  // .zip com todos os arquivos do checklist + LEIA-ME com pendências.
  const baixarProjeto = async () => {
    setBaixandoPacote(true); setErroPacote('');
    try {
      const r = await axios.get(`/incentivo-esporte/participantes/${participanteId}/pacote-projeto`, { responseType: 'blob' });
      const nome = /filename="([^"]+)"/.exec(r.headers['content-disposition'] || '')?.[1] || 'Projeto.zip';
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = nome;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (ex) {
      let msg = 'Erro ao baixar o projeto';
      try { msg = JSON.parse(await ex.response.data.text()).erro || msg; } catch { /* mantém genérica */ }
      setErroPacote(msg);
    } finally { setBaixandoPacote(false); }
  };
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    setCarregando(true);
    axios.get(`/incentivo-esporte/participantes/${participanteId}`)
      .then(r => setParticipante(r.data))
      .finally(() => setCarregando(false));
  }, [participanteId]);
  useEffect(() => { carregar(); }, [carregar]);

  if (carregando) return <div style={{ padding: 24, color: '#888' }}>Carregando...</div>;
  if (!participante) return <div style={{ padding: 24, color: '#c00' }}>Participante não encontrado.</div>;

  return (
    <div>
      <button onClick={onVoltar} style={{ ...btnCinza, marginBottom: 12 }}>← Voltar</button>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
        <h1 style={{ margin: 0, fontSize: 24, color: '#1e2a38' }}>{participante.nome}</h1>
        <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
          {TIPO_PESSOA_LABEL[participante.tipo_pessoa]} · {participante.tipo_pessoa === 'pessoa_juridica' ? (participante.cnpj ? `CNPJ ${participante.cnpj}` : 'sem CNPJ') : participante.aluno_id ? 'Aluno matriculado' : 'Avulso'}
        </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'right' }}>
            <button onClick={baixarProjeto} disabled={baixandoPacote} style={{ ...btnVerde, padding: '8px 16px', fontSize: 13 }}>
              {baixandoPacote ? 'Montando arquivo...' : '⬇ Baixar projeto'}
            </button>
            {erroPacote && <div style={{ fontSize: 11, color: '#c62828', marginTop: 3 }}>{erroPacote}</div>}
          </div>
          <button onClick={() => setModalContrato(true)} style={btnAzul}>📄 Gerar contrato de consultoria</button>
        </div>
      </div>
      {modalContrato && <ModalContratoConsultoria participante={participante} onFechar={() => setModalContrato(false)} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div>
          <SecaoDocumentos participante={participante} onRefresh={carregar} />
          <SecaoProjetoIncentivo participante={participante} />
          <SecaoContrapartidas participante={participante} />
          <SecaoDespesas participante={participante} />
        </div>
        <div>
          <SecaoPrograma participante={participante} onAtualizado={carregar} />
          {participante.tipo_pessoa === 'pessoa_juridica'
            ? <SecaoDadosPJ participante={participante} onAtualizado={carregar} />
            : <SecaoDadosPessoais participante={participante} onAtualizado={carregar} />}
        </div>
      </div>
    </div>
  );
}
