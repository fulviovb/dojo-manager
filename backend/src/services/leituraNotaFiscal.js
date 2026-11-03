// Leitura LOCAL de comprovante de gasto (nota fiscal, NFC-e, NFS-e, recibo,
// comprovante de PIX/boleto): acha o VALOR e a DATA DE EMISSÃO. Mesma
// extração de texto da leitura de resultado (pdftotext; OCR com tesseract
// pra foto/PDF escaneado) — nada sai do servidor. É sugestão: a tela
// preenche os campos e o usuário confere. Campo não achado vem null.
//
// Estratégia: rótulos em ordem de prioridade ("Valor total da nota" vale
// mais que "Total", que vale mais que "Valor"). Para cada rótulo, procura o
// valor na mesma linha depois do rótulo; se não houver, nas 2 linhas de
// baixo, na coluna mais próxima (layout de DANFE/boleto: rótulo em cima,
// valor embaixo — pdftotext -layout preserva as colunas).
const { extrairTexto } = require('./leituraComprovante');

const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

// ── Valor ──────────────────────────────────────────────────────────────────

const RE_VALOR = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?![\d%])(?!\s*%)/g;

const ROTULOS_VALOR = [
  /valor\s+(?:total|liquido)\s+da\s+nota/,
  /valor\s+(?:total|liquido)\s+d[oa]s?\s+servicos?/,
  /valor\s+liquido/,
  /valor\s+(?:total\s+)?(?:a\s+)?pag(?:ar|o)/,
  /total\s+(?:geral|pago|a\s+pagar)/,
  /valor\s+(?:da\s+)?(?:transacao|transferencia|do\s+pix|transferido|enviado|recebido)/,
  /\(=\)\s*valor\s+do\s+documento|valor\s+do\s+titulo|valor\s+do\s+documento|valor\s+cobrado/,
  /valor\s+total/,
  /\btotal\s*(?:r\$)?\s*:?/,
  /\bvalor\b/,
];

function valoresNaLinha(linha, aPartirDe = 0) {
  const out = [];
  RE_VALOR.lastIndex = 0;
  let m;
  while ((m = RE_VALOR.exec(linha))) {
    if (m.index < aPartirDe) continue;
    const v = Number(`${m[1].replace(/\./g, '')}.${m[2]}`);
    if (v > 0) out.push({ valor: v, col: m.index });
  }
  return out;
}

// ── Data ───────────────────────────────────────────────────────────────────

const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const RE_DATA = new RegExp([
  '(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{4}|\\d{2})(?!\\d)',                 // 10/08/2026, 10.08.26
  '(\\d{4})-(\\d{2})-(\\d{2})',                                          // 2026-08-10
  '(\\d{1,2})\\s*(?:de\\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\\.?\\s*(?:de\\s+)?(\\d{4})', // 10 de agosto de 2026, 10 AGO 2026
].join('|'), 'gi');

function montarData(d, m, a) {
  let ano = Number(a);
  if (ano < 100) ano += 2000;
  const dia = Number(d); const mes = Number(m);
  if (ano < 2000 || ano > 2099 || mes < 1 || mes > 12 || dia < 1) return null;
  const dt = new Date(Date.UTC(ano, mes - 1, dia));
  if (dt.getUTCMonth() !== mes - 1) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function datasNaLinha(linhaOriginal, aPartirDe = 0) {
  const linha = semAcento(linhaOriginal).toLowerCase();
  const out = [];
  RE_DATA.lastIndex = 0;
  let m;
  while ((m = RE_DATA.exec(linha))) {
    if (m.index < aPartirDe) continue;
    let iso = null;
    if (m[1]) iso = montarData(m[1], m[2], m[3]);
    else if (m[4]) iso = montarData(m[6], m[5], m[4]);
    else if (m[7]) iso = montarData(m[7], MESES[m[8].slice(0, 3)], m[9]);
    if (iso) out.push({ valor: iso, col: m.index });
  }
  return out;
}

const ROTULOS_DATA = [
  /data\s+(?:de|da)\s+emissao/,
  /data\s*\/\s*hora\s+(?:de|da)\s+emissao/,
  /emitid[ao]\s+em/,
  /\bemissao\b/,
  /data\s+(?:do|de|da)\s+(?:pagamento|transacao|transferencia|compra|operacao)|pago\s+em|realizad[ao]\s+em|efetuad[ao]\s+em/,
  /data\s+(?:do|da)\s+(?:documento|competencia)/,
  /\bdata\b/,
];
// Datas que nunca são a emissão do comprovante.
const ROTULOS_EXCLUIR_DATA = /nascimento|vencimento|validade|venc\.|nasc\./;

// ── Busca por rótulo ───────────────────────────────────────────────────────

function buscarPorRotulos(linhas, rotulos, extrair) {
  const norm = linhas.map(l => semAcento(l).toLowerCase());
  for (const rotulo of rotulos) {
    const re = new RegExp(rotulo.source, 'g');
    for (let i = 0; i < linhas.length; i++) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(norm[i]))) {
        const fim = m.index + m[0].length;
        // 1) Mesma linha, logo depois do rótulo (antes do próximo rótulo).
        const mesma = extrair(linhas[i], fim);
        if (mesma.length) return mesma[0].valor;
        // 2) Linhas de baixo, na coluna mais próxima do rótulo.
        for (let j = i + 1; j <= Math.min(i + 2, linhas.length - 1); j++) {
          const abaixo = extrair(linhas[j], 0);
          if (!abaixo.length) continue;
          const perto = abaixo
            .map(a => ({ ...a, dist: Math.abs(a.col - m.index) }))
            .sort((a, b) => a.dist - b.dist)[0];
          if (abaixo.length === 1 || perto.dist <= 25) return perto.valor;
        }
      }
    }
  }
  return null;
}

function interpretarNota(texto) {
  const linhas = texto.split('\n').filter(l => l.trim());

  let valor = buscarPorRotulos(linhas, ROTULOS_VALOR, valoresNaLinha);
  if (valor == null) {
    // Sem rótulo: maior valor precedido de "R$".
    const comCifrao = [...texto.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?!\d)/g)]
      .map(m => Number(`${m[1].replace(/\./g, '')}.${m[2]}`)).filter(v => v > 0);
    if (comCifrao.length) valor = Math.max(...comCifrao);
  }

  let data = buscarPorRotulos(linhas, ROTULOS_DATA, (linha, de) => {
    const antes = semAcento(linha.slice(0, de)).toLowerCase();
    // Rótulo "data" genérico de linha que fala de vencimento/nascimento.
    if (de > 0 && ROTULOS_EXCLUIR_DATA.test(antes.slice(-40))) return [];
    return datasNaLinha(linha, de);
  });
  if (data == null) {
    // Sem rótulo: primeira data do documento que não seja de vencimento,
    // nascimento ou validade.
    for (const l of linhas) {
      if (ROTULOS_EXCLUIR_DATA.test(semAcento(l).toLowerCase())) continue;
      const ds = datasNaLinha(l);
      if (ds.length) { data = ds[0].valor; break; }
    }
  }
  return { valor, data_emissao: data };
}

async function lerNotaFiscal(caminho) {
  const { texto, metodo } = await extrairTexto(caminho);
  return { ...interpretarNota(texto), metodo };
}

module.exports = { lerNotaFiscal, interpretarNota };
