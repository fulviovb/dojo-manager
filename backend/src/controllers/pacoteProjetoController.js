const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { ParticipanteIncentivo, DocumentoIncentivo } = require('../models');

// "Baixar projeto": um .zip com todos os arquivos do checklist do
// participante, numerados na ordem do checklist, + "00 - LEIA-ME.txt" com o
// que está pendente/precisa de atenção — pra protocolar no Sistema Incentivo
// online sem caçar arquivo por arquivo. Credencial (login/senha) nunca entra.

const PASTA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
const TIPO_LABEL = { atleta: 'Atleta', tecnico: 'Técnico', pessoa_juridica: 'Pessoa Jurídica' };

function nomeSeguro(texto, max = 90) {
  return String(texto).normalize('NFC').replace(/[\\/:*?"<>|\n\r\t]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

// Caminho em disco de um arquivo_url — só dentro de uploads/incentivo-esporte.
function caminhoDoArquivo(url) {
  if (!url || !url.startsWith('/uploads/incentivo-esporte/')) return null;
  const caminho = path.resolve(PASTA_UPLOADS, url.replace(/^\/uploads\//, ''));
  return caminho.startsWith(PASTA_UPLOADS + path.sep) ? caminho : null;
}

const baixar = async (req, res) => {
  try {
    const participante = await ParticipanteIncentivo.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });

    const documentos = await DocumentoIncentivo.findAll({
      where: { participante_id: participante.id },
      order: [['ordem', 'ASC'], ['created_at', 'ASC']],
    });

    const hoje = new Date().toISOString().slice(0, 10);
    const zip = new PizZip();
    const pasta = nomeSeguro(participante.nome, 60);
    const incluidos = []; const pendentes = []; const atencao = [];

    // Numeração por item do checklist; instâncias de item múltiplo dividem
    // o número e ganham (1), (2)...
    let numero = 0; let chaveAnterior = null; let instancia = 0;
    const totalPorChave = documentos.reduce((m, d) => m.set(d.tipo_documento, (m.get(d.tipo_documento) || 0) + 1), new Map());

    for (const doc of documentos) {
      if (doc.tipo_documento === 'credencial_sistema_prefeitura') continue;
      if (doc.tipo_documento !== chaveAnterior) { numero++; instancia = 0; chaveAnterior = doc.tipo_documento; }
      instancia++;
      const multiplo = totalPorChave.get(doc.tipo_documento) > 1;
      const rotulo = `${doc.nome_exibicao}${multiplo ? ` (${instancia})` : ''}`;

      if (!doc.arquivo_url) { pendentes.push(rotulo); continue; }
      const caminho = caminhoDoArquivo(doc.arquivo_url);
      if (!caminho || !fs.existsSync(caminho)) { atencao.push(`${rotulo}: arquivo não encontrado no servidor — envie de novo`); continue; }

      const marcas = [];
      if (doc.origem === 'gerado') marcas.push('GERADO - SEM ASSINATURA');
      if (doc.status === 'rejeitado') marcas.push('REJEITADO');
      if (doc.data_validade && doc.data_validade < hoje) marcas.push('VENCIDO');
      const prefixo = marcas.length ? `[${marcas.join(', ')}] ` : '';
      const nomeArquivo = `${String(numero).padStart(2, '0')} - ${prefixo}${nomeSeguro(rotulo)}${path.extname(caminho).toLowerCase()}`;

      zip.file(`${pasta}/${nomeArquivo}`, fs.readFileSync(caminho));
      incluidos.push(nomeArquivo);
      if (marcas.length) atencao.push(`${rotulo}: ${marcas.join(', ').toLowerCase()}`);
    }

    const documento = participante.tipo_pessoa === 'pessoa_juridica'
      ? (participante.cnpj ? `CNPJ ${participante.cnpj}` : 'CNPJ não cadastrado')
      : (participante.cpf ? `CPF ${participante.cpf}` : 'CPF não cadastrado');
    const linhas = [
      `PROJETO — ${participante.nome}`,
      `${TIPO_LABEL[participante.tipo_pessoa] || participante.tipo_pessoa} · ${documento}`,
      `Gerado em ${hoje.split('-').reverse().join('/')} pelo sistema da escola.`,
      '',
      `ARQUIVOS INCLUÍDOS (${incluidos.length})`,
      ...(incluidos.length ? incluidos.map(n => `  ✓ ${n}`) : ['  (nenhum)']),
      '',
      `PENDENTES — sem arquivo no checklist (${pendentes.length})`,
      ...(pendentes.length ? pendentes.map(n => `  ✗ ${n}`) : ['  (nenhum)']),
      '',
      `ATENÇÃO (${atencao.length})`,
      ...(atencao.length ? atencao.map(n => `  ! ${n}`) : ['  (nada)']),
      '',
      'O login e a senha do Sistema Incentivo online não vão neste arquivo (ficam só no sistema).',
    ];
    // BOM UTF-8 pra acentos abrirem certo no Bloco de Notas do Windows.
    zip.file(`${pasta}/00 - LEIA-ME.txt`, '﻿' + linhas.join('\r\n'));

    const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const nomeZip = `Projeto_${participante.nome}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_') + '.zip';
    res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${nomeZip}"`, 'Access-Control-Expose-Headers': 'Content-Disposition' });
    res.send(buffer);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro ao montar o pacote do projeto' }); }
};

module.exports = { baixar, caminhoDoArquivo };
