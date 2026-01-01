const scriptService = require('../services/script.service');

class ScriptController {
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

  async getGeneratedScript(req, res) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const Papa = require('papaparse');
      
      const scriptCsvPath = path.join(__dirname, '../../src/script.csv');
      const csvContent = await fs.readFile(scriptCsvPath, 'utf-8');
      
      const parsed = await new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      });

      if (parsed.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No script found'
        });
      }

      const latestScript = parsed[parsed.length - 1];
      
      return res.status(200).json({
        success: true,
        data: {
          timestamp: latestScript.timestamp,
          script: JSON.parse(latestScript.script),
          status: latestScript.status
        }
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
}

module.exports = new ScriptController();