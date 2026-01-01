const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');

// Use global fetch if available (Node 18+), otherwise use node-fetch
const fetch = globalThis.fetch || require('node-fetch');
require('dotenv').config();

class ReelGenService {
  constructor() {
    this.scriptCsvPath = path.join(__dirname, '../../src/script.csv');
    this.qrCodePath = path.join(__dirname, '../../src/assets/url/url.txt'); 
    this.creatomateApiUrl = 'https://api.creatomate.com/v2/renders';
    this.creatomateApiKey = process.env.CREATOMATE_API_KEY;
    if (!this.creatomateApiKey) {
      throw new Error('CREATOMATE_API_KEY is missing from environment variables (.env)');
    }
  }

  async readScriptCsv() {
    try {
      const csvContent = await fs.readFile(this.scriptCsvPath, 'utf-8');
      return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      throw new Error(`Failed to read script.csv: ${error.message}`);
    }
  }

  async getQrCodeUrl() {
    try {
      await fs.access(this.qrCodePath);
      const url = await fs.readFile(this.qrCodePath, 'utf-8');
      const trimmedUrl = url.trim();
      return trimmedUrl.length > 0 ? trimmedUrl : null;
    } catch (error) {
      console.warn('QR Code file not found or empty, skipping overlay:', error.message);
      return null;
    }
  }

  // Helper: Estimate duration based on word count
  // 0.5s per word = 120 wpm (Clear, slow speech) + 1s buffer
  estimateTextDuration(text) {
    if (!text || typeof text !== 'string') return 5;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.max(5, (wordCount * 0.5) + 0.5);
  }

