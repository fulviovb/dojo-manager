const { ParticipanteIncentivo, DocumentoIncentivo, CredencialIncentivo } = require('../models');
const { ITEM_CREDENCIAL } = require('../constants/incentivoEsporte');
const { cifrar, decifrar } = require('../utils/cifra');

const buscarParticipante = (id, escola_id) => ParticipanteIncentivo.findOne({ where: { id, escola_id } });

// Mantém o item do checklist em sincronia com a existência da credencial —
// cria o item se o participante for anterior a ele (findOrCreate, nunca
// duplica).
async function marcarItemChecklist(participante, status) {
  const [item] = await DocumentoIncentivo.findOrCreate({
    where: { participante_id: participante.id, tipo_documento: ITEM_CREDENCIAL.key },
    defaults: {
      escola_id: participante.escola_id, participante_id: participante.id,
      tipo_documento: ITEM_CREDENCIAL.key, nome_exibicao: ITEM_CREDENCIAL.nome,
      origem: 'upload', status, ordem: 0,
    },
  });
  // Não rebaixa um item já 'aprovado' ao só trocar a senha.
  if (status === 'pendente' || item.status === 'pendente') await item.update({ status });
}

const buscar = async (req, res) => {
  try {
    const participante = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });
    const credencial = await CredencialIncentivo.findOne({
      where: { participante_id: participante.id, escola_id: req.usuario.escola_id },
      attributes: ['login', 'updatedAt'],
    });
    res.json(credencial ? { login: credencial.login, atualizado_em: credencial.updatedAt } : null);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

// Cria ou atualiza. Senha em branco numa credencial já existente = mantém a
// atual (permite corrigir só o login sem redigitar a senha).
const salvar = async (req, res) => {
  try {
    const participante = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });
    const login = String(req.body.login || '').trim();
    const senha = req.body.senha ? String(req.body.senha) : '';
    if (!login) return res.status(400).json({ erro: 'Informe o login' });

    const existente = await CredencialIncentivo.findOne({ where: { participante_id: participante.id, escola_id: req.usuario.escola_id } });
    if (!existente && !senha) return res.status(400).json({ erro: 'Informe a senha' });

    const dados = { login, ...(senha ? { senha_cifrada: cifrar(senha, participante.id) } : {}) };
    if (existente) await existente.update(dados);
    else await CredencialIncentivo.create({ ...dados, escola_id: req.usuario.escola_id, participante_id: participante.id });

    await marcarItemChecklist(participante, 'recebido');
    res.json({ login });
  } catch (e) {
    console.error(e);
    if (/CREDENCIAIS_KEY/.test(e.message)) return res.status(500).json({ erro: 'Chave de criptografia não configurada no servidor (CREDENCIAIS_KEY)' });
    res.status(500).json({ erro: 'Erro interno' });
  }
};

const revelar = async (req, res) => {
  try {
    const participante = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });
    const credencial = await CredencialIncentivo.findOne({ where: { participante_id: participante.id, escola_id: req.usuario.escola_id } });
    if (!credencial) return res.status(404).json({ erro: 'Nenhuma credencial cadastrada' });
    // Trilha mínima de quem viu qual senha (sem logar a senha).
    console.log(`[credencial] usuario=${req.usuario.id} revelou senha do participante=${participante.id}`);
    res.set('Cache-Control', 'no-store');
    res.json({ login: credencial.login, senha: decifrar(credencial.senha_cifrada, participante.id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Não foi possível decifrar a senha (chave CREDENCIAIS_KEY ausente ou diferente da usada ao salvar)' });
  }
};

const remover = async (req, res) => {
  try {
    const participante = await buscarParticipante(req.params.id, req.usuario.escola_id);
    if (!participante) return res.status(404).json({ erro: 'Participante não encontrado' });
    await CredencialIncentivo.destroy({ where: { participante_id: participante.id, escola_id: req.usuario.escola_id } });
    await marcarItemChecklist(participante, 'pendente');
    res.json({ mensagem: 'Credencial removida' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { buscar, salvar, revelar, remover };
