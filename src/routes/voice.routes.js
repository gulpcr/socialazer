// src/routes/voiceover.routes.js
const express = require('express');
const router = express.Router();
const voiceoverController = require('../controllers/voice.controller');

/**
 * @route   POST /api/v1/voice-over/generate
 * @desc    Generate a voiceover from custom text
 * @access  Public
 * @body    { text, voiceId?, provider?, settings? }
 */
router.post('/voice-over/generate', voiceoverController.generateVoiceover);

/**
 * @route   GET /api/v1/voice-over/presets
 * @desc    Get available voice presets
 * @access  Public
 * @query   gender?, language?, provider?
 */
router.get('/voice-over/presets', voiceoverController.getVoicePresets);

/**
 * @route   GET /api/v1/voice-over/:id
 * @desc    Get details of a specific voiceover
 * @access  Public
 * @params  id - Voiceover ID
 */
router.get('/voice-over/:id', voiceoverController.getVoiceoverById);

/**
 * @route   DELETE /api/v1/voice-over/:id
 * @desc    Delete a voiceover file
 * @access  Public
 * @params  id - Voiceover ID
 */
router.delete('/voice-over/:id', voiceoverController.deleteVoiceover);

module.exports = router;