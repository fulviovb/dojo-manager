const sequelize = require('../config/database');
const { IndicacaoExame, Faixa, ArteMarcial, Usuario, ExameParticipante } = require('../models');
const { registrarGraduacao } = require('../services/graduacaoService');
const {
  ErroRegra, responderErro, podeGerenciar, obterOuCriarIndicacao, candidatoEmExameAberto,
} = require('../services/indicacaoExameService');
const { dataLocalISO } = require('../utils/data');

const ehDataISO = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

const comFaixas = (id) => IndicacaoExame.findByPk(id, {
  include: [
    { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor', 'ordem'] },
    { model: Faixa, as: 'FaixaPretendida', attributes: ['id', 'nome', 'cor', 'ordem'] },
  ],
});

// POST /api/indicacoes-exame { aluno_id, arte_marcial_id, faixa_pretendida_id? }
// Regra da faixa pretendida em services/indicacaoExameService.js. Idempotente:
// se já houver indicação ativa pra aluno+arte, devolve ela.
const indicar = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { aluno_id, arte_marcial_id, faixa_pretendida_id } = req.body;
    if (!aluno_id || !arte_marcial_id) return res.status(400).json({ erro: 'aluno_id e arte_marcial_id são obrigatórios' });

    const [aluno, arte] = await Promise.all([
      Usuario.findOne({ where: { id: aluno_id, escola_id, role: 'aluno' }, attributes: ['id'] }),
      ArteMarcial.findOne({ where: { id: arte_marcial_id, escola_id }, attributes: ['id'] }),
    ]);
    if (!aluno || !arte) return res.status(404).json({ erro: 'Aluno ou arte marcial não encontrado' });
    if (!(await podeGerenciar(req.usuario, aluno_id, arte_marcial_id))) return res.status(403).json({ erro: 'Sem permissão para este aluno' });

    const { indicacao, criada } = await sequelize.transaction((transaction) => obterOuCriarIndicacao({
      escola_id, aluno_id, arte_marcial_id, faixa_pretendida_id, indicado_por_id: req.usuario.id,
    }, { transaction }));
    res.status(criada ? 201 : 200).json(await comFaixas(indicacao.id));
  } catch (e) { responderErro(res, e); }
};

// Busca travada + permissão + RN-16 (bloqueada enquanto em exame aberto)
const carregarLivre = async (req, transaction, acao) => {
  const ind = await IndicacaoExame.findOne({
    where: { id: req.params.id, escola_id: req.usuario.escola_id }, transaction, lock: transaction.LOCK.UPDATE,
  });
  if (!ind) throw new ErroRegra(404, 'Indicação não encontrada');
  if (ind.status !== 'indicado') throw new ErroRegra(400, 'Indicação já aprovada');
  if (!(await podeGerenciar(req.usuario, ind.aluno_id, ind.arte_marcial_id))) throw new ErroRegra(403, 'Sem permissão para este aluno');
  const cand = await candidatoEmExameAberto(ind.id, { transaction });
  if (cand) throw new ErroRegra(409, `O aluno é candidato do exame "${cand.Exame.nome}". ${acao}`);
  return ind;
};

// DELETE /api/indicacoes-exame/:id — desfaz a indicação (só se ainda não foi
// aprovada; aprovação vira histórico e só sai removendo a graduação).
const cancelar = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const ind = await carregarLivre(req, transaction, 'Registre a desistência pelo exame antes de cancelar a indicação.');
      await ExameParticipante.update({ indicacao_exame_id: null }, { where: { indicacao_exame_id: ind.id }, transaction });
      await ind.destroy({ transaction });
    });
    res.json({ mensagem: 'Indicação cancelada' });
  } catch (e) { responderErro(res, e); }
};

// POST /api/indicacoes-exame/:id/aprovar { data?, observacao? }
// Gradua o aluno na faixa pretendida (vira a graduação atual, mesma regra
// do "+ Graduação") e fecha a indicação como aprovada. Só pra indicação fora
// de exame aberto — dentro dele, o caminho é POST /exames/:id/resultado.
const aprovar = async (req, res) => {
  try {
    const data = req.body.data || dataLocalISO();
    if (!ehDataISO(data)) return res.status(400).json({ erro: 'Data inválida' });
    const observacao = (req.body.observacao || '').trim() || 'Aprovado em exame de faixa';

    await sequelize.transaction(async (transaction) => {
      const ind = await carregarLivre(req, transaction, 'Registre o resultado pelo exame.');
      const grad = await registrarGraduacao({
        escola_id: req.usuario.escola_id,
        aluno_id: ind.aluno_id,
        arte_marcial_id: ind.arte_marcial_id,
        faixa_id: ind.faixa_pretendida_id,
        data_inicio: data,
        atual: true,
        observacao,
      }, { transaction });
      await ind.update({ status: 'aprovado', data_aprovacao: data, graduacao_id: grad.id }, { transaction });
    });

    res.json(await comFaixas(req.params.id));
  } catch (e) { responderErro(res, e); }
};

module.exports = { indicar, cancelar, aprovar };
