const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { BolsaIncentivo, DespesaBolsaIncentivo, Usuario, Escola, ParticipanteIncentivo } = require('../models');
const { Op } = require('sequelize');
const { CATEGORIAS_DESPESA } = require('../constants/incentivoEsporte');
const { dataLocalISO } = require('../utils/data');
const { lerNotaFiscal } = require('../services/leituraNotaFiscal');
const { montarRelatorioTecnico } = require('../utils/relatorioTecnico');
const os = require('os');

// Acompanhamento das bolsas já recebidas: valores, gastos comprovados por
// verba (bolsa × suplementação) e situação da prestação de contas.

const PASTA = path.join(__dirname, '..', '..', 'uploads', 'incentivo-esporte', 'comprovantes-bolsa');
fs.mkdirSync(PASTA, { recursive: true });
const URL_BASE = '/uploads/incentivo-esporte/comprovantes-bolsa/';

const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PASTA),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
      return cb(new Error('Formato não suportado (use JPEG, PNG, WEBP ou PDF)'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('comprovante');

const apagarArquivo = (url) => {
  if (url?.startsWith(URL_BASE)) fs.unlink(path.join(__dirname, '..', '..', url), () => {});
};

const num = (v) => Math.round(parseFloat(v || 0) * 100) / 100;
const bool = (v) => v === true || v === 'true';

// Regra de prestação de contas: todo gasto tem que ser do ANO da bolsa.
// A suplementação só pode ser coberta por gasto do 2º SEMESTRE; a bolsa, por
// gasto de qualquer data do ano. Não há escolha manual de verba: os gastos
// do 2º semestre cobrem primeiro a suplementação, e o que sobrar deles + os
// gastos do 1º semestre cobrem a bolsa (alocação que maximiza a cobertura).
const periodoSuplementacao = (ano) => ({ inicio: `${ano}-07-01`, fim: `${ano}-12-31` });
const periodoAno = (ano) => ({ inicio: `${ano}-01-01`, fim: `${ano}-12-31` });
const ehSegundoSemestre = (data, ano) => data >= `${ano}-07-01` && data <= `${ano}-12-31`;

function validarDespesa(bolsa, { data_despesa, valor }) {
  if (!data_despesa) return 'Informe a data do gasto';
  if (!(num(valor) > 0)) return 'Informe um valor maior que zero';
  const { inicio, fim } = periodoAno(bolsa.ano);
  if (data_despesa < inicio || data_despesa > fim) return `O gasto precisa ser de ${bolsa.ano} (bolsa ${bolsa.ano})`;
  return null;
}

// Cobertura das duas verbas por um conjunto de gastos.
function cobertura(bolsa, gastos) {
  const valorBolsa = num(bolsa.valor_bolsa);
  const valorSup = bolsa.valor_suplementacao == null ? 0 : num(bolsa.valor_suplementacao);
  const total = num(gastos.reduce((s, d) => s + num(d.valor), 0));
  const segundoSem = num(gastos.filter(d => ehSegundoSemestre(d.data_despesa, bolsa.ano)).reduce((s, d) => s + num(d.valor), 0));
  const sup = num(Math.min(valorSup, segundoSem));
  const bol = num(Math.min(valorBolsa, total - sup));
  return { total, segundoSem, sup, bol, excedente: num(Math.max(0, total - sup - bol)) };
}

// Duas medidas: "lançado" (todo gasto cadastrado) e "comprovado" (só gasto
// com comprovante). Gasto pode ser lançado sem comprovante e receber o
// arquivo depois.
function resumo(bolsa) {
  const despesas = bolsa.Despesas || [];
  const valorBolsa = num(bolsa.valor_bolsa);
  const valorSup = bolsa.valor_suplementacao == null ? null : num(bolsa.valor_suplementacao);
  const lanc = cobertura(bolsa, despesas);
  const comp = cobertura(bolsa, despesas.filter(d => d.comprovante_url));
  return {
    valor_total: num(valorBolsa + (valorSup || 0)),
    total_lancado: lanc.total,
    total_comprovado: comp.total,
    lancado_segundo_semestre: lanc.segundoSem,
    // Quanto de cada verba está coberto (lançado / comprovado).
    lancado_bolsa: lanc.bol,
    comprovado_bolsa: comp.bol,
    falta_lancar_bolsa: num(valorBolsa - lanc.bol),
    falta_comprovar_bolsa: num(valorBolsa - comp.bol),
    lancado_suplementacao: valorSup == null ? 0 : lanc.sup,
    comprovado_suplementacao: valorSup == null ? 0 : comp.sup,
    falta_lancar_suplementacao: valorSup == null ? null : num(valorSup - lanc.sup),
    falta_comprovar_suplementacao: valorSup == null ? null : num(valorSup - comp.sup),
    excedente: lanc.excedente,
    sem_comprovante: num(lanc.total - comp.total),
    qtd_despesas: despesas.length,
    qtd_sem_comprovante: despesas.filter(d => !d.comprovante_url).length,
    qtd_nao_prestadas: despesas.filter(d => !d.prestado_contas).length,
  };
}

// Para cada gasto, quanto dele vai pra suplementação, bolsa ou excedente —
// orientação de onde declarar cada nota na prestação. 2º semestre enche a
// suplementação primeiro (os com comprovante antes, depois por data); o
// restante enche a bolsa por data.
function alocarGastos(bolsa, despesas) {
  let restaSup = bolsa.valor_suplementacao == null ? 0 : num(bolsa.valor_suplementacao);
  let restaBolsa = num(bolsa.valor_bolsa);
  const aloc = new Map(despesas.map(d => [d.id, { suplementacao: 0, bolsa: 0, excedente: 0 }]));
  const porData = (a, b) => (a.data_despesa < b.data_despesa ? -1 : a.data_despesa > b.data_despesa ? 1 : 0);
  const segundo = despesas.filter(d => ehSegundoSemestre(d.data_despesa, bolsa.ano))
    .sort((a, b) => (!!b.comprovante_url - !!a.comprovante_url) || porData(a, b));
  const sobra = new Map(despesas.map(d => [d.id, num(d.valor)]));
  for (const d of segundo) {
    const v = num(Math.min(restaSup, sobra.get(d.id)));
    aloc.get(d.id).suplementacao = v; restaSup = num(restaSup - v); sobra.set(d.id, num(sobra.get(d.id) - v));
  }
  for (const d of [...despesas].sort(porData)) {
    const v = num(Math.min(restaBolsa, sobra.get(d.id)));
    aloc.get(d.id).bolsa = v; restaBolsa = num(restaBolsa - v);
    aloc.get(d.id).excedente = num(sobra.get(d.id) - v);
  }
  return aloc;
}

const buscarBolsa = (id, escola_id) => BolsaIncentivo.findOne({
  where: { id, escola_id },
  include: [
    { model: DespesaBolsaIncentivo, as: 'Despesas' },
    { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
  ],
  order: [[{ model: DespesaBolsaIncentivo, as: 'Despesas' }, 'data_despesa', 'DESC']],
});

const serializar = (b) => {
  const json = b.toJSON();
  const aloc = alocarGastos(b, b.Despesas || []);
  json.Despesas = (json.Despesas || []).map(d => ({ ...d, alocacao: aloc.get(d.id) }));
  return { ...json, resumo: resumo(b), periodo_suplementacao: periodoSuplementacao(b.ano), periodo_ano: periodoAno(b.ano) };
};

// ── Relatório de prestação de contas ──────────────────────────────────────
// Um atleta (bolsa_id) ou todos do ano (opcionalmente filtrados por nome).
// Devolve cada bolsa já serializada (gastos com alocação por verba + resumo)
// e o nº de protocolo / CPF da inscrição do atleta no Incentivo, quando houver.
const relatorio = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const where = { escola_id };
    if (req.query.bolsa_id) where.id = req.query.bolsa_id;
    else if (req.query.ano) where.ano = parseInt(req.query.ano, 10);
    else return res.status(400).json({ erro: 'Informe o ano ou a bolsa' });
    const bolsas = await BolsaIncentivo.findAll({
      where,
      include: [{ model: DespesaBolsaIncentivo, as: 'Despesas' }],
      order: [['nome', 'ASC'], [{ model: DespesaBolsaIncentivo, as: 'Despesas' }, 'data_despesa', 'ASC']],
    });
    if (!bolsas.length) return res.status(404).json({ erro: 'Nenhuma bolsa encontrada' });

    const filtro = String(req.query.atleta || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const selecionadas = filtro ? bolsas.filter(b => norm(b.nome).includes(filtro)) : bolsas;

    // Inscrição do atleta no Incentivo (protocolo, CPF): por aluno_id, senão por nome.
    const participantes = await ParticipanteIncentivo.findAll({
      where: {
        escola_id, tipo_pessoa: 'atleta',
        [Op.or]: [
          { aluno_id: selecionadas.map(b => b.aluno_id).filter(Boolean) },
          { nome: selecionadas.map(b => b.nome) },
        ],
      },
      attributes: ['nome', 'aluno_id', 'cpf', 'numero_protocolo'],
    });
    const inscricao = (b) => participantes.find(p => b.aluno_id && p.aluno_id === b.aluno_id)
      || participantes.find(p => norm(p.nome) === norm(b.nome)) || null;

    const escola = await Escola.findByPk(escola_id, { attributes: ['nome', 'logo_url'] });
    res.json({
      escola: escola ? { nome: escola.nome, logo_url: escola.logo_url } : null,
      gerado_em: new Date().toISOString(),
      hoje: dataLocalISO(),
      categorias: CATEGORIAS_DESPESA,
      bolsas: selecionadas.map(b => {
        const insc = inscricao(b);
        return { ...serializar(b), inscricao: insc ? { cpf: insc.cpf, numero_protocolo: insc.numero_protocolo } : null };
      }),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// ── Bolsas ──────────────────────────────────────────────────────────────────

const listarAnos = async (req, res) => {
  try {
    const linhas = await BolsaIncentivo.findAll({
      where: { escola_id: req.usuario.escola_id }, attributes: ['ano'], group: ['ano'], order: [['ano', 'DESC']],
    });
    res.json(linhas.map(l => l.ano));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const listar = async (req, res) => {
  try {
    const where = { escola_id: req.usuario.escola_id };
    if (req.query.ano) where.ano = parseInt(req.query.ano, 10);
    const bolsas = await BolsaIncentivo.findAll({
      where,
      include: [{ model: DespesaBolsaIncentivo, as: 'Despesas', attributes: ['valor', 'data_despesa', 'comprovante_url', 'prestado_contas'] }],
      order: [['ano', 'DESC'], ['nome', 'ASC']],
    });
    res.json(bolsas.map(b => {
      const { Despesas, ...resto } = b.toJSON();
      return { ...resto, resumo: resumo(b), periodo_suplementacao: periodoSuplementacao(b.ano) };
    }));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const bolsa = await buscarBolsa(req.params.id, req.usuario.escola_id);
    if (!bolsa) return res.status(404).json({ erro: 'Bolsa não encontrada' });
    res.json(serializar(bolsa));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const CAMPOS_BOLSA = ['nome', 'ano', 'aluno_id', 'valor_bolsa', 'data_recebimento_bolsa', 'valor_suplementacao',
  'data_recebimento_suplementacao', 'situacao_prestacao', 'observacao'];
const limparBolsa = (body) => {
  const dados = {};
  CAMPOS_BOLSA.forEach(c => { if (body[c] !== undefined) dados[c] = body[c] === '' ? null : body[c]; });
  return dados;
};

const criar = async (req, res) => {
  try {
    const dados = limparBolsa(req.body);
    if (!dados.nome || !dados.ano || !(num(dados.valor_bolsa) > 0)) {
      return res.status(400).json({ erro: 'Informe nome, ano e valor da bolsa' });
    }
    if (dados.aluno_id) {
      const aluno = await Usuario.findOne({ where: { id: dados.aluno_id, escola_id: req.usuario.escola_id } });
      if (!aluno) return res.status(400).json({ erro: 'Aluno não encontrado' });
    }
    const bolsa = await BolsaIncentivo.create({ ...dados, escola_id: req.usuario.escola_id });
    res.status(201).json(bolsa);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ erro: 'Já existe bolsa com esse nome nesse ano' });
    console.error(e); res.status(500).json({ erro: 'Erro interno' });
  }
};

const atualizar = async (req, res) => {
  try {
    const bolsa = await buscarBolsa(req.params.id, req.usuario.escola_id);
    if (!bolsa) return res.status(404).json({ erro: 'Bolsa não encontrada' });
    const dados = limparBolsa(req.body);
    if (dados.aluno_id) {
      const aluno = await Usuario.findOne({ where: { id: dados.aluno_id, escola_id: req.usuario.escola_id } });
      if (!aluno) return res.status(400).json({ erro: 'Aluno não encontrado' });
    }
    // Tirar a suplementação ou mudar o ano invalidaria gastos já lançados.
    if (bolsa.Despesas.length && dados.ano !== undefined && parseInt(dados.ano, 10) !== bolsa.ano) {
      return res.status(400).json({ erro: 'Há gastos lançados — não dá pra mudar o ano' });
    }
    await bolsa.update(dados);
    res.json(serializar(await buscarBolsa(bolsa.id, req.usuario.escola_id)));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const remover = async (req, res) => {
  try {
    const bolsa = await buscarBolsa(req.params.id, req.usuario.escola_id);
    if (!bolsa) return res.status(404).json({ erro: 'Bolsa não encontrada' });
    if (bolsa.Despesas.length) return res.status(400).json({ erro: 'Há gastos lançados nesta bolsa — remova-os antes' });
    await bolsa.destroy();
    res.json({ mensagem: 'Bolsa removida' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// ── Leitura do comprovante (sugere valor e data de emissão) ───────────────
// Arquivo vai pra pasta temporária, é lido localmente e apagado — o
// comprovante "de verdade" é enviado depois, junto com o gasto.
const uploadLeitura = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => cb(null, `leitura-${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
      return cb(new Error('Formato não suportado (use JPEG, PNG, WEBP ou PDF)'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('comprovante');

const lerComprovante = (req, res) => {
  uploadLeitura(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload' });
    if (!req.file) return res.status(400).json({ erro: 'Envie o arquivo do comprovante' });
    try {
      res.json(await lerNotaFiscal(req.file.path));
    } catch (e) {
      console.error(e);
      res.status(422).json({ erro: 'Não foi possível ler o comprovante — preencha manualmente' });
    } finally { fs.unlink(req.file.path, () => {}); }
  });
};

// ── Gastos da bolsa ─────────────────────────────────────────────────────────

const buscarDespesa = (id, escola_id) => DespesaBolsaIncentivo.findOne({
  where: { id, escola_id }, include: [{ model: BolsaIncentivo, where: { escola_id } }],
});

const criarDespesa = (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload' });
    try {
      const bolsa = await BolsaIncentivo.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
      if (!bolsa) { apagarArquivo(req.file && URL_BASE + req.file.filename); return res.status(404).json({ erro: 'Bolsa não encontrada' }); }
      const { categoria, descricao, valor, data_despesa, prestado_contas, observacao } = req.body;
      const erro = validarDespesa(bolsa, { data_despesa, valor }) || (!categoria && 'Informe a categoria');
      if (erro) { apagarArquivo(req.file && URL_BASE + req.file.filename); return res.status(400).json({ erro }); }

      const despesa = await DespesaBolsaIncentivo.create({
        escola_id: req.usuario.escola_id, bolsa_id: bolsa.id,
        categoria, descricao: descricao || null, valor: num(valor), data_despesa, observacao: observacao || null,
        comprovante_url: req.file ? URL_BASE + req.file.filename : null,
        prestado_contas: bool(prestado_contas),
        data_prestado_contas: bool(prestado_contas) ? dataLocalISO() : null,
      });
      res.status(201).json(despesa);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
};

const atualizarDespesa = (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || 'Erro no upload' });
    const novoArquivo = req.file ? URL_BASE + req.file.filename : null;
    try {
      const despesa = await buscarDespesa(req.params.despesaId, req.usuario.escola_id);
      if (!despesa) { apagarArquivo(novoArquivo); return res.status(404).json({ erro: 'Gasto não encontrado' }); }

      const campos = ['categoria', 'descricao', 'valor', 'data_despesa', 'observacao'];
      const dados = {};
      campos.forEach(c => { if (req.body[c] !== undefined) dados[c] = req.body[c] === '' ? null : req.body[c]; });
      const final = { data_despesa: despesa.data_despesa, valor: despesa.valor, ...dados };
      const erro = validarDespesa(despesa.BolsaIncentivo, final) || (dados.categoria === null && 'Informe a categoria');
      if (erro) { apagarArquivo(novoArquivo); return res.status(400).json({ erro }); }

      if (req.body.prestado_contas !== undefined) {
        const prestado = bool(req.body.prestado_contas);
        dados.prestado_contas = prestado;
        dados.data_prestado_contas = prestado ? (despesa.prestado_contas ? despesa.data_prestado_contas : dataLocalISO()) : null;
      }
      const anterior = despesa.comprovante_url;
      if (novoArquivo) dados.comprovante_url = novoArquivo;
      await despesa.update(dados);
      if (novoArquivo) apagarArquivo(anterior);
      res.json(despesa);
    } catch (e) { apagarArquivo(novoArquivo); console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });
};

const removerDespesa = async (req, res) => {
  try {
    const despesa = await buscarDespesa(req.params.despesaId, req.usuario.escola_id);
    if (!despesa) return res.status(404).json({ erro: 'Gasto não encontrado' });
    const arquivo = despesa.comprovante_url;
    await despesa.destroy();
    apagarArquivo(arquivo);
    res.json({ mensagem: 'Gasto removido' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// Textos da prestação de contas final (Relatório técnico + resultados por
// competição), gerados das conquistas do ano, horários e gastos da bolsa.
const relatorioTecnico = async (req, res) => {
  try {
    const bolsa = await BolsaIncentivo.findOne({
      where: { id: req.params.id, escola_id: req.usuario.escola_id },
      include: [{ model: DespesaBolsaIncentivo, as: 'Despesas', attributes: ['categoria'] }],
    });
    if (!bolsa) return res.status(404).json({ erro: 'Bolsa não encontrada' });
    res.json(await montarRelatorioTecnico(bolsa));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = {
  listarAnos, listar, buscar, relatorio, relatorioTecnico, criar, atualizar, remover,
  criarDespesa, atualizarDespesa, removerDespesa, lerComprovante,
  _test: { validarDespesa, resumo, alocarGastos },
};
