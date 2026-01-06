// src/controllers/voiceover.controller.js
const voiceService = require('../services/voice.service');

class VoiceoverController {
  /**
   * POST /api/v1/voice-over/generate
   * Generate a voiceover from custom text
   */
  async generateVoiceover(req, res) {
    try {
      const { text, voiceId, provider, settings } = req.body;

      // Validation
      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Text is required for voiceover generation'
        });
      }

      // Validate text length (ElevenLabs has limits)
      if (text.length > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Text is too long. Maximum 5000 characters allowed.'
        });
      }

      console.log('🎙️ Generating voiceover for text:', text.substring(0, 50) + '...');

      // Generate voiceover
      const result = await voiceService.generateVoiceoverFromText({
        text,
        voiceId,
        provider: provider || 'elevenlabs',
        settings: settings || {}
      });

      return res.status(200).json({
        success: true,
        message: 'Voiceover generated successfully',
        data: {
          id: result.id,
          audioUrl: result.audioUrl,
          duration: result.duration,
          format: result.format,
          sampleRate: result.sampleRate
        }
      });
    } catch (error) {
      console.error('Error in generateVoiceover:', error);

      // Handle specific errors
      if (error.message.includes('API Key')) {
        return res.status(500).json({
          success: false,
          message: 'ElevenLabs API configuration error',
          error: 'API key is missing or invalid'
        });
      }

      if (error.response?.status === 401) {
        return res.status(500).json({
          success: false,
          message: 'ElevenLabs API authentication failed',
          error: 'Invalid API key'
        });
      }

      if (error.response?.status === 429) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          error: 'Too many requests. Please try again later.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to generate voiceover',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/voice-over/presets
   * Get available voice presets
   */
  async getVoicePresets(req, res) {
    try {
      console.log('🎭 Fetching voice presets...');

      // Get presets from service
      const presets = await voiceService.getVoicePresets();

      // Optional: Filter by query parameters
      const { gender, language, provider } = req.query;
      
      let filteredPresets = presets;

      if (gender) {
        filteredPresets = filteredPresets.filter(p => 
          p.gender.toLowerCase() === gender.toLowerCase()
        );
      }

      if (language) {
        filteredPresets = filteredPresets.filter(p => 
          p.language.toLowerCase() === language.toLowerCase()
        );
      }

      if (provider) {
        filteredPresets = filteredPresets.filter(p => 
          p.provider.toLowerCase() === provider.toLowerCase()
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Voice presets retrieved successfully',
        data: {
          presets: filteredPresets,
          total: filteredPresets.length
        }
      });
    } catch (error) {
      console.error('Error in getVoicePresets:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch voice presets',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/voice-over/:id
   * Get details of a specific voiceover (future enhancement)
   */
  async getVoiceoverById(req, res) {
    try {
      const { id } = req.params;

      // This would typically fetch from a database
      // For now, return a placeholder response

      return res.status(200).json({
        success: true,
        data: {
          id: id,
          message: 'Voiceover details endpoint - to be implemented'
        }
      });
    } catch (error) {
      console.error('Error in getVoiceoverById:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch voiceover details',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/v1/voice-over/:id
   * Delete a voiceover file (future enhancement)
   */
  async deleteVoiceover(req, res) {
    try {
      const { id } = req.params;

      // This would typically delete from storage and database
      // For now, return a placeholder response

      return res.status(200).json({
        success: true,
        message: 'Voiceover deleted successfully',
        data: { id }
      });
    } catch (error) {
      console.error('Error in deleteVoiceover:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to delete voiceover',
        error: error.message
      });
    }
  }
}

module.exports = new VoiceoverController();