// src/services/ffmpeg.service.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');

let ffmpegPath = 'ffmpeg';
let ffprobePath = 'ffprobe';

try {
  ffmpegPath = require('ffmpeg-static');
  console.log('✅ Using ffmpeg-static');
} catch (e) {
  console.log('ℹ️ Using system ffmpeg');
}

try {
  ffprobePath = require('ffprobe-static').path;
  console.log('✅ Using ffprobe-static');
} catch (e) {
  console.log('ℹ️ Using system ffprobe');
}

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * HIGH QUALITY VIDEO SETTINGS
 */
const VIDEO_CONFIG = {
  // Output resolution (9:16 vertical video)
  width: 1080,
  height: 1920,
  
  // Quality settings
  videoBitrate: '8000k',      // Increased from 5000k
  maxBitrate: '12000k',       // VBR max
  bufferSize: '16000k',       // Buffer for quality
  crf: 18,                    // Constant Rate Factor (lower = better, 18-23 is good)
  preset: 'slow',             // Encoding preset (slower = better quality)
  
  // Audio settings
  audioBitrate: '256k',       // Increased from 192k
  audioSampleRate: 48000,     // Increased from 44100
  
  // Frame rate
  fps: 30,
  
  // Scaling algorithm for best quality
  scaleAlgorithm: 'lanczos',  // Best quality scaling
  
  // Zoompan settings
  zoomIncrement: 0.0003,      // Subtle zoom for Ken Burns effect
};

class FfmpegService {
  constructor() {
    this.imagesDir = path.join(__dirname, '../assets/images');
    this.audioDir = path.join(__dirname, '../assets/audio');
    this.musicDir = path.join(__dirname, '../assets/music');
    this.qrDir = path.join(__dirname, '../assets/qr');
    this.outputDir = path.join(__dirname, '../assets/videos');
    this.scrapedCsvPath = path.join(__dirname, '../scraped.csv');
  }

