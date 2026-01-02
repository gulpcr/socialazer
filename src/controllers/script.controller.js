const scriptService = require('../services/script.service');

class ScriptController {
  // 1. Generate new script (POST)
  async generateScript(req, res) {
    try {
      const result = await scriptService.processAndGenerateScript();
      
      return res.status(200).json({
        success: true,
        message: 'Script generated and saved successfully',
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
      // REFACTORED: Use service method instead of reading file directly
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
  async updateScript(req, res) {
    try {
      const updates = req.body;
      
      // Basic validation
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No update data provided'
        });
      }

      // Calls the service which does: Read Current -> Merge -> Save
      const result = await scriptService.updateScript(updates);

      return res.status(200).json({
        success: true,
        message: 'Script updated successfully',
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