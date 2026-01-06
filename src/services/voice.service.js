const axios = require('axios');
const fs = require('fs');
const path = require('path');

class VoiceService {
  constructor() {
    this.audioDir = path.join(__dirname, '../assets/audio');
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID;
  }

  /**
   * Generates a single MP3 voiceover file from the script.
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
}

module.exports = new VoiceService();