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
   * EXISTING FUNCTION - Generates a single MP3 voiceover file from the script.
   * Supports both NEW format (scenes) and OLD format (elements).
   * Cleans the directory first (POC mode).
   * @param {Object} scriptData - The JSON object from script.service
   */
  async generateVoiceover(scriptData) {
    try {
      console.log('🗣️ Starting Voiceover Generation...');

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
      let voiceParts = [];

      // NEW FORMAT: scenes array
      if (scriptData.scenes && Array.isArray(scriptData.scenes)) {
        console.log('   📝 Processing NEW script format (scenes)...');
        voiceParts = scriptData.scenes
          .filter(scene => scene.voiceOver && scene.voiceOver.trim().length > 0)
          .map(scene => scene.voiceOver.trim());
      }
      // OLD FORMAT: elements array
      else if (scriptData.elements && Array.isArray(scriptData.elements)) {
        console.log('   📝 Processing OLD script format (elements)...');
        voiceParts = scriptData.elements
          .filter(el => el.type === 'audio' || el.type === 'voiceover')
          .map(el => el.source || el.text)
          .filter(text => text && text.trim().length > 0);
      }
      else {
        throw new Error('Invalid script data: No scenes or elements found.');
      }

      if (voiceParts.length === 0) {
        console.log('ℹ️ No voiceover elements found in script. Skipping.');
        return null;
      }

      // Combine all parts into one string for a smooth flow
      const fullText = voiceParts.join(' ');
      console.log(`   Text to generate (${fullText.length} chars): "${fullText.substring(0, 50)}..."`);

      // 4. Call ElevenLabs API
      const outputPath = path.join(this.audioDir, 'voiceover.mp3');
      
      const response = await axios({
        method: 'post',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: {
          text: fullText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        responseType: 'stream'
      });

      // 5. Save to file
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Voiceover saved locally at: ${outputPath}`);
          resolve({
            success: true,
            audioPath: outputPath,
            textUsed: fullText
          });
        });
        writer.on('error', reject);
      });

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
        // Note: ElevenLabs doesn't directly support speed/pitch in the same way
        // You may need to use their voice design API for those features
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

          // In a production environment, you'd want to:
          // 1. Upload to cloud storage (S3, Cloudinary, etc.)
          // 2. Get the public URL
          // For now, we'll return a local path that could be served via Express static

          resolve({
            id: voId,
            audioUrl: `/voiceovers/${filename}`, // Relative URL for serving via Express
            localPath: outputPath, // Absolute local path
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

      // Option 1: Fetch from ElevenLabs API (if you have access)
      // const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      //   headers: { 'xi-api-key': this.apiKey }
      // });
      
      // Option 2: Return predefined presets (more reliable for now)
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
      // Return empty array instead of throwing to prevent API failures
      return [];
    }
  }

  /**
   * Helper function to get audio duration (for future enhancement)
   * Requires ffprobe or similar tool
   */
  async getAudioDuration(filePath) {
    // This would require ffprobe or a similar tool
    // For now, return estimated duration based on file size
    try {
      const stats = fs.statSync(filePath);
      const fileSizeKB = stats.size / 1024;
      return (fileSizeKB / 10) * 0.1; // Rough estimation
    } catch {
      return 0;
    }
  }
}

module.exports = new VoiceService();