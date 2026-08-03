const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {
  Usuario, Turma, ArteMarcial, Faixa, MatriculaAluno, GraduacaoAluno,
  HorarioTurma, Sala, Aula, Chamada, AssinaturaAluno, PlanoMensalidade,
} = require('../models');
const { ehDonoDaTurma } = require('../middleware/autorizacao');
const { dataLocalISO } = require('../utils/data');

const umMesAtras = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return dataLocalISO(d);
};

// GET /api/relatorios/alunos-por-graduacao?arte_marcial_id=&exibir_turmas=
const alunosPorGraduacao = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { arte_marcial_id } = req.query;
    const exibirTurmas = req.query.exibir_turmas === 'true';

    const matriculas = await MatriculaAluno.findAll({
      where: { ativa: true },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'], where: { escola_id, role: 'aluno', ativo: true } },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor', 'ordem', 'arte_marcial_id'] },
        { model: Turma, attributes: ['id', 'nome'], where: arte_marcial_id ? { arte_marcial_id } : undefined },
      ],
    });

    const porFaixa = new Map();
    for (const m of matriculas) {
      if (!m.FaixaAtual) continue;
      const fid = m.FaixaAtual.id;
      if (!porFaixa.has(fid)) porFaixa.set(fid, { faixa: m.FaixaAtual, alunos: new Map() });
      const grupo = porFaixa.get(fid);
      if (!grupo.alunos.has(m.aluno_id)) {
        grupo.alunos.set(m.aluno_id, { id: m.Aluno.id, nome: m.Aluno.nome, turmas: new Set() });
      }
      grupo.alunos.get(m.aluno_id).turmas.add(m.Turma.nome);
    }

    const faixas = [...porFaixa.values()]
      .sort((a, b) => (a.faixa.ordem ?? 0) - (b.faixa.ordem ?? 0))
      .map((g) => ({
        faixa: { id: g.faixa.id, nome: g.faixa.nome, cor: g.faixa.cor },
        alunos: [...g.alunos.values()]
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .map((a) => ({ id: a.id, nome: a.nome, turmas: exibirTurmas ? [...a.turmas] : undefined })),
      }));

    res.json({ exibir_turmas: exibirTurmas, faixas });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/alunos-por-turma?turma_id=&plano_pagamento=
