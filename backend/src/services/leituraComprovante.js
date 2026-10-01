// Leitura LOCAL de comprovante de resultado (nada sai do servidor): extrai o
// texto (pdftotext; OCR com tesseract pra foto ou PDF escaneado) e procura
// por regras os campos do protocolo — evento, colocação, ano, competição,
// entidade. É sugestão: a tela mostra o que achou e o usuário confere e
// salva. Declarações de federação variam muito, então campo não achado
// vem vazio em vez de chute.
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const executar = (cmd, args, opcoes = {}) => new Promise((resolve, reject) => {
  execFile(cmd, args, { timeout: 90000, maxBuffer: 20 * 1024 * 1024, ...opcoes }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
});

async function ocrImagem(caminho) {
  return executar('tesseract', [caminho, 'stdout', '-l', 'por']);
}

// PDF com texto → pdftotext. Sem texto (escaneado) → páginas viram PNG e OCR.
async function extrairTexto(caminho) {
  const ext = path.extname(caminho).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return { texto: await ocrImagem(caminho), metodo: 'ocr' };
  if (ext !== '.pdf') throw new Error(`Formato não suportado: ${ext}`);
  const texto = await executar('pdftotext', ['-layout', caminho, '-']);
  if (texto.replace(/\s/g, '').length >= 40) return { texto, metodo: 'texto' };
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'ocr-'));
  try {
    await executar('pdftoppm', ['-r', '200', '-png', '-l', '3', caminho, path.join(tmp, 'p')]);
    const paginas = (await fsp.readdir(tmp)).filter(f => f.endsWith('.png')).sort();
    let ocr = '';
    for (const p of paginas) ocr += `${await ocrImagem(path.join(tmp, p))}\n`;
    return { texto: ocr, metodo: 'ocr' };
  } finally { await fsp.rm(tmp, { recursive: true, force: true }); }
}

