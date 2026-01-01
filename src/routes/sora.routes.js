const express = require('express');
const { soraCreate, soraRead } = require('../controllers/sora.controller.js');

const router = express.Router();


/**
 * POST → start reel generation
 */
router.post('/sora-create', soraCreate);

/**
 * GET → fetch completed reel
 */
router.get('/sora-read/:videoId', soraRead);

module.exports = router;
