const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { ANEXOS } = require('../constants/incentivoEsporte');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'incentivo-esporte');

const MESES_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Valores default (data de hoje) pra dia/mes_extenso quando o chamador não
// os informa explicitamente — todo anexo tem essa dupla de campos.
function valoresPadrao() {
  const hoje = new Date();
  return { dia: String(hoje.getDate()), mes_extenso: MESES_EXTENSO[hoje.getMonth()] };
}

function preencherDocx(nomeTemplate, dados) {
  const templatePath = path.join(TEMPLATES_DIR, nomeTemplate);
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
  doc.render(dados);
  return doc.getZip().generate({ type: 'nodebuffer' });
}

async function converterParaPdf(docxBuffer) {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'anexo-'));
  const docxPath = path.join(tmpDir, 'documento.docx');
  await fsp.writeFile(docxPath, docxBuffer);
  await new Promise((resolve, reject) => {
    // HOME isolado por chamada: evita duas gerações concorrentes disputarem
    // o mesmo perfil de usuário do LibreOffice (trava conhecida do soffice
    // headless quando dois processos usam o mesmo profile ao mesmo tempo).
    execFile(
      'soffice',
      ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', tmpDir, docxPath],
      { env: { ...process.env, HOME: tmpDir }, timeout: 60000 },
      (err) => (err ? reject(err) : resolve()),
    );
  });
  const pdfPath = path.join(tmpDir, 'documento.pdf');
  const pdfBuffer = await fsp.readFile(pdfPath);
  await fsp.rm(tmpDir, { recursive: true, force: true });
  return pdfBuffer;
}

// Monta os dados do Anexo XI a partir dos atletas vinculados ao técnico
// (ParticipanteIncentivo.tecnico_responsavel_id).
async function montarLinhasAnexoXI(tecnicoId) {
  const { ParticipanteIncentivo } = require('../models');
  const atletas = await ParticipanteIncentivo.findAll({
    where: { tecnico_responsavel_id: tecnicoId, tipo_pessoa: 'atleta' },
    order: [['nome', 'ASC']],
  });
  return atletas.map((a, i) => ({ numero: i + 1, nome: a.nome, documento: a.cpf || a.rg || '' }));
}

// Gera o PDF preenchido de um anexo. `tipoAnexo` é a chave em ANEXOS (ex:
// 'IX'). `campos` são os valores já resolvidos (o controller já aplicou o
// `fonte` de cada campo antes de chamar isso, exceto pra linhas do XI).
async function gerarAnexo(tipoAnexo, campos) {
  const def = ANEXOS[tipoAnexo];
  if (!def) throw new Error(`Anexo desconhecido: ${tipoAnexo}`);

  const dados = { ...valoresPadrao(), ...campos };

  if (tipoAnexo === 'XI') {
    dados.linhas = campos.linhas || [];
  }

  const docxBuffer = preencherDocx(def.template, dados);
  const pdfBuffer = await converterParaPdf(docxBuffer);
  return pdfBuffer;
}

module.exports = { gerarAnexo, montarLinhasAnexoXI };
