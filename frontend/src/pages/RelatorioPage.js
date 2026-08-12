import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { corDaFaixa } from '../utils/faixaCores';
import Avatar from '../components/Avatar';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const TITULOS = {
  'alunos-por-graduacao': 'Alunos por Graduação',
  'alunos-por-turma': 'Alunos por Turma-Horário',
  'ficha-cadastral': 'Ficha Cadastral Resumida',
  'frequencia-turma': 'Aulas & Frequências (Turma)',
  'frequencia-aluno': 'Aulas & Frequências (Aluno)',
  'aniversariantes': 'Aniversariantes por Mês',
  'presenca-minima': 'Frequência: Presença Mínima',
  'frequencia-percentual': 'Frequência: % de Presença',
  'financeiro': 'Financeiro: Pagamentos',
};

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const btnPrimario = { background: '#1e2a38', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const thEstilo = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #eee' };
const tdEstilo = { padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #f5f5f5' };

function formatData(iso) {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}

function FaixaSwatch({ nome, cor }) {
  if (!nome) return <span>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: corDaFaixa(nome, cor), border: '1px solid #ccc', display: 'inline-block', flexShrink: 0 }} />
      {nome}
    </span>
  );
}

// Monta a URL + querystring do endpoint certo pra cada tipo de relatório,
// a partir dos filtros vindos na querystring da própria página (ex:
// /relatorio/alunos-por-graduacao?arte_marcial_id=...&exibir_turmas=true).
function endpointDoRelatorio(tipo, params) {
  const qs = new URLSearchParams(params).toString();
  if (tipo === 'presenca-minima') return `/dashboard/graduacao?${qs}`;
  return `/relatorios/${tipo}?${qs}`;
}

// ─── Renderizadores por tipo de relatório ────────────────────────────────────

