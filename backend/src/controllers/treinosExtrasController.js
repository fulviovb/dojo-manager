const { Turma, Aula, Chamada, Usuario, ArteMarcial } = require('../models');

// Treino Extra = uma Aula fechada, ligada a uma Turma oculta (tipo
// 'treino_extra', uma por arte marcial) criada sob demanda. Não depende de
// Sala nem de HorarioTurma — só data + modalidade + alunos presentes. A
// contagem de carência de graduação já soma presença por arte marcial (ver
// usuariosController.perfil, dashboardController.presencasDesdeGraduacao e
// relatoriosController.frequenciaPercentual), então essas Chamadas entram
// automaticamente, sem nenhuma mudança nesse cálculo.

async function obterOuCriarTurmaExtra(escola_id, arte_marcial_id, professor_id) {
  let turma = await Turma.findOne({ where: { escola_id, arte_marcial_id, tipo: 'treino_extra' } });
  if (turma) return turma;

  const arte = await ArteMarcial.findByPk(arte_marcial_id);
  return Turma.create({
    escola_id,
    arte_marcial_id,
    professor_id,
    nome: `Treino Extra — ${arte?.nome || 'Modalidade'}`,
    tipo: 'treino_extra',
    ativa: false, // nunca deve contar como "turma ativa" nos indicadores
  });
}

const incluirDetalhes = [
  { model: Turma, attributes: ['id', 'arte_marcial_id'], include: [{ model: ArteMarcial, attributes: ['id', 'nome'] }] },
  { model: Chamada, include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'foto_url'] }] },
];

const formatar = (aula) => {
  const json = aula.toJSON();
  return {
    id: json.id,
    data: json.data,
    arte_marcial: json.Turma.ArteMarcial,
    alunos: (json.Chamadas || []).map((c) => c.Aluno).filter(Boolean),
  };
};

// GET /api/treinos-extras
const listar = async (req, res) => {
  try {
    const aulas = await Aula.findAll({
      include: [
        { model: Turma, attributes: [], where: { escola_id: req.usuario.escola_id, tipo: 'treino_extra' } },
        ...incluirDetalhes,
      ],
      order: [['data', 'DESC']],
    });
    res.json(aulas.map(formatar));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// POST /api/treinos-extras  { arte_marcial_id, data, aluno_ids: [] }
const criar = async (req, res) => {
  try {
    const { arte_marcial_id, data, aluno_ids } = req.body;
    if (!arte_marcial_id || !data) return res.status(400).json({ erro: 'Modalidade e data são obrigatórias' });
    if (!Array.isArray(aluno_ids) || aluno_ids.length === 0) {
      return res.status(400).json({ erro: 'Selecione ao menos um aluno presente' });
    }

    const arte = await ArteMarcial.findOne({ where: { id: arte_marcial_id, escola_id: req.usuario.escola_id } });
    if (!arte) return res.status(404).json({ erro: 'Modalidade não encontrada' });

    const turma = await obterOuCriarTurmaExtra(req.usuario.escola_id, arte_marcial_id, req.usuario.id);

    const aula = await Aula.create({
      turma_id: turma.id,
      data,
      hora_inicio: '00:00:00',
      hora_fim: '23:59:59',
      status: 'fechada',
    });

    for (const aluno_id of aluno_ids) {
      await Chamada.findOrCreate({
        where: { aula_id: aula.id, aluno_id },
        defaults: { origem: 'professor', validado_por: req.usuario.id },
      });
    }

    const completa = await Aula.findByPk(aula.id, { include: incluirDetalhes });
    res.status(201).json(formatar(completa));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// PUT /api/treinos-extras/:id  { data, aluno_ids }
const atualizar = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id, {
      include: [{ model: Turma, where: { escola_id: req.usuario.escola_id, tipo: 'treino_extra' } }],
    });
    if (!aula) return res.status(404).json({ erro: 'Treino extra não encontrado' });

    const { data, aluno_ids } = req.body;
    if (data) await aula.update({ data });

    if (Array.isArray(aluno_ids)) {
      const atuais = await Chamada.findAll({ where: { aula_id: aula.id } });
      const atuaisIds = new Set(atuais.map((c) => c.aluno_id));
      const novosIds = new Set(aluno_ids);

      for (const c of atuais) {
        if (!novosIds.has(c.aluno_id)) await c.destroy();
      }
      for (const aluno_id of aluno_ids) {
        if (!atuaisIds.has(aluno_id)) {
          await Chamada.create({ aula_id: aula.id, aluno_id, origem: 'professor', validado_por: req.usuario.id });
        }
      }
    }

    const completa = await Aula.findByPk(aula.id, { include: incluirDetalhes });
    res.json(formatar(completa));
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// DELETE /api/treinos-extras/:id
const remover = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id, {
      include: [{ model: Turma, where: { escola_id: req.usuario.escola_id, tipo: 'treino_extra' } }],
    });
    if (!aula) return res.status(404).json({ erro: 'Treino extra não encontrado' });
    await aula.destroy(); // cascade remove as Chamadas (aulas.id -> chamadas.aula_id ON DELETE CASCADE)
    res.json({ mensagem: 'Treino extra removido' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, remover };
