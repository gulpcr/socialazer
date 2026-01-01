const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/script.controller');

router.post('/generate-reel-script', scriptController.generateScript);

router.get('/latest', scriptController.getGeneratedScript);

module.exports = router;