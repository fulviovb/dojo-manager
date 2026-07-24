const router = require('express').Router();
const { getCheckin, postCheckin } = require('../controllers/checkinController');

// Rotas públicas — sem autenticação JWT
router.get('/:qr_token', getCheckin);
router.post('/:qr_token', postCheckin);

module.exports = router;
