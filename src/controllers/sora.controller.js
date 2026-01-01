const { createReel, fetchReel } = require('../services/sora.service.js');;

/**
 * POST /sora-create
 * Starts Sora reel generation
 */
exports.soraCreate = async (req, res) => {
  try {
    const result = await createReel();

    return res.status(202).json({
      success: true,
      message: 'Sora video generation started',
      videoId: result.videoId,
      status: result.status,
    });
  } catch (error) {
    console.error('Sora create error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to start Sora video generation',
      error: error.message,
    });
  }
}

/**
 * GET /sora-read/:videoId
 * Polls + downloads completed reel
 */
exports.soraRead = async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'videoId is required',
      });
    }

    const result = await fetchReel(videoId);

    return res.status(200).json({
      success: true,
      message: 'Sora video successfully generated',
      filePath: result.path,
    });
  } catch (error) {
    console.error('Sora read error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Sora video',
      error: error.message,
    });
  }
}
