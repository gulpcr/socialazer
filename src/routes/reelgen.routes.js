const express = require('express');
const router = express.Router();
const reelGenController = require('../controllers/reelgen.controller');

router.post('/generate-reel', reelGenController.generateReel);

router.get('/status/:renderId', reelGenController.checkRenderStatus);

module.exports = router;