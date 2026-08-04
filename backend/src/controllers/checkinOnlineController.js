const { sincronizarRoster, buscarEReconciliarCheckins } = require('../services/checkinOnlineService');

// POST /api/checkin-online/sincronizar (admin) — empurra a lista de hoje
// pro módulo online e traz de volta os check-ins pendentes, reconciliando
// como Chamada de verdade.
const sincronizar = async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    await sincronizarRoster(escola_id);
    const resultado = await buscarEReconciliarCheckins(escola_id);
    res.json({ sucesso: true, ...resultado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: e.message || 'Erro ao sincronizar check-in online' });
  }
};

module.exports = { sincronizar };
