const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');

// GET current configuration
router.get('/read-config', (req, res) => configController.getConfig(req, res));

// POST (Save/Update) configuration
router.post('/set-config', (req, res) => configController.saveConfig(req, res));

module.exports = router;