const express = require('express');
const router = express.Router();
const { scrapeController } = require('../controllers/scraper.controller');

router.post('/analyze-url', scrapeController);

module.exports = router;
