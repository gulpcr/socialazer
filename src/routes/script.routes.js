const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/script.controller');

// Generate a brand new script from scraped data
router.post('/generate-reel-script', scriptController.generateScript);

// Get the currently active script
router.get('/latest', scriptController.getGeneratedScript);

// PATCH: Update the existing script (Merge changes)
router.patch('/update-script', scriptController.updateScript);

module.exports = router;