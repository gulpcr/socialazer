// src/routes/suggestions.routes.js
const express = require('express');
const router = express.Router();
const suggestionsController = require('../controllers/suggestions.controller');

/**
 * @route   POST /api/v1/suggestions
 * @desc    Generate AI-powered suggestions for a script
 * @access  Public
 * @body    { scriptId: string }
 */
router.post('/suggestions', suggestionsController.generateSuggestions);

/**
 * @route   GET /api/v1/suggestions/:scriptId
 * @desc    Get suggestions for a specific script (alternative endpoint)
 * @access  Public
 * @params  scriptId - The ID of the script
 */
router.get('/suggestions/:scriptId', suggestionsController.getSuggestionsByScriptId);

/**
 * @route   POST /api/v1/suggestions/apply
 * @desc    Apply a specific suggestion to a script
 * @access  Public
 * @body    { scriptId: string, suggestionId: string }
 */
router.post('/suggestions/apply', suggestionsController.applySuggestion);

module.exports = router;