const sequelize = require('../config/database');
const {
  IndicacaoExame, GraduacaoAluno, Faixa, ArteMarcial, Usuario, MatriculaAluno, Turma,
} = require('../models');
const { registrarGraduacao } = require('../services/graduacaoService');
const { dataLocalISO } = require('../utils/data');

const ehDataISO = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

// admin: qualquer aluno da escola. professor: só aluno matriculado (matrícula
// ativa) numa turma daquela arte em que ele é professor_id. aluno: nunca.
const podeGerenciar = async (usuario, aluno_id, arte_marcial_id) => {
  if (usuario.role === 'admin') return true;
  if (usuario.role !== 'professor') return false;
  const m = await MatriculaAluno.findOne({
    where: { aluno_id, ativa: true },
    include: [{
      model: Turma, attributes: [],
      where: { escola_id: usuario.escola_id, arte_marcial_id, professor_id: usuario.id },
    }],
  });
  return !!m;
};

const comFaixas = (id) => IndicacaoExame.findByPk(id, {
  include: [
    { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor', 'ordem'] },
    { model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor', 'ordem'] },
  ],
});

// POST /api/indicacoes-exame { aluno_id, arte_marcial_id, faixa_pretendida_id? }
// Faixa pretendida = a seguinte à graduação atual na ordem da arte (sem
// graduação: a primeira faixa). Idempotente: se já houver indicação ativa
// pra aluno+arte, devolve ela.
const indicar = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { aluno_id, arte_marcial_id } = req.body;
    if (!aluno_id || !arte_marcial_id) return res.status(400).json({ erro: 'aluno_id e arte_marcial_id são obrigatórios' });

    const [aluno, arte] = await Promise.all([
      Usuario.findOne({ where: { id: aluno_id, escola_id, role: 'aluno' }, attributes: ['id'] }),
      ArteMarcial.findOne({ where: { id: arte_marcial_id, escola_id }, attributes: ['id'] }),
    ]);
    if (!aluno || !arte) return res.status(404).json({ erro: 'Aluno ou arte marcial não encontrado' });
    if (!(await podeGerenciar(req.usuario, aluno_id, arte_marcial_id))) return res.status(403).json({ erro: 'Sem permissão para este aluno' });

    const existente = await IndicacaoExame.findOne({ where: { escola_id, aluno_id, arte_marcial_id, status: 'indicado' } });
    if (existente) return res.json(await comFaixas(existente.id));

    const atual = await GraduacaoAluno.findOne({
      where: { escola_id, aluno_id, arte_marcial_id, atual: true },
      include: [{ model: Faixa, attributes: ['id', 'ordem'] }],
    });
    const faixas = await Faixa.findAll({ where: { arte_marcial_id }, order: [['ordem', 'ASC']] });
    const proxima = atual?.Faixa ? faixas.find((f) => f.ordem > atual.Faixa.ordem) : faixas[0];
    if (!proxima) return res.status(400).json({ erro: 'O aluno já está na última faixa desta arte marcial' });

    // Próxima faixa opcional (ex: Cinza, Marrom 3): o exame pode ser pra ela
    // ou pra seguinte não-opcional. Sem `faixa_pretendida_id` escolhido entre
    // as opções, devolve 409 com as opções pra tela perguntar.
    let pretendida = proxima;
    if (proxima.opcional) {
      const pulo = faixas.find((f) => f.ordem > proxima.ordem && !f.opcional);
      const opcoes = [proxima, pulo].filter(Boolean);
      if (opcoes.length > 1) {
        pretendida = opcoes.find((f) => f.id === req.body.faixa_pretendida_id);
        if (!pretendida) {
          return res.status(409).json({
            erro: 'Escolha a faixa pretendida',
            escolher_faixa: true,
            opcoes: opcoes.map((f) => ({ id: f.id, nome: f.nome, cor: f.cor, opcional: f.opcional })),
          });
        }
      }
    }

    const ind = await IndicacaoExame.create({
      escola_id, aluno_id, arte_marcial_id,
      faixa_atual_id: atual?.faixa_id || null,
      faixa_pretendida_id: pretendida.id,
      status: 'indicado',
      data_indicacao: dataLocalISO(),
      indicado_por_id: req.usuario.id,
    });
    res.status(201).json(await comFaixas(ind.id));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// DELETE /api/indicacoes-exame/:id — desfaz a indicação (só se ainda não foi
// aprovada; aprovação vira histórico e só sai removendo a graduação).
const cancelar = async (req, res) => {
  try {
    const ind = await IndicacaoExame.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!ind) return res.status(404).json({ erro: 'Indicação não encontrada' });
    if (ind.status !== 'indicado') return res.status(400).json({ erro: 'Indicação já aprovada não pode ser cancelada' });
    if (!(await podeGerenciar(req.usuario, ind.aluno_id, ind.arte_marcial_id))) return res.status(403).json({ erro: 'Sem permissão para este aluno' });
    await ind.destroy();
    res.json({ mensagem: 'Indicação cancelada' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/indicacoes-exame/:id/aprovar { data?, observacao? }
// Gradua o aluno na faixa pretendida (vira a graduação atual, mesma regra
// do "+ Graduação") e fecha a indicação como aprovada.
const aprovar = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const ind = await IndicacaoExame.findOne({ where: { id: req.params.id, escola_id } });
    if (!ind) return res.status(404).json({ erro: 'Indicação não encontrada' });
    if (ind.status !== 'indicado') return res.status(400).json({ erro: 'Indicação já aprovada' });
    if (!(await podeGerenciar(req.usuario, ind.aluno_id, ind.arte_marcial_id))) return res.status(403).json({ erro: 'Sem permissão para este aluno' });

    const data = req.body.data || dataLocalISO();
    if (!ehDataISO(data)) return res.status(400).json({ erro: 'Data inválida' });
    const observacao = (req.body.observacao || '').trim() || 'Aprovado em exame de faixa';

    await sequelize.transaction(async (transaction) => {
      const grad = await registrarGraduacao({
        escola_id,
        aluno_id: ind.aluno_id,
        arte_marcial_id: ind.arte_marcial_id,
        faixa_id: ind.faixa_pretendida_id,
        data_inicio: data,
        atual: true,
        observacao,
      }, { transaction });
      await ind.update({ status: 'aprovado', data_aprovacao: data, graduacao_id: grad.id }, { transaction });
    });

    res.json(await comFaixas(ind.id));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { indicar, cancelar, aprovar };