const alunosPorTurma = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { turma_id } = req.query;
    if (!turma_id) return res.status(400).json({ erro: 'turma_id é obrigatório' });
    const comPlano = req.query.plano_pagamento === 'true';

    const turma = await Turma.findOne({
      where: { id: turma_id, escola_id },
      include: [
        { model: ArteMarcial, attributes: ['id', 'nome'] },
        { model: Usuario, as: 'Professor', attributes: ['id', 'nome'] },
        { model: HorarioTurma, include: [{ model: Sala, attributes: ['id', 'nome'] }] },
      ],
    });
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    if (!ehDonoDaTurma(req.usuario, turma)) return res.status(403).json({ erro: 'Acesso negado a esta turma' });

    const matriculas = await MatriculaAluno.findAll({
      where: { turma_id, ativa: true },
      include: [
        { model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] },
        { model: Faixa, as: 'FaixaAtual', attributes: ['id', 'nome', 'cor'] },
      ],
    });

    const planosPorAluno = {};
    if (comPlano && matriculas.length) {
      const assinaturas = await AssinaturaAluno.findAll({
        where: { aluno_id: { [Op.in]: matriculas.map((m) => m.aluno_id) }, status: 'ativa' },
        include: [{ model: PlanoMensalidade, as: 'Plano', attributes: ['id', 'nome'] }],
      });
      for (const a of assinaturas) planosPorAluno[a.aluno_id] = a.Plano?.nome || null;
    }

    const alunos = matriculas
      .map((m) => ({
        id: m.Aluno.id,
        nome: m.Aluno.nome,
        faixa: m.FaixaAtual?.nome || null,
        plano: comPlano ? (planosPorAluno[m.aluno_id] || null) : undefined,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    res.json({
      turma: {
        id: turma.id,
        nome: turma.nome,
        arte_marcial: turma.ArteMarcial?.nome,
        professor: turma.Professor?.nome,
        horarios: (turma.HorarioTurmas || []).map((h) => ({
          dia_semana: h.dia_semana, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim, sala: h.Sala?.nome,
        })),
      },
      com_plano_pagamento: comPlano,
      alunos,
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/ficha-cadastral?aluno_id=
const fichaCadastral = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { aluno_id } = req.query;
    if (!aluno_id) return res.status(400).json({ erro: 'aluno_id é obrigatório' });

    const aluno = await Usuario.findOne({
      where: { id: aluno_id, escola_id, role: 'aluno' },
      attributes: { exclude: ['senha_hash'] },
    });
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const [matriculas, graduacoesAtuais] = await Promise.all([
      MatriculaAluno.findAll({
        where: { aluno_id, ativa: true },
        include: [{ model: Turma, attributes: ['id', 'nome'] }],
      }),
      GraduacaoAluno.findAll({
        where: { aluno_id, atual: true },
        include: [
          { model: Faixa, attributes: ['id', 'nome', 'cor'] },
          { model: ArteMarcial, attributes: ['id', 'nome'] },
        ],
      }),
    ]);

    res.json({
      aluno: aluno.toJSON(),
      turmas: matriculas.map((m) => m.Turma?.nome).filter(Boolean),
      graduacoes_atuais: graduacoesAtuais.map((g) => ({ arte: g.ArteMarcial?.nome, faixa: g.Faixa?.nome })),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/frequencia-turma?turma_id=&inicio=&fim=&modo=relacao|quantitativo
const frequenciaTurma = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { turma_id, modo } = req.query;
    if (!turma_id) return res.status(400).json({ erro: 'turma_id é obrigatório' });

    const turma = await Turma.findOne({ where: { id: turma_id, escola_id } });
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    if (!ehDonoDaTurma(req.usuario, turma)) return res.status(403).json({ erro: 'Acesso negado a esta turma' });

    const inicio = req.query.inicio || umMesAtras();
    const fim = req.query.fim || dataLocalISO(new Date());

    const aulas = await Aula.findAll({
      where: { turma_id, data: { [Op.between]: [inicio, fim] } },
      include: [{ model: Chamada, include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] }] }],
      order: [['data', 'ASC']],
    });

    if (modo === 'quantitativo') {
      const matriculas = await MatriculaAluno.findAll({
        where: { turma_id, ativa: true },
        include: [{ model: Usuario, as: 'Aluno', attributes: ['id', 'nome'] }],
      });
      const totalAulas = aulas.length;
      const contagem = new Map(matriculas.map((m) => [m.aluno_id, { id: m.Aluno.id, nome: m.Aluno.nome, presencas: 0 }]));
      for (const a of aulas) {
        for (const c of a.Chamadas) {
          if (contagem.has(c.aluno_id)) contagem.get(c.aluno_id).presencas++;
        }
      }
      const alunos = [...contagem.values()]
        .map((a) => ({ ...a, total_aulas: totalAulas, percentual: totalAulas ? Math.round((a.presencas / totalAulas) * 100) : 0 }))
        .sort((a, b) => b.percentual - a.percentual);
      return res.json({ turma: { id: turma.id, nome: turma.nome }, periodo: { inicio, fim }, modo: 'quantitativo', total_aulas: totalAulas, alunos });
    }

    const relacao = aulas.map((a) => ({
      id: a.id, data: a.data, hora_inicio: a.hora_inicio,
      presentes: a.Chamadas.map((c) => c.Aluno?.nome).filter(Boolean),
    }));
    res.json({ turma: { id: turma.id, nome: turma.nome }, periodo: { inicio, fim }, modo: 'relacao', aulas: relacao });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/frequencia-aluno?aluno_id=&inicio=&fim=
const frequenciaAluno = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { aluno_id } = req.query;
    if (!aluno_id) return res.status(400).json({ erro: 'aluno_id é obrigatório' });

    const aluno = await Usuario.findOne({ where: { id: aluno_id, escola_id, role: 'aluno' } });
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const inicio = req.query.inicio || umMesAtras();
    const fim = req.query.fim || dataLocalISO(new Date());

    const chamadas = await Chamada.findAll({
      where: { aluno_id },
      include: [{
        model: Aula,
        attributes: ['id', 'data', 'hora_inicio', 'turma_id'],
        where: { data: { [Op.between]: [inicio, fim] } },
        include: [{ model: Turma, attributes: ['id', 'nome'] }],
      }],
      order: [[{ model: Aula }, 'data', 'DESC']],
    });

    res.json({
      aluno: { id: aluno.id, nome: aluno.nome },
      periodo: { inicio, fim },
      total: chamadas.length,
      chamadas: chamadas.map((c) => ({ data: c.Aula.data, hora_inicio: c.Aula.hora_inicio, turma: c.Aula.Turma?.nome, origem: c.origem })),
    });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// GET /api/relatorios/aniversariantes?mes=
const aniversariantes = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;

    const alunos = await Usuario.findAll({
      where: {
        escola_id, role: 'aluno', ativo: true,
        [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('data_nascimento')), mes),
      },
      attributes: ['id', 'nome', 'data_nascimento', 'matricula', 'telefone'],
    });

    alunos.sort((a, b) => (a.data_nascimento || '').slice(8, 10).localeCompare((b.data_nascimento || '').slice(8, 10)));

    res.json({ mes, aniversariantes: alunos.map((a) => a.toJSON()) });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { alunosPorGraduacao, alunosPorTurma, fichaCadastral, frequenciaTurma, frequenciaAluno, aniversariantes };
