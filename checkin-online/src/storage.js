// Armazenamento em arquivo, sem banco de dados. `data/roster.json` guarda
// só o estado de "hoje" (sobrescrito a cada sincronização do sistema
// local); `data/checkins-AAAA-MM-DD.txt` guarda os check-ins do dia, um
// evento JSON por linha (append-only). Depois de confirmados pelo sistema
// local, os arquivos de check-in vão pra `data/synced/` em vez de serem
// apagados na hora — fica como rede de segurança caso a sincronização
// falhe no meio; `limparAntigos` remove o que já está ali há muito tempo.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SYNCED_DIR = path.join(DATA_DIR, 'synced');
const ROSTER_PATH = path.join(DATA_DIR, 'roster.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(SYNCED_DIR, { recursive: true });

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function arquivoDoDia(data = hojeISO()) {
  return path.join(DATA_DIR, `checkins-${data}.txt`);
}

function lerRoster() {
  if (!fs.existsSync(ROSTER_PATH)) return null;
  return JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf8'));
}

// `sincronizado_em` é só informativo (exibível pro admin) — o roster agora
// traz a grade da semana inteira (todos os dia_semana), então continua
// válido nos dias seguintes até a próxima sincronização manual.
function salvarRoster(payload) {
  const comData = { ...payload, sincronizado_em: hojeISO() };
  fs.writeFileSync(ROSTER_PATH, JSON.stringify(comData, null, 2));
  return comData;
}

function lerCheckinsDoDia(data = hojeISO()) {
  const arquivo = arquivoDoDia(data);
  if (!fs.existsSync(arquivo)) return [];
  return fs.readFileSync(arquivo, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((linha) => JSON.parse(linha));
}

// `hora_inicio` desempata duas turmas costas-com-costas na mesma sala (ex:
// 19h e 20h) — sem isso, "já fez check-in" (e a lista de pendentes) usava
// só qr_token+aluno_id, e um aluno matriculado nas duas turmas que já tinha
// confirmado presença na primeira sumia da lista da segunda, mesmo sem
// nunca ter escaneado o QR pra ela.
function jaFezCheckin(qr_token, aluno_id, hora_inicio, data = hojeISO()) {
  return lerCheckinsDoDia(data).some(
    (c) => c.qr_token === qr_token && c.aluno_id === aluno_id && c.hora_inicio === hora_inicio
  );
}

function registrarCheckin(qr_token, aluno_id, hora_inicio) {
  const evento = { ts: new Date().toISOString(), qr_token, aluno_id, hora_inicio };
  fs.appendFileSync(arquivoDoDia(), JSON.stringify(evento) + '\n');
  return evento;
}

function listarArquivosPendentes() {
  return fs.readdirSync(DATA_DIR).filter((f) => f.startsWith('checkins-') && f.endsWith('.txt'));
}

function lerTodosPendentes() {
  const arquivos = listarArquivosPendentes();
  const eventos = [];
  for (const nome of arquivos) {
    const conteudo = fs.readFileSync(path.join(DATA_DIR, nome), 'utf8');
    conteudo.split('\n').filter(Boolean).forEach((linha) => eventos.push(JSON.parse(linha)));
  }
  return { arquivos, eventos };
}

function confirmarArquivos(nomes) {
  let movidos = 0;
  for (const nome of nomes) {
    const origem = path.join(DATA_DIR, nome);
    if (fs.existsSync(origem) && nome.startsWith('checkins-') && nome.endsWith('.txt')) {
      fs.renameSync(origem, path.join(SYNCED_DIR, nome));
      movidos++;
    }
  }
  return movidos;
}

function limparAntigos(diasParaManter = 7) {
  const limite = Date.now() - diasParaManter * 24 * 60 * 60 * 1000;
  let removidos = 0;
  for (const nome of fs.readdirSync(SYNCED_DIR)) {
    const caminho = path.join(SYNCED_DIR, nome);
    if (fs.statSync(caminho).mtimeMs < limite) {
      fs.unlinkSync(caminho);
      removidos++;
    }
  }
  return removidos;
}

module.exports = {
  hojeISO,
  lerRoster,
  salvarRoster,
  lerCheckinsDoDia,
  jaFezCheckin,
  registrarCheckin,
  listarArquivosPendentes,
  lerTodosPendentes,
  confirmarArquivos,
  limparAntigos,
};
