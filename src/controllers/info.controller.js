const infoService = require('../services/info.service');

class InfoController {
  
  // GET /api/v1/info
  async getProjectInfo(req, res) {
    try {
      const data = await infoService.getFullProjectData();

      return res.status(200).json({
        success: true,
        message: 'Project information retrieved successfully',
        data: data
      });
    } catch (error) {
      console.error('Error in getProjectInfo:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve project info',
        error: error.message
      });
    }
  }
}

module.exports = new InfoController();