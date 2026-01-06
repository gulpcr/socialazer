// src/controllers/reelgen.controller.js

const scriptService = require('../services/script.service');
const configService = require('../services/config.service');
const assetService = require('../services/asset.service');
const voiceService = require('../services/voice.service');
const ffmpegService = require('../services/ffmpeg.service');
const path = require('path');
const fs = require('fs');

class ReelGenController {
  
  // POST /api/generate-reel
  async generateReel(req, res) {
    try {
      console.log('🎬 Starting Local Reel Generation Pipeline...');

      // 1. Validation: Ensure Script Exists
      const scriptData = await scriptService.getCurrentScript();
      
      // DEBUG: Log what we got
      console.log('📊 Script data retrieved:', scriptData ? 'Found' : 'NULL');
      if (scriptData) {
        console.log('📊 Script has scenes?', !!scriptData.scenes);
        console.log('📊 Script has elements?', !!scriptData.elements);
        console.log('📊 Script keys:', Object.keys(scriptData));
      }
      
      // FIX: getCurrentScript now returns script directly, not wrapped in { script: ... }
      if (!scriptData) {
        return res.status(400).json({
          success: false,
          message: 'No script found. Please generate a script first using POST /api/scripts/generate'
        });
      }

      // Check for either new format (scenes) or old format (elements)
      if (!scriptData.scenes && !scriptData.elements) {
        return res.status(400).json({
          success: false,
          message: 'Invalid script format. Script must have either "scenes" or "elements" array.'
        });
      }

      // 2. Load Configuration
      const config = await configService.getConfig();

      // 3. Step 1: Download Assets (Images)
      console.log('   Step 1: Downloading Assets...');
      // FIX: Pass scriptData directly instead of scriptData.script
      await assetService.downloadScriptAssets(scriptData);

      // 4. Step 2: Generate Voiceover (if enabled)
      console.log('   Step 2: Checking Voiceover...');
      if (config.voiceover) {
        // FIX: Pass scriptData directly
        await voiceService.generateVoiceover(scriptData);
      } else {
        console.log('   Voiceover disabled in config.');
      }

      // 5. Step 3: Render Video with FFmpeg
      console.log('   Step 3: Rendering Video (this may take a moment)...');
      const videoResult = await ffmpegService.createVideo(config);

      return res.status(200).json({
        success: true,
        message: 'Reel generated successfully',
        data: {
            videoPath: videoResult.path,
            status: 'completed',
            timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error in generateReel:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to generate reel',
        error: error.message
      });
    }
  }

  // GET /api/render-status/:renderId
  // Updated to check local file existence since we aren't using an async cloud API
  async checkRenderStatus(req, res) {
    try {
      // In this local FFmpeg version, we don't strictly need a renderId 
      // because the process is synchronous in generateReel.
      // However, we'll check if the output file exists to satisfy the route.
      
      const outputPath = path.join(__dirname, '../assets/videos/output.mp4'); // Default output name
      const exists = fs.existsSync(outputPath);

      if (exists) {
        return res.status(200).json({
            success: true,
            message: 'Render status retrieved',
            data: {
                status: 'completed',
                url: outputPath // In a real app, this would be a localhost URL
            }
        });
      } else {
        return res.status(200).json({
            success: true,
            message: 'Render status retrieved',
            data: {
                status: 'processing_or_not_found'
            }
        });
      }

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