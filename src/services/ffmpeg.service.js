// src/services/ffmpeg.service.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');

let ffmpegPath = 'ffmpeg';
let ffprobePath = 'ffprobe';

// Setup FFmpeg Binaries
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
                
                if (parsed.branding && parsed.branding.brandName) {
                  resolve(parsed.branding.brandName);
                } else if (parsed.brandName) {
                  resolve(parsed.brandName);
                } else {
                  resolve('VISIT US');
                }
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

  /**
   * Get all scene audio files sorted by scene number
   */
  getAllAudioFiles() {
    if (!fs.existsSync(this.audioDir)) return [];
    
    const audioFiles = fs.readdirSync(this.audioDir)
      .filter(f => f.endsWith('.mp3') && f.match(/scene_\d+\.mp3/))
      .sort((a, b) => {
        const numA = parseInt(a.match(/scene_(\d+)/)?.[1] || 0);
        const numB = parseInt(b.match(/scene_(\d+)/)?.[1] || 0);
        return numA - numB;
      })
      .map(f => path.join(this.audioDir, f));
    
    console.log(`   🎤 Found ${audioFiles.length} scene audio files`);
    return audioFiles;
  }

  /**
   * Get background music file
   */
  getBackgroundMusicPath() {
    if (!fs.existsSync(this.musicDir)) {
      console.log('   ℹ️ No music directory found, skipping background music');
      return null;
    }
    
    const musicFiles = fs.readdirSync(this.musicDir)
      .filter(f => f.match(/\.(mp3|wav|m4a|aac)$/i));
    
    if (musicFiles.length === 0) {
      console.log('   ℹ️ No music files found, skipping background music');
      return null;
    }
    
    const musicPath = path.join(this.musicDir, musicFiles[0]);
    console.log(`   🎵 Found background music: ${musicFiles[0]}`);
    return musicPath;
  }

  /**
   * Get exact audio duration using ffprobe
   */
  getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return resolve(0);
        resolve(metadata.format.duration || 0);
      });
    });
  }

  /**
   * NEW: Get durations of all audio files
   */
  async getAllAudioDurations(audioFiles) {
    const durations = [];
    
    for (let i = 0; i < audioFiles.length; i++) {
      const duration = await this.getAudioDuration(audioFiles[i]);
      durations.push(duration);
      console.log(`      Scene ${i + 1}: ${duration.toFixed(2)}s`);
    }
    
    return durations;
  }

  async createVideo(config) {
    console.log('🎬 Starting Professional Video Composition...');

    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    
    const outputPath = path.join(this.outputDir, 'output.mp4');
    const images = this.getSortedImages();
    const audioFiles = this.getAllAudioFiles();
    const bgMusicPath = this.getBackgroundMusicPath();
    const qrPath = this.getQrPath();
    const brandName = await this.getBrandName();

    if (images.length === 0) throw new Error('No images found.');

    // NEW APPROACH: Audio duration drives video length
    let totalAudioDuration = 0;
    let audioDurations = [];
    
    if (audioFiles.length > 0) {
      console.log(`   🎤 Analyzing voiceover durations...`);
      audioDurations = await this.getAllAudioDurations(audioFiles);
      totalAudioDuration = audioDurations.reduce((sum, dur) => sum + dur, 0);
      console.log(`   📊 Total Voiceover: ${totalAudioDuration.toFixed(2)}s`);
    }

    // Calculate durations
    const endCardDuration = 5;
    const slideshowDuration = totalAudioDuration > 0 ? totalAudioDuration : (config.duration || 25) - endCardDuration;
    const totalVideoDuration = slideshowDuration + endCardDuration;
    
    // Divide slideshow duration evenly among images
    const durationPerImage = slideshowDuration / images.length;
    const framesPerImage = Math.ceil(durationPerImage * 30);

    console.log(`   ⏱️ Slideshow: ${slideshowDuration.toFixed(2)}s (audio-driven)`);
    console.log(`   ⏱️ End Card: ${endCardDuration}s`);
    console.log(`   🎞️ Total Video: ${totalVideoDuration.toFixed(2)}s`);
    console.log(`   📸 ${images.length} scenes x ${durationPerImage.toFixed(2)}s each`);

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Add image inputs
      images.forEach(img => command.input(this.formatPath(img)));
      
      // Add QR input
      if (qrPath) command.input(this.formatPath(qrPath));
      
      // Add all audio inputs
      audioFiles.forEach(audioFile => command.input(this.formatPath(audioFile)));
      
      // Add background music input
      if (bgMusicPath) command.input(this.formatPath(bgMusicPath));

      const filterComplex = [];
      const videoStreams = [];

      // Process Images (Slideshow) - each image gets equal time
      images.forEach((_, i) => {
        filterComplex.push(
          `[${i}:v]split=2 [bg${i}] [fg${i}];` +
          `[bg${i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:10 [bg_blurred${i}];` +
          `[fg${i}]scale=1080:1920:force_original_aspect_ratio=decrease [fg_scaled${i}];` +
          `[bg_blurred${i}][fg_scaled${i}]overlay=(W-w)/2:(H-h)/2 [composed${i}];` +
          `[composed${i}]scale=2160:3840 [highres${i}];` +
          `[highres${i}]zoompan=z=zoom+0.0005:d=${framesPerImage}:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2):s=1080x1920:fps=30,setsar=1 [v${i}]`
        );
        videoStreams.push(`[v${i}]`);
      });

      // Create End Card
      const safeBrandName = brandName.replace(/:/g, '\\:').replace(/'/g, '');
      let fontPath = '';
      if (process.platform === 'win32') {
        fontPath = ':fontfile=C\\\\:/Windows/Fonts/arial.ttf';
      }
      
      filterComplex.push(
        `color=c=black:s=1080x1920:d=${endCardDuration} [black_bg];` +
        `[black_bg]drawtext=text='${safeBrandName}':fontcolor=white:fontsize=90:x=(w-text_w)/2:y=(h-text_h)/2${fontPath} [end_card]`
      );
      videoStreams.push(`[end_card]`);

      // Concatenate video
      filterComplex.push(
        `${videoStreams.join('')}concat=n=${images.length + 1}:v=1:a=0 [base_video]`
      );

      let lastVideoNode = '[base_video]';

      // Overlay QR Code
      if (qrPath) {
        const qrIndex = images.length;
        filterComplex.push(
          `[${qrIndex}:v]scale=200:-1 [qr];` +
          `[base_video][qr]overlay=main_w-overlay_w-50:50 [video_with_qr]`
        );
        lastVideoNode = '[video_with_qr]';
      }

      // Calculate audio input indices
      const audioInputStartIndex = images.length + (qrPath ? 1 : 0);
      const bgMusicInputIndex = audioInputStartIndex + audioFiles.length;

      const hasVoiceover = audioFiles.length > 0;
      const hasBgMusic = bgMusicPath !== null;

      // NEW: Sequential Voiceover Processing (NO trimming, NO gaps)
      if (hasVoiceover) {
        console.log(`   🎙️ Concatenating ${audioFiles.length} voiceovers sequentially...`);
        
        // Process each audio file: normalize volume and ensure no silence at start/end
        audioFiles.forEach((_, i) => {
          const audioInputIndex = audioInputStartIndex + i;
          
          // Trim silence from start/end, boost volume, ensure consistent format
          filterComplex.push(
            `[${audioInputIndex}:a]` +
            `silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB,` + // Remove silence at start
            `areverse,` + // Reverse to remove silence at end
            `silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB,` + // Remove silence (from end)
            `areverse,` + // Reverse back
            `volume=1.5,` + // Boost volume
            `aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo` + // Normalize format
            `[a${i}]`
          );
        });

        // Concatenate ALL voiceovers with NO gaps
        const voiceoverStreams = audioFiles.map((_, i) => `[a${i}]`).join('');
        filterComplex.push(
          `${voiceoverStreams}concat=n=${audioFiles.length}:v=0:a=1[voiceover_seamless]`
        );

        // Add silence for end card
        filterComplex.push(
          `anullsrc=channel_layout=stereo:sample_rate=44100:duration=${endCardDuration}[end_silence]`
        );

        // Concatenate voiceover + end card silence
        filterComplex.push(
          `[voiceover_seamless][end_silence]concat=n=2:v=0:a=1[voiceover_track]`
        );
      }

      // Process Background Music
      if (hasBgMusic) {
        console.log(`   🎵 Adding background music with ducking...`);
        
        // Loop music to match video duration, reduce volume
        filterComplex.push(
          `[${bgMusicInputIndex}:a]aloop=loop=-1:size=2e+09,` +
          `atrim=0:${totalVideoDuration},` +
          `asetpts=PTS-STARTPTS,` +
          `volume=0.15[bg_music_loop]`
        );

        if (hasVoiceover) {
          // Mix voiceover with music, ducking music when voice plays
          filterComplex.push(
            `[bg_music_loop][voiceover_track]sidechaincompress=threshold=0.02:ratio=4:attack=200:release=1000[bg_music_ducked];` +
            `[voiceover_track][bg_music_ducked]amix=inputs=2:duration=longest:weights=1.0 0.8[final_audio]`
          );
        } else {
          // No voiceover, just use background music
          filterComplex.push(
            `[bg_music_loop]acopy[final_audio]`
          );
        }
      } else if (hasVoiceover) {
        // Voiceover only, no background music
        filterComplex.push(
          `[voiceover_track]acopy[final_audio]`
        );
      }

      command.complexFilter(filterComplex);

      const outputOptions = [
        '-y',
        '-map', lastVideoNode,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-b:v', '5000k',
        `-t`, `${totalVideoDuration}`
      ];

      if (hasVoiceover || hasBgMusic) {
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
          console.log('   ℹ️ FFmpeg Command constructed.');
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r   ⏳ Rendering: ${Math.floor(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`\n✅ Video Rendered Successfully!`);
          console.log(`   📂 Location: ${outputPath}`);
          console.log(`   ⏱️ Final Duration: ${totalVideoDuration.toFixed(2)}s`);
          console.log(`   🎤 Voiceover: ${totalAudioDuration.toFixed(2)}s (continuous)`);
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

  getQrPath() {
    if (!fs.existsSync(this.qrDir)) return null;
    const files = fs.readdirSync(this.qrDir).filter(f => f.endsWith('.png'));
    return files.length > 0 ? path.join(this.qrDir, files[0]) : null;
  }
}

module.exports = new FfmpegService();