  formatPath(filePath) {
    return filePath.replace(/\\/g, '/');
  }

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
                resolve(parsed.branding?.brandName || parsed.brandName || 'VISIT US');
              } catch (e) { 
                resolve('VISIT US'); 
              }
            } else { 
              resolve('VISIT US'); 
            }
          }
        });
      });
    } catch (e) { 
      return 'VISIT US'; 
    }
  }

  getAllAudioFiles() {
    if (!fs.existsSync(this.audioDir)) return [];
    
    return fs.readdirSync(this.audioDir)
      .filter(f => f.endsWith('.mp3') && f.match(/scene_\d+\.mp3/))
      .sort((a, b) => {
        const numA = parseInt(a.match(/scene_(\d+)/)?.[1] || 0);
        const numB = parseInt(b.match(/scene_(\d+)/)?.[1] || 0);
        return numA - numB;
      })
      .map(f => path.join(this.audioDir, f));
  }

  getBackgroundMusicPath() {
    if (!fs.existsSync(this.musicDir)) return null;
    
    const musicFiles = fs.readdirSync(this.musicDir)
      .filter(f => f.match(/\.(mp3|wav|m4a|aac)$/i));
    
    return musicFiles.length > 0 ? path.join(this.musicDir, musicFiles[0]) : null;
  }

  getAudioDuration(filePath) {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        resolve(err ? 0 : metadata.format.duration || 0);
      });
    });
  }

  async getAllAudioDurations(audioFiles) {
    const durations = [];
    for (let i = 0; i < audioFiles.length; i++) {
      const duration = await this.getAudioDuration(audioFiles[i]);
      durations.push(duration);
      console.log(`      Scene ${i + 1}: ${duration.toFixed(2)}s`);
    }
    return durations;
  }

  /**
   * Get image dimensions using ffprobe
   */
  getImageDimensions(imagePath) {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(imagePath, (err, metadata) => {
        if (err || !metadata.streams?.[0]) {
          resolve({ width: 0, height: 0 });
        } else {
          resolve({
            width: metadata.streams[0].width || 0,
            height: metadata.streams[0].height || 0
          });
        }
      });
    });
  }

  /**
   * HIGH QUALITY VIDEO CREATION
   */
  async createVideo(config) {
    console.log('🎬 Starting HIGH QUALITY Video Composition...');
    console.log(`   📐 Output: ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height}`);
    console.log(`   🎞️ Quality: CRF ${VIDEO_CONFIG.crf}, ${VIDEO_CONFIG.videoBitrate}`);

    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    
    const outputPath = path.join(this.outputDir, 'output.mp4');
    const images = this.getSortedImages();
    const audioFiles = this.getAllAudioFiles();
    const bgMusicPath = this.getBackgroundMusicPath();
    const qrPath = this.getQrPath();
    const brandName = await this.getBrandName();

    if (images.length === 0) throw new Error('No images found.');

    // Log image dimensions
    console.log('   📸 Checking source image quality...');
    for (const img of images.slice(0, 3)) {
      const dims = await this.getImageDimensions(img);
      console.log(`      ${path.basename(img)}: ${dims.width}x${dims.height}`);
    }

    // Calculate durations
    let totalAudioDuration = 0;
    let audioDurations = [];
    
    if (audioFiles.length > 0) {
      console.log(`   🎤 Analyzing voiceover durations...`);
      audioDurations = await this.getAllAudioDurations(audioFiles);
      totalAudioDuration = audioDurations.reduce((sum, dur) => sum + dur, 0);
    }

    const endCardDuration = 5;
    const slideshowDuration = totalAudioDuration > 0 ? totalAudioDuration : (config.duration || 25) - endCardDuration;
    const totalVideoDuration = slideshowDuration + endCardDuration;
    const durationPerImage = slideshowDuration / images.length;
    const framesPerImage = Math.ceil(durationPerImage * VIDEO_CONFIG.fps);

    console.log(`   ⏱️ Slideshow: ${slideshowDuration.toFixed(2)}s | End Card: ${endCardDuration}s`);
    console.log(`   🎞️ ${images.length} scenes x ${durationPerImage.toFixed(2)}s`);

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Add inputs
      images.forEach(img => command.input(this.formatPath(img)));
      if (qrPath) command.input(this.formatPath(qrPath));
      audioFiles.forEach(a => command.input(this.formatPath(a)));
      if (bgMusicPath) command.input(this.formatPath(bgMusicPath));

      const filterComplex = [];
      const videoStreams = [];
      const { width, height, fps, scaleAlgorithm, zoomIncrement } = VIDEO_CONFIG;

      /**
       * HIGH QUALITY IMAGE PROCESSING
       * 
       * Pipeline for each image:
       * 1. Scale to 4K intermediate (preserves quality)
       * 2. Create blurred background
       * 3. Scale foreground with best algorithm
       * 4. Composite
       * 5. Apply subtle zoom (Ken Burns)
       * 6. Final scale to output resolution
       */
      images.forEach((_, i) => {
        filterComplex.push(
          // Split into background and foreground
          `[${i}:v]split=2[bg${i}][fg${i}];` +
          
          // Background: scale up, crop to fill, apply blur
          `[bg${i}]scale=4320:7680:flags=${scaleAlgorithm}:force_original_aspect_ratio=increase,` +
          `crop=${width * 2}:${height * 2},` +
          `boxblur=30:15[bg_blur${i}];` +
          
          // Foreground: scale to fit with high quality
          `[fg${i}]scale=${width * 2}:${height * 2}:flags=${scaleAlgorithm}:force_original_aspect_ratio=decrease[fg_scale${i}];` +
          
          // Composite foreground over blurred background
          `[bg_blur${i}][fg_scale${i}]overlay=(W-w)/2:(H-h)/2[composed${i}];` +
          
          // Apply subtle zoom (Ken Burns effect) with high quality
          `[composed${i}]zoompan=z='zoom+${zoomIncrement}':d=${framesPerImage}:` +
          `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps},` +
          `setsar=1[v${i}]`
        );
        videoStreams.push(`[v${i}]`);
      });

      // End Card with brand name
      const safeBrandName = brandName.replace(/:/g, '\\:').replace(/'/g, '').replace(/"/g, '');
      let fontPath = '';
      if (process.platform === 'win32') {
        fontPath = ':fontfile=C\\\\:/Windows/Fonts/arial.ttf';
      }
      
      filterComplex.push(
        `color=c=black:s=${width}x${height}:d=${endCardDuration},fps=${fps}[black_bg];` +
        `[black_bg]drawtext=text='${safeBrandName}':fontcolor=white:fontsize=90:` +
        `x=(w-text_w)/2:y=(h-text_h)/2${fontPath}[end_card]`
      );
      videoStreams.push(`[end_card]`);

      // Concatenate all video streams
      filterComplex.push(
        `${videoStreams.join('')}concat=n=${images.length + 1}:v=1:a=0[base_video]`
      );

      let lastVideoNode = '[base_video]';

      // QR Code Overlay (high quality)
      if (qrPath) {
        const qrIndex = images.length;
        filterComplex.push(
          `[${qrIndex}:v]scale=250:-1:flags=${scaleAlgorithm}[qr];` +
          `[base_video][qr]overlay=main_w-overlay_w-50:50[video_with_qr]`
        );
        lastVideoNode = '[video_with_qr]';
      }

      // Audio processing
      const audioInputStartIndex = images.length + (qrPath ? 1 : 0);
      const bgMusicInputIndex = audioInputStartIndex + audioFiles.length;
      const hasVoiceover = audioFiles.length > 0;
      const hasBgMusic = bgMusicPath !== null;

      if (hasVoiceover) {
        console.log(`   🎙️ Processing ${audioFiles.length} voiceovers...`);
        
        audioFiles.forEach((_, i) => {
          const idx = audioInputStartIndex + i;
          filterComplex.push(
            `[${idx}:a]silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB,` +
            `areverse,silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB,areverse,` +
            `volume=1.5,aformat=sample_fmts=fltp:sample_rates=${VIDEO_CONFIG.audioSampleRate}:channel_layouts=stereo[a${i}]`
          );
        });

        const voStreams = audioFiles.map((_, i) => `[a${i}]`).join('');
        filterComplex.push(`${voStreams}concat=n=${audioFiles.length}:v=0:a=1[voiceover_seamless]`);
        filterComplex.push(`anullsrc=channel_layout=stereo:sample_rate=${VIDEO_CONFIG.audioSampleRate}:duration=${endCardDuration}[end_silence]`);
        filterComplex.push(`[voiceover_seamless][end_silence]concat=n=2:v=0:a=1[voiceover_track]`);
      }

      if (hasBgMusic) {
        console.log(`   🎵 Adding background music...`);
        filterComplex.push(
          `[${bgMusicInputIndex}:a]aloop=loop=-1:size=2e+09,atrim=0:${totalVideoDuration},` +
          `asetpts=PTS-STARTPTS,volume=0.15[bg_music_loop]`
        );

        if (hasVoiceover) {
          filterComplex.push(
            `[bg_music_loop][voiceover_track]sidechaincompress=threshold=0.02:ratio=4:attack=200:release=1000[bg_ducked];` +
            `[voiceover_track][bg_ducked]amix=inputs=2:duration=longest:weights=1.0 0.8[final_audio]`
          );
        } else {
          filterComplex.push(`[bg_music_loop]acopy[final_audio]`);
        }
      } else if (hasVoiceover) {
        filterComplex.push(`[voiceover_track]acopy[final_audio]`);
      }

      command.complexFilter(filterComplex);

      /**
       * HIGH QUALITY OUTPUT OPTIONS
       */
      const outputOptions = [
        '-y',
        '-map', lastVideoNode,
        
        // Video codec settings for maximum quality
        '-c:v', 'libx264',
        '-preset', VIDEO_CONFIG.preset,
        '-crf', VIDEO_CONFIG.crf.toString(),
        '-b:v', VIDEO_CONFIG.videoBitrate,
        '-maxrate', VIDEO_CONFIG.maxBitrate,
        '-bufsize', VIDEO_CONFIG.bufferSize,
        
        // Pixel format for compatibility
        '-pix_fmt', 'yuv420p',
        
        // Frame rate
        '-r', VIDEO_CONFIG.fps.toString(),
        
        // Duration
        '-t', totalVideoDuration.toString(),
        
        // Additional quality flags
        '-movflags', '+faststart',  // Web optimization
        '-profile:v', 'high',        // H.264 profile
        '-level', '4.1',             // H.264 level
      ];

      if (hasVoiceover || hasBgMusic) {
        outputOptions.push('-map', '[final_audio]');
        outputOptions.push(
          '-c:a', 'aac',
          '-b:a', VIDEO_CONFIG.audioBitrate,
          '-ar', VIDEO_CONFIG.audioSampleRate.toString(),
          '-ac', '2'
        );
      }

      command.outputOptions(outputOptions);

      command
        .on('start', (cmd) => {
          console.log('   ℹ️ FFmpeg started with high-quality settings');
          // Uncomment to debug: console.log(cmd);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r   ⏳ Rendering: ${Math.floor(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`\n✅ HIGH QUALITY Video Rendered!`);
          console.log(`   📂 Output: ${outputPath}`);
          console.log(`   📐 Resolution: ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height}`);
          console.log(`   ⏱️ Duration: ${totalVideoDuration.toFixed(2)}s`);
          console.log(`   🎞️ Bitrate: ${VIDEO_CONFIG.videoBitrate}`);
          resolve({ success: true, path: outputPath });
        })
        .on('error', (err) => {
          console.error('\n❌ FFmpeg Error:', err.message);
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

  getQrPath() {
    if (!fs.existsSync(this.qrDir)) return null;
    const files = fs.readdirSync(this.qrDir).filter(f => f.endsWith('.png'));
    return files.length > 0 ? path.join(this.qrDir, files[0]) : null;
  }
}

module.exports = new FfmpegService();