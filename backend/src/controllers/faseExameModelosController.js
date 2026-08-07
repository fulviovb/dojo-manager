const {
  FaseExameModelo, CriterioExameModelo, CriterioExameModeloFaixa, ArteMarcial,
} = require('../models');

// GET /api/fase-exame-modelos?arte_marcial_id=xxx
// Retorna as fases (com critérios e aplicabilidade por faixa aninhados) —
// é o "roteiro" completo que fica configurado por arte marcial.
const listar = async (req, res) => {
  try {
    const { arte_marcial_id } = req.query;
    const where = { escola_id: req.usuario.escola_id };
    if (arte_marcial_id) where.arte_marcial_id = arte_marcial_id;

    const fases = await FaseExameModelo.findAll({
      where,
      include: [{
        model: CriterioExameModelo,
        include: [{ model: CriterioExameModeloFaixa, attributes: ['faixa_id'] }],
      }],
      order: [
        ['ordem', 'ASC'],
        [CriterioExameModelo, 'ordem', 'ASC'],
      ],
    });

    res.json(fases.map((fase) => ({
      id: fase.id,
      arte_marcial_id: fase.arte_marcial_id,
      nome: fase.nome,
      ordem: fase.ordem,
      criterios: fase.CriterioExameModelos.map((c) => ({
        id: c.id,
        nome: c.nome,
        ordem: c.ordem,
        faixa_ids: c.CriterioExameModeloFaixas.map((f) => f.faixa_id),
      })),
    })));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const criarFase = async (req, res) => {
  try {
    const { arte_marcial_id, nome, ordem } = req.body;
    const arte = await ArteMarcial.findOne({ where: { id: arte_marcial_id, escola_id: req.usuario.escola_id } });
    if (!arte) return res.status(404).json({ erro: 'Arte marcial não encontrada' });

    const fase = await FaseExameModelo.create({
      escola_id: req.usuario.escola_id, arte_marcial_id, nome, ordem: ordem || 0,
    });
    res.status(201).json(fase);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizarFase = async (req, res) => {
  try {
    const fase = await FaseExameModelo.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada' });
    const { nome, ordem } = req.body;
    await fase.update({ nome, ordem });
    res.json(fase);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const removerFase = async (req, res) => {
  try {
    const fase = await FaseExameModelo.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada' });

    const criterios = await CriterioExameModelo.findAll({ where: { fase_modelo_id: fase.id }, attributes: ['id'] });
    await CriterioExameModeloFaixa.destroy({ where: { criterio_modelo_id: criterios.map((c) => c.id) } });
    await CriterioExameModelo.destroy({ where: { fase_modelo_id: fase.id } });
    await fase.destroy();

    res.json({ mensagem: 'Fase removida' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criarCriterio = async (req, res) => {
  try {
    const fase = await FaseExameModelo.findOne({ where: { id: req.params.fase_id, escola_id: req.usuario.escola_id } });
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada' });

    const { nome, ordem, faixa_ids } = req.body;
    const criterio = await CriterioExameModelo.create({ fase_modelo_id: fase.id, nome, ordem: ordem || 0 });

    if (Array.isArray(faixa_ids) && faixa_ids.length > 0) {
      await CriterioExameModeloFaixa.bulkCreate(
        faixa_ids.map((faixa_id) => ({ criterio_modelo_id: criterio.id, faixa_id }))
      );
    }

    res.status(201).json(criterio);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// Garante que o critério pertence a uma fase da escola do usuário logado
const buscarCriterioDaEscola = async (criterioId, escolaId) => {
  const criterio = await CriterioExameModelo.findByPk(criterioId, { include: [FaseExameModelo] });
  if (!criterio || criterio.FaseExameModelo.escola_id !== escolaId) return null;
  return criterio;
};

const atualizarCriterio = async (req, res) => {
  try {
    const criterio = await buscarCriterioDaEscola(req.params.id, req.usuario.escola_id);
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });
    const { nome, ordem } = req.body;
    await criterio.update({ nome, ordem });
    res.json(criterio);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const removerCriterio = async (req, res) => {
  try {
    const criterio = await buscarCriterioDaEscola(req.params.id, req.usuario.escola_id);
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });
    await CriterioExameModeloFaixa.destroy({ where: { criterio_modelo_id: criterio.id } });
    await criterio.destroy();
    res.json({ mensagem: 'Critério removido' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

// PUT /api/fase-exame-modelos/criterios/:id/faixas — substitui o conjunto
// de faixas em que esse critério é aplicável
const definirFaixasAplicaveis = async (req, res) => {
  try {
    const criterio = await buscarCriterioDaEscola(req.params.id, req.usuario.escola_id);
    if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado' });

    const { faixa_ids } = req.body;
    await CriterioExameModeloFaixa.destroy({ where: { criterio_modelo_id: criterio.id } });
    if (Array.isArray(faixa_ids) && faixa_ids.length > 0) {
      await CriterioExameModeloFaixa.bulkCreate(
        faixa_ids.map((faixa_id) => ({ criterio_modelo_id: criterio.id, faixa_id }))
      );
    }

    res.json({ faixa_ids: faixa_ids || [] });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = {
  listar, criarFase, atualizarFase, removerFase,
  criarCriterio, atualizarCriterio, removerCriterio, definirFaixasAplicaveis,
};
