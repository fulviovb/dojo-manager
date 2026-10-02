const { ParticipanteIncentivo } = require('../models');
const { gerarPdfDeTemplate } = require('../services/anexoService');

// Contrato de consultoria (modelo em templates/incentivo-esporte/
// contrato-consultoria.py → .docx). Não é documento do edital: só gera o PDF
// pra download, não toca no checklist. PF/PJ/menor vêm do cadastro do
// participante (não do cliente); o resto vem do formulário.

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];

// 1..99 por extenso ("dez", "vinte e cinco").
function extenso(n) {
  if (n < 20) return UNIDADES[n];
  const d = Math.floor(n / 10); const u = n % 10;
  return u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d];
}

function idade(iso) {
  if (!iso) return null;
  const hoje = new Date(); const n = new Date(iso + 'T00:00:00');
  let i = hoje.getFullYear() - n.getFullYear();
  if (hoje.getMonth() < n.getMonth() || (hoje.getMonth() === n.getMonth() && hoje.getDate() < n.getDate())) i--;
  return i;
}

const CAMPOS_COMUNS = [
  'contratado_nome', 'contratado_nacionalidade', 'contratado_estado_civil', 'contratado_profissao',
  'contratado_rg', 'contratado_cpf', 'contratado_endereco', 'contratado_email', 'contratado_telefone',
  'projeto_nome', 'forma_pagamento', 'indice_correcao', 'comprovante_pagamento',
];
const CAMPOS_PF = ['contratante_nome', 'contratante_rg', 'contratante_cpf', 'contratante_nascimento', 'contratante_endereco'];
const CAMPOS_MENOR = ['responsavel_nome', 'responsavel_rg', 'responsavel_cpf'];
const CAMPOS_PJ = ['pj_razao_social', 'pj_cnpj', 'pj_sede', 'pj_email_institucional', 'pj_cargo_representante', 'pj_representante_nome', 'pj_representante_rg', 'pj_representante_cpf', 'pj_documento_representacao'];
const NUMEROS = { // campo: [mín, máx]
  percentual: [1, 99], prazo_pagamento_dias: [1, 365], prazo_notas_dias: [1, 365], prazo_notificacao_dias: [1, 60],
  aviso_rescisao_dias: [1, 365], multa_percentual: [0, 20], peso_elaboracao: [0, 100], peso_acompanhamento: [0, 100], peso_prestacao: [0, 100],
};

const gerar = async (req, res) => {
  try {
    const participante = await ParticipanteIncentivo.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });

    const c = req.body.campos || {};
    const pj = participante.tipo_pessoa === 'pessoa_juridica';
    const menor = !pj && (idade(participante.data_nascimento) ?? 99) < 18;

    const obrigatorios = [...CAMPOS_COMUNS, ...(pj ? CAMPOS_PJ : CAMPOS_PF), ...(menor ? CAMPOS_MENOR : [])];
    const faltando = obrigatorios.filter(k => !String(c[k] ?? '').trim());
    if (faltando.length) return res.status(400).json({ erro: 'Preencha todos os campos', faltando });

    const numeros = {};
    for (const [k, [min, max]] of Object.entries(NUMEROS)) {
      const v = Number(c[k]);
      if (!Number.isInteger(v) || v < min || v > max) return res.status(400).json({ erro: `Valor inválido em "${k}" (inteiro de ${min} a ${max})`, faltando: [k] });
      numeros[k] = v;
    }
    if (numeros.peso_elaboracao + numeros.peso_acompanhamento + numeros.peso_prestacao !== 100) {
      return res.status(400).json({ erro: 'Os pesos das etapas precisam somar 100%', faltando: ['peso_elaboracao', 'peso_acompanhamento', 'peso_prestacao'] });
    }
    if (!['unico', 'proporcional'].includes(c.pagamento_tipo)) return res.status(400).json({ erro: 'Escolha a forma de pagamento (parcela única ou proporcional)' });
    const data = /^\d{4}-\d{2}-\d{2}$/.test(c.data || '') ? c.data : new Date().toISOString().slice(0, 10);
    const [ano, mes, dia] = data.split('-').map(Number);

    const texto = Object.fromEntries([...obrigatorios].map(k => [k, String(c[k]).trim()]));
    const dados = {
      ...texto,
      pf: !pj, pj, menor,
      pagamento_unico: c.pagamento_tipo === 'unico',
      pagamento_proporcional: c.pagamento_tipo === 'proporcional',
      percentual: `${numeros.percentual}%`,
      percentual_extenso: `${extenso(numeros.percentual)} por cento`,
      prazo_pagamento_dias: String(numeros.prazo_pagamento_dias),
      prazo_notas_dias: String(numeros.prazo_notas_dias),
      prazo_notificacao_dias: String(numeros.prazo_notificacao_dias),
      aviso_rescisao_dias: String(numeros.aviso_rescisao_dias),
      multa_percentual: `${numeros.multa_percentual}%`,
      peso_elaboracao: `${numeros.peso_elaboracao}%`,
      peso_acompanhamento: `${numeros.peso_acompanhamento}%`,
      peso_prestacao: `${numeros.peso_prestacao}%`,
      data_extenso: `${dia} de ${MESES[mes - 1]} de ${ano}`,
    };

    const pdf = await gerarPdfDeTemplate('contrato-consultoria.docx', dados);
    const nome = `Contrato_Consultoria_${participante.nome}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_') + '.pdf';
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${nome}"`, 'Access-Control-Expose-Headers': 'Content-Disposition' });
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao gerar o contrato. Verifique se o LibreOffice está disponível no servidor.' });
  }
};

module.exports = { gerar, extenso };
