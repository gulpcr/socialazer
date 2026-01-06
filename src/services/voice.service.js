const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
      console.log('🗣️ Starting Scene-by-Scene Voiceover Generation...');

      // 1. Validation
      if (!this.apiKey || !this.voiceId) {
        console.warn('⚠️ Missing ElevenLabs API Key or Voice ID in .env. Skipping voiceover.');
        return null;
      }

      // 2. Clean Slate: Remove existing directory and recreate
      if (fs.existsSync(this.audioDir)) {
        fs.rmSync(this.audioDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.audioDir, { recursive: true });

      // 3. Extract voiceover text from script (handle both formats)
      let scenesWithVoiceover = [];

      // NEW FORMAT: scenes array
      if (scriptData.scenes && Array.isArray(scriptData.scenes)) {
        console.log('   📝 Processing NEW script format (scenes)...');
        scenesWithVoiceover = scriptData.scenes
          .map((scene, index) => ({
            index,
            text: scene.voiceOver?.trim() || '',
            duration: scene.duration || 5
          }))
          .filter(scene => scene.text.length > 0);
      }
      // OLD FORMAT: elements array
      else if (scriptData.elements && Array.isArray(scriptData.elements)) {
        console.log('   📝 Processing OLD script format (elements)...');
        scenesWithVoiceover = scriptData.elements
          .filter(el => el.type === 'audio' || el.type === 'voiceover')
          .map((el, index) => ({
            index,
            text: (el.source || el.text || '').trim(),
            duration: el.duration || 5
          }))
          .filter(scene => scene.text.length > 0);
      }
      else {
        throw new Error('Invalid script data: No scenes or elements found.');
      }

      if (scenesWithVoiceover.length === 0) {
        console.log('ℹ️ No voiceover elements found in script. Skipping.');
        return null;
      }

      console.log(`   🎤 Generating ${scenesWithVoiceover.length} separate voiceover files...`);

      // 4. Generate voiceover for EACH scene separately
      const generatedFiles = [];

      for (let i = 0; i < scenesWithVoiceover.length; i++) {
        const scene = scenesWithVoiceover[i];
        const sceneNum = scene.index + 1;
        const filename = `scene_${sceneNum}.mp3`;
        const outputPath = path.join(this.audioDir, filename);

        console.log(`   🎙️  Scene ${sceneNum}: "${scene.text.substring(0, 40)}..."`);

        try {
          // Call ElevenLabs API for this scene
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
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
              }
            },
            responseType: 'stream',
            timeout: 30000 // 30 second timeout
          });

          // Save to file
          await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(outputPath);
            response.data.pipe(writer);

            writer.on('finish', () => {
              console.log(`      ✅ Saved: ${filename}`);
              generatedFiles.push({
                sceneIndex: scene.index,
                filename,
                path: outputPath,
                text: scene.text,
                duration: scene.duration
              });
              resolve();
            });

            writer.on('error', reject);
          });

          // Small delay between API calls to avoid rate limiting
          if (i < scenesWithVoiceover.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          console.error(`      ❌ Failed to generate voiceover for scene ${sceneNum}:`, error.message);
          // Continue with other scenes even if one fails
        }
      }

      if (generatedFiles.length === 0) {
        console.error('❌ No voiceover files were generated successfully');
        return null;
      }

      console.log(`✅ Generated ${generatedFiles.length} voiceover files successfully`);

      return {
        success: true,
        audioDir: this.audioDir,
        files: generatedFiles,
        totalFiles: generatedFiles.length
      };

    } catch (error) {
      console.error('❌ Voiceover Generation Failed:', error.response?.data || error.message);
      // We don't throw here, we return null so the video can still be made without voice
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