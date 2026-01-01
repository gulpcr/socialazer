const reelGenService = require('../services/reelgen.service');

class ReelGenController {
  async generateReel(req, res) {
    try {
      const result = await reelGenService.generateReel();
      
      return res.status(200).json({
        success: true,
        message: 'Reel generation started successfully',
        data: result
      });
    } catch (error) {
      console.error('Error in generateReel:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to generate reel',
        error: error.message
      });
    }
  }

  async checkRenderStatus(req, res) {
    try {
      const { renderId } = req.params;
      
      if (!renderId) {
        return res.status(400).json({
          success: false,
          message: 'Render ID is required'
        });
      }

      const result = await reelGenService.checkRenderStatus(renderId);
      
      return res.status(200).json({
        success: true,
        message: 'Render status retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error in checkRenderStatus:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to check render status',
        error: error.message
      });
    }
  }
}

module.exports = new ReelGenController();