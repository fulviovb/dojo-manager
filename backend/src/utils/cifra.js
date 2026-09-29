const crypto = require('crypto');

// Cifra reversível (AES-256-GCM) para segredos de TERCEIROS que o sistema
// precisa devolver em texto claro — ex: login/senha do participante no
// Sistema Incentivo online da prefeitura. Senha de usuário DESTE sistema
// continua em bcrypt (hash, irreversível); aqui não dá, porque o admin
// precisa ler a senha para entrar no sistema da prefeitura.
//
// Chave: CREDENCIAIS_KEY no backend/.env (64 caracteres hex = 32 bytes).
// Gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Perder a chave = perder todas as senhas cifradas (não há recuperação) —
// guardar cópia fora do servidor.
//
// `contexto` (ex: id do participante) entra como AAD: o texto cifrado de um
// registro não decifra se for copiado para outro registro.
const VERSAO = 'v1';

function obterChave() {
  const hex = process.env.CREDENCIAIS_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('CREDENCIAIS_KEY ausente ou inválida no .env (esperado 64 caracteres hex)');
  }
  return Buffer.from(hex, 'hex');
}

function cifrar(textoClaro, contexto) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', obterChave(), iv);
  cipher.setAAD(Buffer.from(String(contexto)));
  const cifrado = Buffer.concat([cipher.update(String(textoClaro), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSAO, iv.toString('base64'), tag.toString('base64'), cifrado.toString('base64')].join(':');
}

function decifrar(valor, contexto) {
  const [versao, ivB64, tagB64, dadosB64] = String(valor).split(':');
  if (versao !== VERSAO) throw new Error(`Formato de cifra desconhecido: ${versao}`);
  const decipher = crypto.createDecipheriv('aes-256-gcm', obterChave(), Buffer.from(ivB64, 'base64'));
  decipher.setAAD(Buffer.from(String(contexto)));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dadosB64, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { cifrar, decifrar, obterChave };
