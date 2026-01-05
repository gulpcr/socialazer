// src/services/ffmpeg.service.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse'); // Requires: npm install papaparse

let ffmpegPath = 'ffmpeg';
let ffprobePath = 'ffprobe';

// 1. Setup FFmpeg Binaries
try {
  ffmpegPath = require('ffmpeg-static');
  console.log('✅ Using ffmpeg-static');
} catch (e) {
  console.log('ℹ️ ffmpeg-static not found, using system ffmpeg');
}

try {
  ffprobePath = require('ffprobe-static').path;
  console.log('✅ Using ffprobe-static');
} catch (e) {
  console.log('ℹ️ ffprobe-static not found, using system ffprobe');
}

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

class FfmpegService {
  constructor() {
    this.imagesDir = path.join(__dirname, '../assets/images');
    this.audioDir = path.join(__dirname, '../assets/audio');
    this.qrDir = path.join(__dirname, '../assets/qr');
    this.outputDir = path.join(__dirname, '../assets/videos');
    this.scrapedCsvPath = path.join(__dirname, '../scraped.csv');
  }

  formatPath(filePath) {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Reads the Brand Name from scraped.csv to display on the end card
   */
  async getBrandName() {
    try {
      if (!fs.existsSync(this.scrapedCsvPath)) return 'VISIT US';
      const csvContent = fs.readFileSync(this.scrapedCsvPath, 'utf-8');
      
      return new Promise((resolve) => {
        Papa.parse(csvContent, {
          header: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              try {
                const parsed = JSON.parse(results.data[0].data);
                resolve(parsed.brandName || 'VISIT US');
              } catch (e) { resolve('VISIT US'); }
            } else { resolve('VISIT US'); }
          }
        });
      });
    } catch (e) { return 'VISIT US'; }
  }

  /**
   * Get exact audio duration using ffprobe
   */
  getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return resolve(0); // Fallback
        resolve(metadata.format.duration || 0);
      });
    });
  }

  async createVideo(config) {
    console.log('🎬 Starting Professional Video Composition...');

    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    
    const outputPath = path.join(this.outputDir, 'output.mp4');
    const images = this.getSortedImages();
    const audioPath = this.getAudioPath();
    const qrPath = this.getQrPath();
    const brandName = await this.getBrandName();

    if (images.length === 0) throw new Error('No images found.');

    // --- DURATION LOGIC ---
    let slideshowDuration = config.duration || 15;
    let endCardDuration = 3; // Minimum end card length
    let totalAudioDuration = 0;

    if (audioPath) {
        totalAudioDuration = await this.getAudioDuration(audioPath);
        console.log(`   🎤  Audio Duration: ${totalAudioDuration}s`);
        
        // If audio is longer than the configured slideshow, extend the end card
        if (totalAudioDuration > slideshowDuration) {
            endCardDuration = totalAudioDuration - slideshowDuration;
            // Ensure end card isn't too short (at least 2 seconds)
            if (endCardDuration < 2) endCardDuration = 2;
        }
    }

    const totalVideoDuration = slideshowDuration + endCardDuration;
    const durationPerImage = slideshowDuration / images.length;
    const framesPerImage = Math.ceil(durationPerImage * 30); 

    console.log(`   ⏱️  Slideshow: ${slideshowDuration}s | End Card: ${endCardDuration.toFixed(1)}s`);
    console.log(`   🎞️  Total Video: ${totalVideoDuration.toFixed(1)}s`);

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Inputs
      images.forEach(img => command.input(this.formatPath(img)));
      if (qrPath) command.input(this.formatPath(qrPath));
      if (audioPath) command.input(this.formatPath(audioPath));

      const filterComplex = [];
      const videoStreams = [];

      // 1. Process Images (Slideshow)
      images.forEach((_, i) => {
        // FIX: TREMBLING EFFECT
        // We scale to 2160x3840 (2x) BEFORE zoompan. This "supersampling" prevents pixel jitter.
        // We scale back down to 1080x1920 at the end of the chain.
        
        filterComplex.push(
            `[${i}:v]split=2 [bg${i}] [fg${i}];` +
            // Background: Blur
            `[bg${i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:10 [bg_blurred${i}];` +
            // Foreground: Fit
            `[fg${i}]scale=1080:1920:force_original_aspect_ratio=decrease [fg_scaled${i}];` +
            // Compose
            `[bg_blurred${i}][fg_scaled${i}]overlay=(W-w)/2:(H-h)/2 [composed${i}];` +
            // SUPERSAMPLE & ZOOM
            // 1. Scale up 2x
            `[composed${i}]scale=2160:3840 [highres${i}];` +
            // 2. Smooth Zoom on High Res
            `[highres${i}]zoompan=z=zoom+0.0005:d=${framesPerImage}:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2):s=1080x1920:fps=30,setsar=1 [v${i}]`
        );
        videoStreams.push(`[v${i}]`);
      });

      // 2. Create End Card (Black Background + Text)
      // Note: We escape the brandName to prevent FFmpeg syntax errors
      const safeBrandName = brandName.replace(/:/g, '\\:').replace(/'/g, '');
      
      // Determine font file path based on OS (Basic fallback logic)
      // If you are on Windows, we point to Arial. On Linux/Mac, we hope for default or use a generic approach.
      let fontPath = '';
      if (process.platform === 'win32') {
        fontPath = ':fontfile=C\\\\:/Windows/Fonts/arial.ttf';
      } 
      // If not windows, we omit fontfile and rely on FFmpeg default, or you can specify a path
      
      filterComplex.push(
        `color=c=black:s=1080x1920:d=${endCardDuration} [black_bg];` +
        `[black_bg]drawtext=text='${safeBrandName}':fontcolor=white:fontsize=90:x=(w-text_w)/2:y=(h-text_h)/2${fontPath} [end_card]`
      );
      videoStreams.push(`[end_card]`);

      // 3. Concatenate Slideshow + End Card
      filterComplex.push(
        `${videoStreams.join('')}concat=n=${images.length + 1}:v=1:a=0 [base_video]`
      );

      let lastVideoNode = '[base_video]';

      // 4. Overlay QR Code (Only on the slideshow part? Or whole video? Let's do whole video)
      if (qrPath) {
        const qrIndex = images.length;
        filterComplex.push(
            `[${qrIndex}:v]scale=200:-1 [qr];` +
            `[base_video][qr]overlay=main_w-overlay_w-50:50 [video_with_qr]`
        );
        lastVideoNode = '[video_with_qr]';
      }

      // 5. Audio Handling
      if (audioPath) {
        const audioIndex = qrPath ? images.length + 1 : images.length;
        // We use 'apad' to ensure audio stream doesn't cut short, 
        // but we also rely on '-shortest' in output options combined with the calculated video length
        filterComplex.push(`[${audioIndex}:a]volume=1.5,apad [final_audio]`);
      }

      command.complexFilter(filterComplex);

      const outputOptions = [
        '-y',
        '-map', lastVideoNode,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-b:v', '5000k',
        // We do NOT use -shortest here because we want the video to fully play out the end card
        // We set exact time instead
        `-t`, `${totalVideoDuration}`
      ];

      if (audioPath) {
        outputOptions.push('-map', '[final_audio]');
        command
            .audioCodec('aac')
            .audioBitrate('192k')
            .audioFrequency(44100)
            .audioChannels(2);
      }

      command.outputOptions(outputOptions);

      command
        .on('start', (cmdLine) => {
            console.log('   ℹ️  FFmpeg Command constructed.');
        })
        .on('end', () => {
            console.log(`\n✅ Video Rendered Successfully!`);
            console.log(`   📂 Location: ${outputPath}`);
            resolve({ success: true, path: outputPath });
        })
        .on('error', (err) => {
            console.error('❌ FFmpeg Error:', err.message);
            reject(err);
        })
        .save(outputPath);
    });
  }

  getSortedImages() {
    if (!fs.existsSync(this.imagesDir)) return [];
    return fs.readdirSync(this.imagesDir)
      .filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/) || 0);
        const numB = parseInt(b.match(/\d+/) || 0);
        return numA - numB;
      })
      .map(f => path.join(this.imagesDir, f));
  }

  getAudioPath() {
    if (!fs.existsSync(this.audioDir)) return null;
    const files = fs.readdirSync(this.audioDir).filter(f => f.endsWith('.mp3'));
    return files.length > 0 ? path.join(this.audioDir, files[0]) : null;
  }

  getQrPath() {
    if (!fs.existsSync(this.qrDir)) return null;
    const files = fs.readdirSync(this.qrDir).filter(f => f.endsWith('.png'));
    return files.length > 0 ? path.join(this.qrDir, files[0]) : null;
  }
}

module.exports = new FfmpegService();