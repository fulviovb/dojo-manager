const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { BolsaIncentivo, DespesaBolsaIncentivo, Usuario } = require('../models');
const { dataLocalISO } = require('../utils/data');

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

// Suplementação: só vale gasto do 2º semestre do ano da bolsa.
const periodoSuplementacao = (ano) => ({ inicio: `${ano}-07-01`, fim: `${ano}-12-31` });

function validarDespesa(bolsa, { fonte, data_despesa, valor }) {
  if (!['bolsa', 'suplementacao'].includes(fonte)) return 'Informe a verba (bolsa ou suplementação)';
  if (!data_despesa) return 'Informe a data do gasto';
  if (!(num(valor) > 0)) return 'Informe um valor maior que zero';
  if (fonte === 'suplementacao') {
    if (bolsa.valor_suplementacao == null) return 'Este atleta não recebeu suplementação';
    const { inicio, fim } = periodoSuplementacao(bolsa.ano);
    if (data_despesa < inicio || data_despesa > fim) {
      return `Gasto da suplementação precisa ser do 2º semestre de ${bolsa.ano} (01/07 a 31/12)`;
    }
  }
  return null;
}

// Duas medidas por verba: "lançado" (todo gasto cadastrado) e "comprovado"
// (só gastos com comprovante anexado). Gasto pode ser lançado sem
// comprovante e receber o arquivo depois.
function resumo(bolsa) {
  const despesas = bolsa.Despesas || [];
  const soma = (fonte, soComprovante) => num(despesas
    .filter(d => d.fonte === fonte && (!soComprovante || d.comprovante_url))
    .reduce((s, d) => s + num(d.valor), 0));
  const falta = (valor, feito) => (valor == null ? null : num(Math.max(0, valor - feito)));
  const valorBolsa = num(bolsa.valor_bolsa);
  const valorSup = bolsa.valor_suplementacao == null ? null : num(bolsa.valor_suplementacao);
  const r = { valor_total: num(valorBolsa + (valorSup || 0)) };
  [['bolsa', valorBolsa], ['suplementacao', valorSup]].forEach(([fonte, valor]) => {
    const lancado = soma(fonte, false);
    const comprovado = soma(fonte, true);
    r[`lancado_${fonte}`] = lancado;
    r[`comprovado_${fonte}`] = comprovado;
    r[`falta_lancar_${fonte}`] = falta(valor, lancado);
    r[`falta_comprovar_${fonte}`] = falta(valor, comprovado);
    r[`sem_comprovante_${fonte}`] = num(lancado - comprovado);
  });
  return {
    ...r,
    qtd_despesas: despesas.length,
    qtd_sem_comprovante: despesas.filter(d => !d.comprovante_url).length,
    qtd_nao_prestadas: despesas.filter(d => !d.prestado_contas).length,
  };
}

const buscarBolsa = (id, escola_id) => BolsaIncentivo.findOne({
  where: { id, escola_id },
  include: [
    { model: DespesaBolsaIncentivo, as: 'Despesas' },
    { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
  ],
  order: [[{ model: DespesaBolsaIncentivo, as: 'Despesas' }, 'data_despesa', 'DESC']],
});

const serializar = (b) => ({ ...b.toJSON(), resumo: resumo(b), periodo_suplementacao: periodoSuplementacao(b.ano) });

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
      include: [{ model: DespesaBolsaIncentivo, as: 'Despesas', attributes: ['fonte', 'valor', 'comprovante_url', 'prestado_contas'] }],
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
    const temGastoSup = bolsa.Despesas.some(d => d.fonte === 'suplementacao');
    if (temGastoSup && 'valor_suplementacao' in dados && dados.valor_suplementacao == null) {
      return res.status(400).json({ erro: 'Há gastos lançados na suplementação — remova-os antes' });
    }
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
      const { fonte, categoria, descricao, valor, data_despesa, prestado_contas, observacao } = req.body;
      const erro = validarDespesa(bolsa, { fonte, data_despesa, valor }) || (!categoria && 'Informe a categoria');
      if (erro) { apagarArquivo(req.file && URL_BASE + req.file.filename); return res.status(400).json({ erro }); }

      const despesa = await DespesaBolsaIncentivo.create({
        escola_id: req.usuario.escola_id, bolsa_id: bolsa.id,
        fonte, categoria, descricao: descricao || null, valor: num(valor), data_despesa, observacao: observacao || null,
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

      const campos = ['fonte', 'categoria', 'descricao', 'valor', 'data_despesa', 'observacao'];
      const dados = {};
      campos.forEach(c => { if (req.body[c] !== undefined) dados[c] = req.body[c] === '' ? null : req.body[c]; });
      const final = { fonte: despesa.fonte, data_despesa: despesa.data_despesa, valor: despesa.valor, ...dados };
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

module.exports = {
  listarAnos, listar, buscar, criar, atualizar, remover,
  criarDespesa, atualizarDespesa, removerDespesa,
  _test: { validarDespesa, resumo },
};