function TabelaAlunosPorGraduacao({ dados }) {
  return (
    <>
      {dados.faixas.length === 0 && <p style={{ color: '#888' }}>Nenhum aluno encontrado.</p>}
      {dados.faixas.map((f) => (
        <div key={f.faixa.id} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: corDaFaixa(f.faixa.nome, f.faixa.cor), border: '1px solid #ccc', display: 'inline-block' }} />
            <strong>{f.faixa.nome}</strong>
            <span style={{ color: '#888', fontSize: 12 }}>({f.alunos.length})</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {f.alunos.map((a) => (
                <tr key={a.id}>
                  <td style={tdEstilo}>{a.nome}</td>
                  {dados.exibir_turmas && <td style={{ ...tdEstilo, color: '#666' }}>{(a.turmas || []).join(', ')}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

function TabelaAlunosPorTurma({ dados }) {
  return (
    <>
      <div style={{ marginBottom: 16, fontSize: 13, color: '#555' }}>
        <div><strong>{dados.turma.nome?.split('\n')[0]}</strong></div>
        <div>{dados.turma.arte_marcial} · Prof. {dados.turma.professor}</div>
        {dados.turma.horarios?.length > 0 && (
          <div>{dados.turma.horarios.map((h, i) => `${DIAS_SEMANA[h.dia_semana]} ${h.hora_inicio?.slice(0, 5)}–${h.hora_fim?.slice(0, 5)}`).join(' · ')}</div>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={thEstilo}>Nome</th>
          <th style={thEstilo}>Faixa</th>
          {dados.com_plano_pagamento && <th style={thEstilo}>Plano de Pagamento</th>}
        </tr></thead>
        <tbody>
          {dados.alunos.length === 0 && <tr><td colSpan={3} style={tdEstilo}>Nenhum aluno matriculado.</td></tr>}
          {dados.alunos.map((a) => (
            <tr key={a.id}>
              <td style={tdEstilo}>{a.nome}</td>
              <td style={tdEstilo}><FaixaSwatch nome={a.faixa} cor={a.faixa_cor} /></td>
              {dados.com_plano_pagamento && <td style={tdEstilo}>{a.plano || '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function FichaCadastral({ dados }) {
  const a = dados.aluno;
  const linha = (label, valor) => (
    <div style={{ display: 'flex', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ width: 160, color: '#888', fontSize: 12 }}>{label}</span>
      <span style={{ fontSize: 13 }}>{valor || '—'}</span>
    </div>
  );
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{a.nome}</h3>
      {linha('Matrícula', a.matricula)}
      {linha('Apelido', a.apelido)}
      {linha('E-mail', a.email)}
      {linha('Telefone', a.telefone)}
      {linha('Data de nascimento', formatData(a.data_nascimento))}
      {linha('CPF', a.cpf)}
      {linha('RG', a.rg)}
      {linha('Gênero', a.genero)}
      {linha('Naturalidade', a.naturalidade)}
      {linha('Profissão', a.profissao)}
      {linha('Endereço', [a.endereco, a.bairro, a.cidade, a.estado, a.cep].filter(Boolean).join(', '))}
      {linha('Mãe', a.mae)}
      {linha('Pai', a.pai)}
      {linha('Data de ingresso', formatData(a.data_ingresso))}
      {linha('Turmas', dados.turmas.join(', '))}
      <div style={{ display: 'flex', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
        <span style={{ width: 160, color: '#888', fontSize: 12 }}>Graduação atual</span>
        <span style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {dados.graduacoes_atuais.length === 0 && '—'}
          {dados.graduacoes_atuais.map((g, i) => (
            <span key={i}>{g.arte}: <FaixaSwatch nome={g.faixa} cor={g.faixa_cor} /></span>
          ))}
        </span>
      </div>
      {a.observacoes && linha('Observações', a.observacoes)}
    </div>
  );
}

function FrequenciaTurma({ dados }) {
  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 13, color: '#555' }}>
        <strong>{dados.turma.nome?.split('\n')[0]}</strong> · {formatData(dados.periodo.inicio)} a {formatData(dados.periodo.fim)}
      </div>
      {dados.modo === 'quantitativo' ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={thEstilo}>Aluno</th>
            <th style={thEstilo}>Presenças</th>
            <th style={thEstilo}>Total de Aulas</th>
            <th style={thEstilo}>%</th>
          </tr></thead>
          <tbody>
            {dados.alunos.length === 0 && <tr><td colSpan={4} style={tdEstilo}>Nenhum aluno matriculado.</td></tr>}
            {dados.alunos.map((a) => (
              <tr key={a.id}>
                <td style={tdEstilo}>{a.nome}</td>
                <td style={tdEstilo}>{a.presencas}</td>
                <td style={tdEstilo}>{a.total_aulas}</td>
                <td style={tdEstilo}>{a.percentual}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={thEstilo}>Data</th>
            <th style={thEstilo}>Presentes</th>
          </tr></thead>
          <tbody>
            {dados.aulas.length === 0 && <tr><td colSpan={2} style={tdEstilo}>Nenhuma aula no período.</td></tr>}
            {dados.aulas.map((au) => (
              <tr key={au.id}>
                <td style={{ ...tdEstilo, whiteSpace: 'nowrap' }}>{formatData(au.data)} {au.hora_inicio?.slice(0, 5)}</td>
                <td style={tdEstilo}>{au.presentes.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FrequenciaAluno({ dados }) {
  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 13, color: '#555' }}>
        <strong>{dados.aluno.nome}</strong> · {formatData(dados.periodo.inicio)} a {formatData(dados.periodo.fim)} · {dados.total} presença{dados.total !== 1 ? 's' : ''}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={thEstilo}>Data</th>
          <th style={thEstilo}>Turma</th>
          <th style={thEstilo}>Origem</th>
        </tr></thead>
        <tbody>
          {dados.chamadas.length === 0 && <tr><td colSpan={3} style={tdEstilo}>Nenhuma presença no período.</td></tr>}
          {dados.chamadas.map((c, i) => (
            <tr key={i}>
              <td style={{ ...tdEstilo, whiteSpace: 'nowrap' }}>{formatData(c.data)} {c.hora_inicio?.slice(0, 5)}</td>
              <td style={tdEstilo}>{c.turma?.split('\n')[0]}</td>
              <td style={tdEstilo}>{c.origem === 'qrcode' ? 'QR Code' : 'Professor'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Aniversariantes({ dados }) {
  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 13, color: '#555' }}><strong>{MESES[dados.mes - 1]}</strong></div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={thEstilo}>Nome</th>
          <th style={thEstilo}>Data</th>
          <th style={thEstilo}>Matrícula</th>
          <th style={thEstilo}>Telefone</th>
        </tr></thead>
        <tbody>
          {dados.aniversariantes.length === 0 && <tr><td colSpan={4} style={tdEstilo}>Nenhum aniversariante neste mês.</td></tr>}
          {dados.aniversariantes.map((a) => (
            <tr key={a.id}>
              <td style={tdEstilo}>{a.nome}</td>
              <td style={tdEstilo}>{formatData(a.data_nascimento)}</td>
              <td style={tdEstilo}>{a.matricula || '—'}</td>
              <td style={tdEstilo}>{a.telefone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PresencaMinima({ dados }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>Alunos que já atingiram a frequência mínima da graduação atual.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={thEstilo}>Aluno</th>
          <th style={thEstilo}>Turma</th>
          <th style={thEstilo}>Faixa Atual</th>
          <th style={thEstilo}>Aulas / Carência</th>
        </tr></thead>
        <tbody>
          {dados.elegiveis.length === 0 && <tr><td colSpan={4} style={tdEstilo}>Nenhum aluno atingiu a carência ainda.</td></tr>}
          {dados.elegiveis.map((e) => (
            <tr key={e.aluno.id}>
              <td style={tdEstilo}>{e.aluno.nome}</td>
              <td style={tdEstilo}>{e.turma}</td>
              <td style={tdEstilo}><FaixaSwatch nome={e.faixa_atual} cor={e.faixa_cor} /></td>
              <td style={tdEstilo}>{e.aulas_desde_graduacao} / {e.min_aulas_criterio}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FrequenciaPercentual({ dados }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>
        % da carência cumprida por cada aluno ativo, em relação à faixa atual (aulas desde o início
        dessa graduação ÷ carência mínima cadastrada pra faixa). "—" = sem critério de carência cadastrado.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={thEstilo}>Aluno</th>
          <th style={thEstilo}>Turma(s)</th>
          <th style={thEstilo}>Faixa Atual</th>
          <th style={thEstilo}>Aulas / Carência</th>
          <th style={thEstilo}>%</th>
        </tr></thead>
        <tbody>
          {dados.alunos.length === 0 && <tr><td colSpan={5} style={tdEstilo}>Nenhum aluno encontrado.</td></tr>}
          {dados.alunos.map((a) => (
            <tr key={a.id}>
              <td style={tdEstilo}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Avatar fotoUrl={a.foto_url} nome={a.nome} tamanho={24} />
                  {a.nome}
                </span>
              </td>
              <td style={{ ...tdEstilo, color: '#666' }}>{(a.turmas || []).map(t => t.split('\n')[0]).join(', ')}</td>
              <td style={tdEstilo}><FaixaSwatch nome={a.faixa_atual} cor={a.faixa_cor} /></td>
              <td style={tdEstilo}>{a.min_aulas_criterio === null ? '—' : `${a.aulas_presentes} / ${a.min_aulas_criterio}`}</td>
              <td style={tdEstilo}>{a.percentual === null ? '—' : `${a.percentual}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatarMoeda(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function IndicadorBox({ label, value, color }) {
  return (
    <div style={{ background: `${color}11`, border: `1px solid ${color}33`, borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1e2a38', marginTop: 4 }}>{value}</div>
    </div>
  );
}

// Gerado no navegador a partir dos dados já carregados (sem endpoint novo
// no backend) — uma aba "Resumo" com o mesmo briefing do cabeçalho e outra
// "Pagamentos" com a tabela completa, mesma info da página impressa.
async function exportarFinanceiroXLS(dados) {
  const { indicadores: ind } = dados;
  const wb = new ExcelJS.Workbook();

  const resumo = wb.addWorksheet('Resumo');
  resumo.addRow(['Financeiro: Pagamentos']);
  resumo.addRow(['Turma', dados.turma ? dados.turma.nome.split('\n')[0] : 'Todas']);
  resumo.addRow(['Plano', dados.plano ? dados.plano.nome : 'Todos']);
  resumo.addRow(['Período', `${formatData(dados.periodo.inicio)} a ${formatData(dados.periodo.fim)}`]);
  resumo.addRow([]);
  resumo.addRow(['Recebido no período', ind.total_recebido]);
  resumo.addRow(['Pagamentos', ind.qtd_pagamentos]);
  resumo.addRow(['Ticket médio', ind.ticket_medio]);
  resumo.addRow(['Alunos pagantes', ind.alunos_pagantes]);
  resumo.addRow(['Em aberto', ind.mensalidades_em_aberto]);
  resumo.addRow(['Vencidas', ind.mensalidades_vencidas]);
  resumo.addRow(['A receber (pendente)', ind.valor_a_receber]);
  resumo.addRow([`Contratante (${ind.percentual_contratante}%)`, ind.valor_contratante]);
  resumo.getColumn(1).width = 30;
  resumo.getColumn(2).width = 22;

  const pagamentos = wb.addWorksheet('Pagamentos');
  pagamentos.addRow(['Data', 'Aluno', 'Plano', 'Forma', 'Valor']);
  pagamentos.getRow(1).font = { bold: true };
  dados.pagamentos.forEach((p) => {
    pagamentos.addRow([formatData(p.data_pagamento), p.aluno, p.plano, (p.forma_pagamento || '').replace(/_/g, ' '), Number(p.valor_pago)]);
  });
  pagamentos.columns.forEach((c) => { c.width = 24; });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financeiro-pagamentos_${dados.periodo.inicio}_a_${dados.periodo.fim}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function RelatorioFinanceiro({ dados }) {
  const { indicadores: ind } = dados;
  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 13, color: '#555' }}>
        {dados.turma ? <div><strong>Turma:</strong> {dados.turma.nome.split('\n')[0]}</div> : null}
        {dados.plano ? <div><strong>Plano:</strong> {dados.plano.nome}</div> : null}
        {!dados.turma && !dados.plano && <div><strong>Todas as turmas e planos</strong></div>}
        <div>{formatData(dados.periodo.inicio)} a {formatData(dados.periodo.fim)}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <IndicadorBox label="Recebido no período" value={formatarMoeda(ind.total_recebido)} color="#2e7d32" />
        <IndicadorBox label="Pagamentos" value={ind.qtd_pagamentos} color="#1565c0" />
        <IndicadorBox label="Ticket médio" value={formatarMoeda(ind.ticket_medio)} color="#1565c0" />
        <IndicadorBox label="Alunos pagantes" value={ind.alunos_pagantes} color="#1565c0" />
        <IndicadorBox label="Em aberto" value={ind.mensalidades_em_aberto} color="#ef6c00" />
        <IndicadorBox label="Vencidas" value={ind.mensalidades_vencidas} color="#c62828" />
        <IndicadorBox label="A receber (pendente)" value={formatarMoeda(ind.valor_a_receber)} color="#c62828" />
        <IndicadorBox label={`Contratante (${ind.percentual_contratante}%)`} value={formatarMoeda(ind.valor_contratante)} color="#6a1b9a" />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={thEstilo}>Data</th>
          <th style={thEstilo}>Aluno</th>
          <th style={thEstilo}>Plano</th>
          <th style={thEstilo}>Forma</th>
          <th style={thEstilo}>Valor</th>
        </tr></thead>
        <tbody>
          {dados.pagamentos.length === 0 && <tr><td colSpan={5} style={tdEstilo}>Nenhum pagamento no período.</td></tr>}
          {dados.pagamentos.map((p) => (
            <tr key={p.id}>
              <td style={{ ...tdEstilo, whiteSpace: 'nowrap' }}>{formatData(p.data_pagamento)}</td>
              <td style={tdEstilo}>{p.aluno}</td>
              <td style={tdEstilo}>{p.plano}</td>
              <td style={tdEstilo}>{(p.forma_pagamento || '').replace(/_/g, ' ')}</td>
              <td style={tdEstilo}>{formatarMoeda(p.valor_pago)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RENDERIZADORES = {
  'alunos-por-graduacao': TabelaAlunosPorGraduacao,
  'alunos-por-turma': TabelaAlunosPorTurma,
  'ficha-cadastral': FichaCadastral,
  'frequencia-turma': FrequenciaTurma,
  'frequencia-aluno': FrequenciaAluno,
  'aniversariantes': Aniversariantes,
  'presenca-minima': PresencaMinima,
  'frequencia-percentual': FrequenciaPercentual,
  'financeiro': RelatorioFinanceiro,
};

// Página standalone (mesmo padrão de ReciboPage.js): sem sidebar, aberta em
// nova aba a partir de Relatorios.js, com botão Imprimir. Reaproveita o
// token do localStorage (mesma origem/aba de navegador).
export default function RelatorioPage({ tipo }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    axios.get(endpointDoRelatorio(tipo, params))
      .then((r) => setDados(r.data))
      .catch((ex) => setErro(ex.response?.data?.erro || 'Não foi possível carregar o relatório.'));
  }, [tipo]);

  const Renderizador = RENDERIZADORES[tipo];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      <style>{`@media print { .acoes-relatorio { display: none; } body { background: #fff; } }`}</style>

      {!Renderizador && <p style={{ color: '#c62828' }}>Tipo de relatório desconhecido.</p>}
      {erro && <p style={{ color: '#c62828' }}>{erro}</p>}
      {!erro && Renderizador && !dados && <p style={{ color: '#888' }}>Carregando...</p>}

      {Renderizador && dados && (
        <>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 32, width: 720, maxWidth: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h2 style={{ marginTop: 0 }}>{TITULOS[tipo]}</h2>
            <Renderizador dados={dados} />
          </div>

          <div className="acoes-relatorio" style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()} style={btnPrimario}>🖨 Imprimir / Salvar PDF</button>
            {tipo === 'financeiro' && (
              <button onClick={() => exportarFinanceiroXLS(dados)} style={{ ...btnPrimario, background: '#2e7d32' }}>📊 Exportar XLS</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
