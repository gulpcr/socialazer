// src/services/ffmpeg.service.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

let ffmpegPath = 'ffmpeg';
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {}
ffmpeg.setFfmpegPath(ffmpegPath);

class FfmpegService {
  constructor() {
    this.qrDir = path.join(__dirname, '../assets/qr');
    this.outputDir = path.join(__dirname, '../assets/videos');
  }

  // Helper: Normalize paths to use forward slashes (FFmpeg prefers this even on Windows)
  formatPath(filePath) {
    return filePath.replace(/\\/g, '/');
  }

  getFontPath() {
    if (process.platform === 'win32') {
      // Use forward slashes for Windows path, but escape the drive letter colon
      // e.g., C\:/Windows/Fonts/arial.ttf
      return 'C\\:/Windows/Fonts/arial.ttf'; 
    } else {
      const paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/System/Library/Fonts/HelveticaNeue.ttc',
        'FreeSans.ttf'
      ];
      for (const p of paths) { if (fs.existsSync(p)) return p; }
      return 'FreeSans.ttf';
    }
  }

  sanitizeText(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\') 
      .replace(/:/g, '\\:')   
      .replace(/'/g, '')      
      .replace(/,/g, '\\,')   
      .replace(/\[/g, '\\[')  
      .replace(/\]/g, '\\]')  
      .replace(/%/g, '\\%')   
      .trim();
  }

  getQrPath() {
    if (!fs.existsSync(this.qrDir)) return null;
    const files = fs.readdirSync(this.qrDir).filter(f => f.endsWith('.png'));
    return files.length > 0 ? path.join(this.qrDir, files[0]) : null;
  }

  /**
   * Process Video:
   * 1. Sora Video Input (Visuals + Audio)
   * 2. Overlay QR Code
   * 3. Overlay Text
   * 4. RETAIN Original Audio
   */
  async processSoraVideo(soraVideoPath, scriptData) {
    console.log('🎬 FFmpeg: Processing Video (QR + Text + Original Audio)...');
    
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    
    const qrPath = this.getQrPath();
    const finalOutputPath = path.join(this.outputDir, `final_reel_${Date.now()}.mp4`);
    const fontPath = this.getFontPath();

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Input 0: Original Video (Contains Audio)
      command.input(this.formatPath(soraVideoPath));

      // Input 1: QR Code (if exists)
      if (qrPath) {
        command.input(this.formatPath(qrPath));
      }

      const complexFilter = [];
      let lastStream = '0:v';

      // 1. QR Code Overlay (Top Right)
      if (qrPath) {
        complexFilter.push(`[1:v]scale=200:-1[qr]`);
        complexFilter.push(`[${lastStream}][qr]overlay=main_w-overlay_w-30:30[v_qr]`);
        lastStream = 'v_qr';
      }

      // 2. Text Overlay (Bottom Middle) - Timed per scene
      if (scriptData && scriptData.scenes) {
        let currentTime = 0;
        
        const textFilters = scriptData.scenes.map((scene, index) => {
            const text = scene.primary_text || scene.text || "";
            if (!text) return null;

            const safeText = this.sanitizeText(text);
            const startTime = currentTime;
            const endTime = currentTime + (scene.duration || 5);
            currentTime = endTime;

            return `drawtext=fontfile='${fontPath}':text='${safeText}':fontcolor=white:fontsize=50:` +
                   `box=1:boxcolor=black@0.6:boxborderw=20:` +
                   `x=(w-text_w)/2:y=h-(h*0.15):enable='between(t,${startTime},${endTime})'`;
        }).filter(t => t !== null);

        if (textFilters.length > 0) {
            const combinedTextFilter = textFilters.join(',');
            complexFilter.push(`[${lastStream}]${combinedTextFilter}[v_final]`);
            lastStream = 'v_final';
        } else {
            complexFilter.push(`[${lastStream}]null[v_final]`);
            lastStream = 'v_final';
        }
      } else {
         complexFilter.push(`[${lastStream}]null[v_final]`);
         lastStream = 'v_final';
      }

      // --- CRITICAL FIX: Do NOT pass second argument (map) here. 
      // We handle mapping manually in outputOptions.
      command.complexFilter(complexFilter);

      // --- OUTPUT OPTIONS ---
      command.outputOptions([
        '-map [v_final]', // Map the processed video stream from complex filter
        '-map 0:a?',      // Map the AUDIO stream from Input 0. The '?' makes it optional (won't crash if no audio exists)
        '-c:v libx264',   // Re-encode video
        '-c:a aac',       // Re-encode audio to AAC (Standard for MP4)
        '-b:a 192k',      // Audio bitrate
        '-preset medium',
        '-crf 18',
        '-pix_fmt yuv420p'
      ]);

      command
        .output(finalOutputPath)
        .on('start', (cmdLine) => console.log('   ℹ️ FFmpeg command:', cmdLine)) // Log command for debugging
        .on('end', () => {
          console.log('   ✅ Final video ready:', finalOutputPath);
          resolve({ success: true, path: finalOutputPath });
        })
        .on('error', (err) => {
          console.error('   ❌ FFmpeg error:', err.message);
          reject(err);
        })
        .run();
    });
  }
}

module.exports = new FfmpegService();