const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const limpar = (s) => String(s).replace(/\s+/g, ' ').trim();
const capitalizar = (s) => limpar(s).toLowerCase().replace(/(^|\s|-|\()(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(De|Da|Do|Das|Dos|E|Em|No|Na)\b/g, w => w.toLowerCase()).replace(/^\p{L}/u, c => c.toUpperCase());

// Entidades que costumam aparecer só pela sigla (título, assinatura).
// Acrescente aqui quando aparecer uma nova.
const SIGLAS = {
  CKTB: 'Confederação de Karatê-Do Tradicional Brasileira',
  FTPK: 'Federação Tradicional Paranaense de Karatê',
  FPK: 'Federação Paranaense de Karatê',
  FPRK: 'Federação Paranaense de Karatê',
  CBK: 'Confederação Brasileira de Karatê',
  ITKF: 'International Traditional Karate Federation',
  WKF: 'World Karate Federation',
  CBDA: 'Confederação Brasileira de Desportos Aquáticos',
  FAP: 'Federação Aquática Paranaense',
};

// Linhas do PDF unidas em parágrafos: linha que continua a frase (começa
// a frase) é juntada; senão vira "¶" — separa colocações em linhas
// próprias e corta antes da assinatura.
function juntarLinhas(texto) {
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  return linhas.reduce((acc, l, i) => {
    if (i === 0) return l;
    const ant = linhas[i - 1];
    // Nova linha separada: anterior fecha frase, nova começa item (•, -,
    // número) ou a anterior já era uma colocação ("3º LUGAR KATA").
    const separa = !/^[a-zà-ú]/.test(l)
      && (/[.:;!]$/.test(ant) || /^[•\-–\d]/.test(l) || /\d\s*[ºo°ª*]?\s*lugar/i.test(ant));
    return `${acc}${separa ? ' ¶ ' : ' '}${l}`;
  }, '').replace(/[ \t]+/g, ' ');
}

function acharEntidade(linhas, texto) {
  // Cabeçalho/frase com nome de entidade, cortado antes de sigla/verbo.
  const padrao = /(CONFEDERA[CÇ][AÃ]O|FEDERA[CÇ][AÃ]O|ASSOCIA[CÇ][AÃ]O|LIGA |COMIT[EÊ]|SECRETARIA|FUNDA[CÇ][AÃ]O|FEDERATION|CONFEDERATION)[^,;.\n]*/i;
  for (const l of linhas.slice(0, 15)) {
    if (/declaramos|declaro|filiad/i.test(l)) continue;
    const m = padrao.exec(l);
    if (m) return capitalizar(m[0].replace(/\s+[–-]\s+[A-Z]{3,6}\b.*$/, '').replace(/\s+tem a honra.*$/i, '').replace(/CNPJ.*$/i, ''));
  }
  for (const [sigla, nome] of Object.entries(SIGLAS)) {
    if (new RegExp(`\\b${sigla}\\b`, sigla.length >= 4 ? 'i' : '').test(texto)) return nome;
  }
  return '';
}

function acharCompeticao(t) {
  const fim = '(?=\\s+(?:que\\s|realizad|ocorrid|na cidade|em\\s+[A-Z]|no ano|nos dias|no dia|a realizar|,|obtendo|ficando|conquistando|¶))';
  // Convocação: "...Seleção Brasileira que irá disputar o/a X na cidade..."
  const conv = new RegExp(`disputar\\s+(?:[oa]s?\\s+)?(.{4,140}?)${fim}`, 'i').exec(t);
  if (conv && /convoca/i.test(t)) return capitalizar(conv[1].replace(/¶/g, ''));
  // "participou do X" / "obteve as seguintes colocações no X"
  const m = new RegExp(`(?:participou|coloca[cç][oõ]es|da competi[cç][aã]o)\\s+(?:d[oa]s?|n[oa]s?)?\\s*(.{6,140}?)${fim}`, 'i').exec(t);
  if (m) return capitalizar(m[1].replace(/\s*¶\s*/g, ' '));
  const n = /((?:campeonato|copa|torneio|jogos|open|grand prix|world cup|children for peace|festival|circuito|sul-?americano|pan-?americano|mundial|brasileiro|paranaense)[^,.;¶]{3,110})/i.exec(t);
  return n ? capitalizar(n[1].replace(/\s+(?:na cidade|nos dias|no dia|realizad).*$/i, '')) : '';
}

function acharAno(t, competicao) {
  const anos = (s) => [...String(s).matchAll(/\b(20\d{2})\b/g)].map(m => Number(m[1]));
  const doTitulo = anos(competicao);
  if (doTitulo.length) return doTitulo[0];
  // Ano do evento ("nos dias 24 à 28 de junho de 2026", "no ano de 2024")
  // antes da data de emissão do documento.
  const evento = /(?:nos dias|no dia|no ano de|realizad[oa] em|a realizar-se)\s+[^.¶]{0,60}?\b(20\d{2})\b/i.exec(t);
  if (evento) return Number(evento[1]);
  const todos = anos(t);
  return todos.length ? Math.max(...todos) : null;
}

function acharColocacoes(t) {
  const achados = [];
  const corte = '(?=\\s+e\\s+(?:o\\s+)?\\d|\\s+no\\s+corrente|\\s+atenciosamente|\\s+\\d{1,2}\\s*[ºo°ª*]\\s*lugar|[,;.•¶]|$)';
  // "3º lugar no enbu misto", "1° LUGAR KATA INDIVIDUAL", "1º colocado em ..."
  const re = new RegExp(`(\\d{1,2})\\s*[ºo°ª*]?\\s*(?:lugar|coloca[cç][aã]o|colocad[oa])\\s*(?:n[oa]s?|em)?\\s*([^,;.•¶]{2,90}?)${corte}`, 'gi');
  let m;
  while ((m = re.exec(t))) achados.push({ colocacao: Number(m[1]), prova: capitalizar(m[2]) });
  // "Kumite: 1* lugar" (prova antes)
  const re2 = /([A-Za-zÀ-ú][A-Za-zÀ-ú ]{2,40}):\s*(\d{1,2})\s*[ºo°ª*]?\s*lugar/gi;
  while ((m = re2.exec(t))) achados.push({ colocacao: Number(m[2]), prova: capitalizar(m[1]) });
  for (const [palavra, col] of [[/vice-?campe[aã]o/i, 2], [/(?<!vice-?)campe[aã]o/i, 1]]) {
    if (!achados.length && palavra.test(t)) achados.push({ colocacao: col, prova: '' });
  }
  return achados.filter((a, i, l) => a.colocacao >= 1 && a.colocacao <= 99 && l.findIndex(b => b.colocacao === a.colocacao && b.prova === a.prova) === i);
}

// Tipo do evento da COMPETIÇÃO (sem olhar "ranking" — título "Declaração
// de ranking" é comum em declaração de resultado). Ranking é decidido por
// colocação, quando a própria colocação fala em ranking.
const INTERNACIONAL = /internacional|international|intercontinental|mundial|world|pan-?american|sul-?american|south american|copa do mundo|\bcup\b/;
function acharEvento(texto, entidade, competicao) {
  const t = semAcento(texto).toLowerCase().replace(/\branking\b/g, '');
  if (/convoca/.test(t) && /selec/.test(t)) return 'convocacao_selecao';
  // Pelo nome da competição primeiro: o texto inteiro pode trazer palavras
  // de logotipo/rodapé ("World ... Federation") que enganam (OCR lê logo).
  const c = semAcento(competicao).toLowerCase();
  if (INTERNACIONAL.test(c)) return 'internacional';
  if (/brasileir|nacional/.test(c)) return 'nacional';
  if (/paranaense|estadual|copa curitiba|curitibana/.test(c)) return 'estadual';
  if (INTERNACIONAL.test(t)) return 'internacional';
  if (/brasileir|nacional|confederacao/.test(t)) return 'nacional';
  if (/paranaense|estadual|federacao/.test(t) || /^Federação/.test(entidade)) return 'estadual';
  return '';
}

function interpretar(texto) {
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  const t = juntarLinhas(texto);
  const competicao = acharCompeticao(t);
  const entidade = acharEntidade(linhas, texto);
  const eventoBase = acharEvento(texto, entidade, competicao);
  const colocacoes = acharColocacoes(t).map(c => {
    const prova = semAcento(c.prova).toLowerCase();
    const evento = /ranking/.test(prova) ? (INTERNACIONAL.test(prova) ? 'ranking_internacional' : 'ranking_nacional') : eventoBase;
    return { ...c, evento };
  });
  return {
    evento: colocacoes[0]?.evento || eventoBase,
    colocacao: colocacoes[0]?.colocacao ?? '',
    ano: acharAno(t, competicao) ?? '',
    competicao,
    entidade,
    colocacoes, // todas as achadas — a tela deixa escolher quando há mais de uma
  };
}

async function lerComprovante(caminho) {
  if (!fs.existsSync(caminho)) throw new Error('Arquivo não encontrado no servidor');
  const { texto, metodo } = await extrairTexto(caminho);
  return { ...interpretar(texto), metodo, trecho: limpar(texto).slice(0, 600) };
}

module.exports = { lerComprovante, interpretar };
