const express = require('express');
const router = express.Router();
const infoController = require('../controllers/info.controller');

// GET all aggregated data
router.get('/info', (req, res) => infoController.getProjectInfo(req, res));

module.exports = router;