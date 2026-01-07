// src/services/voice.service.js
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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


class VoiceService {
  constructor() {
    this.audioDir = path.join(__dirname, '../assets/audio');
    this.voiceoverDir = path.join(__dirname, '../assets/voiceovers'); // New directory for API voiceovers
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID;
  }

  /**
   * UPDATED FUNCTION - Generates SEPARATE MP3 files for EACH scene
   * This ensures perfect sync and allows voiceover to play throughout the entire video
   * Supports both NEW format (scenes) and OLD format (elements).
   * Cleans the directory first (POC mode).
   * @param {Object} scriptData - The JSON object from script.service
   */

  async generateVoiceover(scriptData) {
    try {
      console.log('🗣️ Starting Voiceover Generation & Merge...');

      if (!this.apiKey || !this.voiceId) {
        console.warn('⚠️ Missing ElevenLabs API Key or Voice ID.');
        return null;
      }

      // 1. Clean Slate
      if (fs.existsSync(this.audioDir)) {
        fs.rmSync(this.audioDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.audioDir, { recursive: true });

      // 2. Extract Scenes
      let scenesWithVoiceover = [];
      if (scriptData.scenes && Array.isArray(scriptData.scenes)) {
        scenesWithVoiceover = scriptData.scenes
          .map((scene, index) => ({
            index,
            text: scene.voiceOver?.trim() || '',
            duration: scene.duration || 5
          }))
          .filter(scene => scene.text.length > 0);
      } else if (scriptData.elements && Array.isArray(scriptData.elements)) {
        scenesWithVoiceover = scriptData.elements
          .filter(el => el.type === 'audio' || el.type === 'voiceover')
          .map((el, index) => ({
            index,
            text: (el.source || el.text || '').trim(),
            duration: el.duration || 5
          }))
          .filter(scene => scene.text.length > 0);
      } else {
        console.warn('⚠️ No scenes found in script data.');
        return null;
      }

      if (scenesWithVoiceover.length === 0) return null;

      // 3. Generate Individual Files
      const generatedFiles = [];
      console.log(`   🎤 Generating ${scenesWithVoiceover.length} audio clips...`);

      for (let i = 0; i < scenesWithVoiceover.length; i++) {
        const scene = scenesWithVoiceover[i];
        const filename = `scene_${scene.index + 1}.mp3`;
        const outputPath = path.join(this.audioDir, filename);

        try {
          const response = await axios({
            method: 'post',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': this.apiKey,
              'Content-Type': 'application/json'
            },
            data: {
              text: scene.text,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            },
            responseType: 'stream'
          });

          await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(outputPath);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          generatedFiles.push(outputPath);
          // Small delay to be polite to the API
          await new Promise(r => setTimeout(r, 250));

        } catch (error) {
          console.error(`      ❌ Failed scene ${scene.index + 1}:`, error.message);
        }
      }

      if (generatedFiles.length === 0) return null;

      // 4. Merge into a single file using FFmpeg
      console.log('   🔗 Merging audio files into single track...');
      const mergedOutputPath = path.join(this.audioDir, 'full_voiceover.mp3');

      await new Promise((resolve, reject) => {
        // 'ffmpeg' is used here, ensuring the import above is active
        const command = ffmpeg(); 
        generatedFiles.forEach(file => command.input(file));
        
        command
          .on('error', (err) => reject(new Error(`Merge failed: ${err.message}`)))
          .on('end', () => {
            console.log('   ✅ Audio merge complete.');
            resolve();
          })
          .mergeToFile(mergedOutputPath, this.audioDir);
      });

      return {
        success: true,
        singleAudioPath: mergedOutputPath,
        files: generatedFiles
      };

    } catch (error) {
      console.error('❌ Voiceover Generation Failed:', error.message);
      return null;
    }
  }

