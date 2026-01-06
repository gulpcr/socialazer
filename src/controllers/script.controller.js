// src/controllers/script.controller.js
const scriptService = require('../services/script.service');

class ScriptController {
  // 1. Generate new script (POST)
  async generateScript(req, res) {
    try {
      // Extract analysisId and config from request body
      const { analysisId, config } = req.body;

      // Validate required fields
      if (!analysisId) {
        return res.status(400).json({
          success: false,
          message: 'analysisId is required'
        });
      }

      // Set defaults for config
      const scriptConfig = {
        platform: config?.platform || 'instagram',
        duration: config?.duration || 30,
        aspectRatio: config?.aspectRatio || '9:16',
        tone: config?.tone || 'energetic',
        voiceStyle: config?.voiceStyle || 'conversational'
      };

      console.log('🎬 Generating script with config:', scriptConfig);
      console.log('📊 Using analysis ID:', analysisId);

      // Pass analysisId and config to the service
      const result = await scriptService.processAndGenerateScript(analysisId, scriptConfig);
      
      return res.status(200).json({
        success: true,
        message: 'Script generated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error in generateScript:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to generate script',
        error: error.message
      });
    }
  }

  // 2. Get current script (GET)
  async getGeneratedScript(req, res) {
    try {
      const currentData = await scriptService.getCurrentScript();

      if (!currentData) {
        return res.status(404).json({
          success: false,
          message: 'No script found. Please generate one first.'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: currentData
      });
    } catch (error) {
      console.error('Error in getGeneratedScript:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve script',
        error: error.message
      });
    }
  }

  // 3. Update existing script (PATCH)
  /**
   * PATCH /api/scripts/update-script
   * 
   * Supports multiple update operations:
   * 
   * 1. REPLACE ALL SCENES:
   *    { "scenes": [...new scenes array...] }
   * 
   * 2. UPDATE SPECIFIC SCENES:
   *    { "updateScenes": [{ "id": "scene_1", "text": "New text", "duration": 6 }] }
   * 
   * 3. ADD NEW SCENES:
   *    { "addScenes": [{ "position": 1, "text": "...", "voiceOver": "...", ... }] }
   * 
   * 4. REMOVE SCENES:
   *    { "removeScenes": ["scene_2", "scene_3"] }
   * 
   * 5. REORDER SCENES:
   *    { "reorderScenes": ["scene_3", "scene_1", "scene_2"] }
   * 
   * Operations can be combined in a single request.
   */
  async updateScript(req, res) {
    try {
      const updates = req.body;
      
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No update data provided',
          examples: {
            replaceAll: { scenes: [] },
            updateSpecific: { updateScenes: [{ id: 'scene_1', text: 'New text' }] },
            addNew: { addScenes: [{ position: 0, text: '...', voiceOver: '...' }] },
            remove: { removeScenes: ['scene_1'] },
            reorder: { reorderScenes: ['scene_2', 'scene_1', 'scene_3'] }
          }
        });
      }

      // Validate update operations
      const validOperations = ['scenes', 'updateScenes', 'addScenes', 'removeScenes', 'reorderScenes'];
      const providedOperations = Object.keys(updates).filter(key => validOperations.includes(key));

      if (providedOperations.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid update operations provided',
          validOperations: validOperations
        });
      }

      console.log('🔧 Applying update operations:', providedOperations.join(', '));

      const result = await scriptService.updateScript(updates);

      return res.status(200).json({
        success: true,
        message: 'Script updated successfully',
        operations: providedOperations,
        data: result
      });

    } catch (error) {
      console.error('Error in updateScript:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to update script',
        error: error.message
      });
    }
  }
}

module.exports = new ScriptController();