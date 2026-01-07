// src/controllers/reelgen.controller.js

const scriptService = require('../services/script.service');
const soraService = require('../services/sora.service');
const ffmpegService = require('../services/ffmpeg.service');
const path = require('path');
const fs = require('fs');

class ReelGenController {
  
  // POST /api/generate-reel
  async generateReel(req, res) {
    try {
      console.log('🚀 ORCHESTRATOR: Starting Serial Generation Pipeline...');

      // 1. Get Script
      const scriptData = await scriptService.getCurrentScript();
      if (!scriptData) {
        return res.status(400).json({ success: false, message: 'No script found.' });
      }

      // 2. Start Sora Video Generation
      console.log('   👉 Step 1: Requesting Sora Video...');
      const soraInit = await soraService.createReel(); 

      if (!soraInit.success) {
        throw new Error(`Sora start failed: ${soraInit.message}`);
      }

      const videoId = soraInit.videoId;
      console.log(`   ⏳ Polling Sora for video ID: ${videoId}...`);
      
      // 3. Poll for Completion & Download
      let soraVideoPath = null;
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes

      while (!isComplete && attempts < maxAttempts) {
        attempts++;
        
        // Check status using the new download logic
        const result = await soraService.downloadVideoIfReady(videoId);
        
        if (result.status === 'completed') {
          soraVideoPath = result.localPath;
          isComplete = true;
          console.log('   ✅ Step 2: Sora Video Downloaded Successfully');
        } else if (result.status === 'processing' || result.status === 'queued') {
          // Still working
          if (attempts % 2 === 0) process.stdout.write('.'); // visuals
          await new Promise(r => setTimeout(r, 5000)); // Wait 5s
        } else {
          throw new Error(`Sora generation failed with status: ${result.status}`);
        }
      }

      if (!soraVideoPath) {
        throw new Error('Sora generation timed out.');
      }

      // 4. Post-Processing (FFmpeg) - NO AUDIO, JUST VISUALS
      console.log('\n   👉 Step 3: Applying Visual Overlays (QR + Text)...');
      
      const finalRender = await ffmpegService.processSoraVideo(soraVideoPath, scriptData);

      return res.status(200).json({
        success: true,
        message: 'Reel generated successfully',
        data: {
            videoPath: finalRender.path,
            originalVideo: soraVideoPath,
            status: 'completed',
            timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Pipeline Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Pipeline failed',
        error: error.message
      });
    }
  }

  // Simple status check endpoint
  async checkRenderStatus(req, res) {
    const outputPath = path.join(__dirname, '../assets/videos/');
    try {
        if (!fs.existsSync(outputPath)) {
             return res.status(200).json({ success: true, latest_video: null });
        }
        const files = fs.readdirSync(outputPath);
        const latest = files
            .filter(f => f.startsWith('final_reel'))
            .sort().reverse()[0];
            
        res.status(200).json({
            success: true,
            latest_video: latest ? path.join(outputPath, latest) : null
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
  }
}

module.exports = new ReelGenController();