  /**
   * NEW FUNCTION - Generate voiceover from custom text with settings
   * @param {Object} params - Generation parameters
   * @param {string} params.text - Text to convert to speech
   * @param {string} params.voiceId - Voice ID to use
   * @param {string} params.provider - Provider (elevenlabs, etc.)
   * @param {Object} params.settings - Voice settings
   */
  async generateVoiceoverFromText({ text, voiceId, provider = 'elevenlabs', settings = {} }) {
    try {
      console.log('🎙️ Generating custom voiceover...');

      // Validation
      if (!text || text.trim().length === 0) {
        throw new Error('Text is required for voiceover generation');
      }

      if (!this.apiKey) {
        throw new Error('ELEVENLABS_API_KEY is missing from environment variables');
      }

      // Ensure voiceover directory exists
      if (!fs.existsSync(this.voiceoverDir)) {
        fs.mkdirSync(this.voiceoverDir, { recursive: true });
      }

      // Generate unique ID and filename
      const voId = `vo_${uuidv4().split('-')[0]}`;
      const filename = `${voId}.mp3`;
      const outputPath = path.join(this.voiceoverDir, filename);

      // Resolve voice ID (use provided or default)
      const finalVoiceId = voiceId || this.voiceId;
      if (!finalVoiceId) {
        throw new Error('Voice ID is required');
      }

      // Prepare settings with defaults
      const voiceSettings = {
        stability: settings.stability || 0.75,
        similarity_boost: settings.clarity || 0.85,
      };

      console.log(`   Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      console.log(`   Voice ID: ${finalVoiceId}`);
      console.log(`   Provider: ${provider}`);

      // Call ElevenLabs API
      const response = await axios({
        method: 'post',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: {
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: voiceSettings
        },
        responseType: 'stream'
      });

      // Save to file
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', async () => {
          console.log(`✅ Voiceover saved: ${filename}`);

          // Get file stats for duration estimation
          const stats = fs.statSync(outputPath);
          const fileSizeKB = stats.size / 1024;
          
          // Rough estimation: ~1KB per 0.1 seconds of audio at 128kbps
          const estimatedDuration = (fileSizeKB / 10) * 0.1;

          resolve({
            id: voId,
            audioUrl: `/voiceovers/${filename}`,
            localPath: outputPath,
            duration: parseFloat(estimatedDuration.toFixed(2)),
            format: 'mp3',
            sampleRate: 44100,
            provider: provider,
            voiceId: finalVoiceId,
            text: text,
            createdAt: new Date().toISOString()
          });
        });

        writer.on('error', (error) => {
          console.error('❌ Error saving voiceover:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Custom Voiceover Generation Failed:', error.response?.data || error.message);
      throw new Error(`Failed to generate voiceover: ${error.message}`);
    }
  }

  /**
   * NEW FUNCTION - Get available voice presets
   * @returns {Array} List of voice presets
   */
  async getVoicePresets() {
    try {
      console.log('🎭 Fetching voice presets...');
      
      const presets = [
        {
          id: '21m00Tcm4TlvDq8ikWAM',
          name: 'Rachel - Professional Female',
          gender: 'female',
          language: 'en-US',
          provider: 'elevenlabs',
          previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/e23eeb6f-7799-4c82-9eda-c99c54c0a555.mp3',
          tags: ['professional', 'clear', 'articulate'],
          description: 'Clear and professional voice, perfect for business content'
        },
        {
          id: 'AZnzlk1XvdvUeBnXmlld',
          name: 'Domi - Confident Male',
          gender: 'male',
          language: 'en-US',
          provider: 'elevenlabs',
          previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/AZnzlk1XvdvUeBnXmlld/35734112-7b72-48df-bc2b-64d245dca524.mp3',
          tags: ['confident', 'strong', 'authoritative'],
          description: 'Strong and authoritative voice, great for ads'
        },
        {
          id: 'EXAVITQu4vr4xnSDxMaL',
          name: 'Sarah - Friendly Female',
          gender: 'female',
          language: 'en-US',
          provider: 'elevenlabs',
          previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/f5d11407-eac0-4bc2-b82e-11d0ac9d19d1.mp3',
          tags: ['friendly', 'conversational', 'warm'],
          description: 'Warm and friendly voice, ideal for casual content'
        },
        {
          id: 'ErXwobaYiN019PkySvjV',
          name: 'Antoni - Young Male',
          gender: 'male',
          language: 'en-US',
          provider: 'elevenlabs',
          previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/ErXwobaYiN019PkySvjV/c96ed911-a9c6-4c71-8e7d-7037ed7bb8db.mp3',
          tags: ['young', 'energetic', 'casual'],
          description: 'Youthful and energetic voice for dynamic content'
        },
        {
          id: 'MF3mGyEYCl7XYWbV9V6O',
          name: 'Elli - Expressive Female',
          gender: 'female',
          language: 'en-US',
          provider: 'elevenlabs',
          previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/MF3mGyEYCl7XYWbV9V6O/c8e09a45-c704-45d1-a9ee-a337e5a9c11a.mp3',
          tags: ['expressive', 'emotional', 'versatile'],
          description: 'Highly expressive voice with emotional range'
        },
        {
          id: 'TxGEqnHWrfWFTfGW9XjX',
          name: 'Josh - Deep Male',
          gender: 'male',
          language: 'en-US',
          provider: 'elevenlabs',
          previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TxGEqnHWrfWFTfGW9XjX/c6c80dcd-5fe5-4de1-b7d0-c9835d0de3e1.mp3',
          tags: ['deep', 'narrator', 'storytelling'],
          description: 'Deep, rich voice perfect for narration'
        },
        {
          id: 'pNInz6obpgDQGcFmaJgB',
          name: 'Adam - Conversational Male',
          gender: 'male',
          language: 'en-US',
          provider: 'elevenlabs',
          previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/89e1ff4b-b9a2-477e-af58-dd39ce87c0f8.mp3',
          tags: ['conversational', 'natural', 'relatable'],
          description: 'Natural conversational style for authentic content'
        },
        {
          id: 'yoZ06aMxZJJ28mfd3POQ',
          name: 'Sam - Energetic Neutral',
          gender: 'neutral',
          language: 'en-US',
          provider: 'elevenlabs',
          previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/yoZ06aMxZJJ28mfd3POQ/1c4d417c-ba80-4de8-874a-a1c57987ea63.mp3',
          tags: ['energetic', 'upbeat', 'dynamic'],
          description: 'High-energy voice for exciting announcements'
        }
      ];

      console.log(`✅ Loaded ${presets.length} voice presets`);
      return presets;

    } catch (error) {
      console.error('❌ Failed to fetch voice presets:', error.message);
      return [];
    }
  }

  /**
   * Helper function to get audio duration (for future enhancement)
   */
  async getAudioDuration(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const fileSizeKB = stats.size / 1024;
      return (fileSizeKB / 10) * 0.1;
    } catch {
      return 0;
    }
  }
}

module.exports = new VoiceService();