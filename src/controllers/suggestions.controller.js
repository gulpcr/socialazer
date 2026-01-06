// src/controllers/suggestions.controller.js
const suggestionsService = require('../services/suggestions.service');

class SuggestionsController {
  /**
   * POST /api/v1/suggestions
   * Generate suggestions for a script
   */
  async generateSuggestions(req, res) {
    try {
      const { scriptId } = req.body;

      // Validation
      if (!scriptId) {
        return res.status(400).json({
          success: false,
          message: 'scriptId is required'
        });
      }

      console.log('💡 Generating suggestions for script:', scriptId);

      // Get suggestions from service
      const result = await suggestionsService.getSuggestions(scriptId);

      return res.status(200).json({
        success: true,
        message: 'Suggestions generated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error in generateSuggestions:', error);

      // Handle specific errors
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to generate suggestions',
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/suggestions/apply
   * Apply a suggestion to a script (future feature)
   */
  async applySuggestion(req, res) {
    try {
      const { scriptId, suggestionId } = req.body;

      // Validation
      if (!scriptId || !suggestionId) {
        return res.status(400).json({
          success: false,
          message: 'scriptId and suggestionId are required'
        });
      }

      console.log('✅ Applying suggestion:', suggestionId, 'to script:', scriptId);

      // Apply suggestion
      const result = await suggestionsService.applySuggestion(scriptId, suggestionId);

      return res.status(200).json({
        success: true,
        message: 'Suggestion applied successfully',
        data: result
      });
    } catch (error) {
      console.error('Error in applySuggestion:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to apply suggestion',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/suggestions/:scriptId
   * Get suggestions for a script (alternative endpoint)
   */
  async getSuggestionsByScriptId(req, res) {
    try {
      const { scriptId } = req.params;

      if (!scriptId) {
        return res.status(400).json({
          success: false,
          message: 'scriptId is required'
        });
      }

      console.log('💡 Getting suggestions for script:', scriptId);

      const result = await suggestionsService.getSuggestions(scriptId);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in getSuggestionsByScriptId:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to get suggestions',
        error: error.message
      });
    }
  }
}

module.exports = new SuggestionsController();