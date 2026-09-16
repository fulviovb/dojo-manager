const { ParticipanteIncentivo, DocumentoIncentivo, Usuario, ArteMarcial } = require('../models');
const { CHECKLIST_ATLETA, CHECKLIST_TECNICO } = require('../constants/incentivoEsporte');

const INCLUDE_PADRAO = [
  { model: Usuario, as: 'Aluno', attributes: ['id', 'nome', 'foto_url'] },
  { model: ArteMarcial, attributes: ['id', 'nome'] },
  { model: ParticipanteIncentivo, as: 'TecnicoResponsavel', attributes: ['id', 'nome'] },
];

function calcularIdade(dataNascimentoIso) {
  if (!dataNascimentoIso) return null;
  const hoje = new Date();
  const nascimento = new Date(dataNascimentoIso + 'T00:00:00');
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario = hoje.getMonth() < nascimento.getMonth()
    || (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

function itemAplica(condicao, { menorDe18, atuaComMenores }) {
  if (condicao === 'sempre') return true;
  if (condicao === 'menor_18') return menorDe18;
  if (condicao === 'atua_com_menores') return atuaComMenores;
  if (condicao === 'nao_atua_com_menores') return !atuaComMenores;
  return false;
}

async function semearChecklist(participante) {
  const checklist = participante.tipo_pessoa === 'tecnico' ? CHECKLIST_TECNICO : CHECKLIST_ATLETA;
  const contexto = {
    menorDe18: (calcularIdade(participante.data_nascimento) ?? 99) < 18,
    atuaComMenores: !!participante.atua_com_menores,
  };
  const itens = checklist
    .filter(item => itemAplica(item.condicao, contexto))
    .map(item => ({
      escola_id: participante.escola_id,
      participante_id: participante.id,
      tipo_documento: item.key,
      nome_exibicao: item.nome,
      origem: 'upload',
      status: 'pendente',
    }));
  if (itens.length) await DocumentoIncentivo.bulkCreate(itens);
}

const listar = async (req, res) => {
  try {
    const { tipo_pessoa, ativo } = req.query;
    const where = { escola_id: req.usuario.escola_id };
    if (tipo_pessoa) where.tipo_pessoa = tipo_pessoa;
    where.ativo = ativo === 'false' ? false : true;
    if (ativo === 'todos') delete where.ativo;

    const participantes = await ParticipanteIncentivo.findAll({
      where, include: INCLUDE_PADRAO, order: [['nome', 'ASC']],
    });
    res.json(participantes);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const participante = await ParticipanteIncentivo.findOne({
      where: { id: req.params.id, escola_id: req.usuario.escola_id },
      include: INCLUDE_PADRAO,
    });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });
    res.json(participante);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const { aluno_id } = req.body;

    // Aluno matriculado: puxa dados pessoais do cadastro como ponto de
    // partida (o usuário pode ajustar depois — os campos ficam próprios
    // aqui, não sincronizados automaticamente).
    let dadosBase = {};
    if (aluno_id) {
      const aluno = await Usuario.findOne({ where: { id: aluno_id, escola_id, role: 'aluno' } });
      if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
      dadosBase = {
        nome: aluno.nome, cpf: aluno.cpf, rg: aluno.rg, data_nascimento: aluno.data_nascimento,
        telefone: aluno.telefone, email: aluno.email, endereco: aluno.endereco,
        bairro: aluno.bairro, cidade: aluno.cidade, estado: aluno.estado, cep: aluno.cep,
      };
    }

    const participante = await ParticipanteIncentivo.create({
      ...dadosBase, ...req.body, escola_id, aluno_id: aluno_id || null,
    });
    await semearChecklist(participante);

    const completo = await ParticipanteIncentivo.findByPk(participante.id, { include: INCLUDE_PADRAO });
    res.status(201).json(completo);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const participante = await ParticipanteIncentivo.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });
    await participante.update(req.body);
    const completo = await ParticipanteIncentivo.findByPk(participante.id, { include: INCLUDE_PADRAO });
    res.json(completo);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const desativar = async (req, res) => {
  try {
    const participante = await ParticipanteIncentivo.findOne({ where: { id: req.params.id, escola_id: req.usuario.escola_id } });
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });
    await participante.update({ ativo: false });
    res.json({ mensagem: 'Participante desativado' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, buscar, criar, atualizar, desativar };