  convertScriptToCreatomateFormat(generatedScript, qrCodeUrl) {
    try {
      const scriptObj = typeof generatedScript === 'string' 
        ? JSON.parse(generatedScript) 
        : generatedScript;

      const creatomateElements = [];
      
      // 1. GROUP ELEMENTS BY SCENE (Start Time)
      // This allows us to resize the whole scene if the audio is long
      const scenes = {};
      
      if (scriptObj.elements && Array.isArray(scriptObj.elements)) {
        scriptObj.elements.forEach(element => {
          // Normalize start time key
          const startTime = element.start !== undefined ? element.start : (element.time || 0);
          if (!scenes[startTime]) scenes[startTime] = [];
          scenes[startTime].push(element);
        });
      }

      // 2. PROCESS SCENES SEQUENTIALLY
      // We ignore the original 'start' time and calculate a new 'currentCursor'
      const sortedStartTimes = Object.keys(scenes).map(Number).sort((a, b) => a - b);
      let currentCursor = 0;
      
      // Track counters for A/B roll (alternating tracks)
      let videoCount = 0;
      let imageCount = 0;
      let textCount = 0;

      sortedStartTimes.forEach((originalStartTime, sceneIndex) => {
        const sceneElements = scenes[originalStartTime];
        
        // Calculate dynamic duration for this scene
        // Find audio source text to estimate length
        const audioEl = sceneElements.find(e => e.type === 'audio');
        const textEl = sceneElements.find(e => e.type === 'text');
        const textContent = audioEl?.source || audioEl?.url || textEl?.text || "";
        
        const sceneDuration = this.estimateTextDuration(textContent);
        
        // Process elements in this scene
        sceneElements.forEach((element, idx) => {
          
          // --- AUDIO ---
          if (element.type === 'audio') {
            const audioElement = {
              name: element.name || `Voiceover-${sceneIndex}`,
              type: 'audio',
              // FIXED: Put all voiceovers on the SAME TRACK (Track 5).
              // This guarantees that if our calculation is slightly off, 
              // the next audio cuts the previous one off instead of overlapping.
              track: 5, 
              time: currentCursor,
              source: element.source || element.url
            };

            // Pass provider/duration if present
            if (element.provider) audioElement.provider = element.provider;
            // Note: We don't strictly cap 'duration' for ElevenLabs, we let it play.
            // The next clip on Track 5 will cut it if it runs too long.
            
            creatomateElements.push(audioElement);
          }

          // --- VIDEO ---
          else if (element.type === 'video') {
            videoCount++;
            // A/B Roll: Track 1 & 2
            const trackNum = 1 + (videoCount % 2);
            
            creatomateElements.push({
              type: 'video',
              track: trackNum,
              time: currentCursor,
              duration: sceneDuration, // Use calculated duration
              source: element.url,
              animations: element.animation ? [{
                time: 0,
                duration: 1,
                type: 'fade',
                easing: 'quadratic-out'
              }] : []
            });
          }

          // --- IMAGE ---
          else if (element.type === 'image') {
            imageCount++;
            // A/B Roll: Track 10 & 11
            const trackNum = 10 + (imageCount % 2);

            creatomateElements.push({
              type: 'image',
              track: trackNum,
              time: currentCursor,
              duration: sceneDuration, // Use calculated duration
              source: element.url,
              width: '100%',
              height: '100%',
              animations: element.animation ? [{
                time: 0,
                duration: 1,
                type: 'fade',
                easing: 'quadratic-out'
              }] : []
            });
          }

          // --- TEXT ---
          else if (element.type === 'text') {
            textCount++;
            // A/B Roll: Track 100 & 101
            const trackNum = 100 + (textCount % 2);

            const textElement = {
              type: 'text',
              track: trackNum,
              time: currentCursor,
              duration: sceneDuration, // Use calculated duration
              text: element.text,
              fill_color: element.style?.color || '#ffffff',
              font_family: element.style?.font || 'Montserrat',
              font_weight: '700',
              font_size: '8 vmin',
              width: '86.66%',
              height: '37.71%',
              x_alignment: '50%',
              y_alignment: '50%',
              background_color: element.style?.background || 'rgba(0,0,0,0.7)',
              background_x_padding: '26%',
              background_y_padding: '7%',
              background_border_radius: '28%',
              stroke_color: element.style?.stroke || '#333333',
              stroke_width: '1.05 vmin'
            };

            if (element.animation) {
              textElement.animations = [{
                time: 0,
                duration: 1,
                easing: 'quadratic-out',
                type: 'text-slide',
                scope: 'split-clip',
                split: 'line',
                background_effect: 'scaling-clip'
              }];
            }
            
            // Link to the audio in this scene
            textElement.transcript_source = `Voiceover-${sceneIndex}`;
            textElement.transcript_effect = 'highlight';

            creatomateElements.push(textElement);
          }
        });

        // Advance the cursor by the calculated duration for the next scene
        currentCursor += sceneDuration;
      });

      // --- QR CODE OVERLAY ---
      if (qrCodeUrl) {
        creatomateElements.push({
          name: 'QR-Overlay',
          type: 'image',
          track: 200, // Topmost Z-index
          time: 0,
          duration: currentCursor, // Lasts full recalculated duration
          source: qrCodeUrl,
          
          // Size
          width: '15vmin',
          height: '15vmin',
          fit: 'contain',
          
          // Position: Top Right with Safe Margin
          x_alignment: '100%',
          y_alignment: '0%',
          x: '92%', 
          y: '8%',
          
          shadow_color: 'rgba(0,0,0,0.5)',
          shadow_blur: '1vmin',
          animations: [{
             time: 0,
             duration: 1,
             type: 'fade',
             easing: 'quadratic-out'
          }]
        });
      }

      return {
        output_format: scriptObj.output_format || 'mp4',
        width: scriptObj.width || 1280,
        height: scriptObj.height || 720,
        duration: currentCursor, // Total calculated duration
        render_scale: 3,
        elements: creatomateElements
      };
    } catch (error) {
      throw new Error(`Failed to convert script format: ${error.message}`);
    }
  }

  async generateReel() {
    try {
      const scripts = await this.readScriptCsv();
      if (!scripts || scripts.length === 0) throw new Error('No scripts found in script.csv');

      const latestScript = scripts[scripts.length - 1];
      if (!latestScript.script) throw new Error('Script content is empty');

      const qrCodeUrl = await this.getQrCodeUrl();
      console.log(qrCodeUrl ? `Adding QR code overlay: ${qrCodeUrl}` : 'No QR code found to overlay');

      const creatomatePayload = this.convertScriptToCreatomateFormat(latestScript.script, qrCodeUrl);
      
      console.log('Sending payload to Creatomate:', JSON.stringify(creatomatePayload, null, 2));

      const response = await fetch(this.creatomateApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.creatomateApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(creatomatePayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Creatomate API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        renderId: result.id,
        status: result.status,
        url: result.url,
        response: result
      };
    } catch (error) {
      console.error('Full error details:', error);
      throw new Error(`Failed to generate reel: ${error.message}`);
    }
  }

  async checkRenderStatus(renderId) {
    try {
      const response = await fetch(`${this.creatomateApiUrl}/${renderId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.creatomateApiKey}` }
      });
      if (!response.ok) throw new Error(`Failed to check render status: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to check render status: ${error.message}`);
    }
  }
}

module.exports = new ReelGenService();