const configService = require('../services/config.service');

class ConfigController {
  
  // POST /api/config
  async saveConfig(req, res) {
    try {
      const configData = req.body;
      
      if (!configData || Object.keys(configData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No configuration data provided'
        });
      }

      const savedConfig = await configService.saveConfig(configData);

      return res.status(200).json({
        success: true,
        message: 'Configuration saved successfully',
        data: savedConfig
      });
    } catch (error) {
      console.error('Error in saveConfig:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save configuration',
        error: error.message
      });
    }
  }

  // GET /api/config
  async getConfig(req, res) {
    try {
      const config = await configService.getConfig();
      
      return res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error in getConfig:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve configuration',
        error: error.message
      });
    }
  }
}

module.exports = new ConfigController();