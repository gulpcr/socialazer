// src/services/reelgen.service.js
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
    
    this.elevenlabsVoiceId = process.env.ELEVENLABS_VOICE_ID || 'NDTYOmYEjbDIVCKB35i3';
    
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

  estimateTextDuration(text) {
    if (!text || typeof text !== 'string') return 3;
    const wordCount = text.trim().split(/\s+/).length;
    // 0.5s per word + 0.5s buffer
    const estimated = (wordCount * 0.5) + 0.5;
    // Minimum 3s
    return Math.max(3.5, estimated);
  }

  convertScriptToCreatomateFormat(generatedScript, qrCodeUrl) {
    try {
      const scriptObj = typeof generatedScript === 'string' 
        ? JSON.parse(generatedScript) 
        : generatedScript;

      const creatomateElements = [];
      let currentCursor = 0;

      // NEW FORMAT: Handle 'scenes' array
      if (scriptObj.scenes && Array.isArray(scriptObj.scenes)) {
        console.log('📝 Processing NEW script format with scenes...');
        
        scriptObj.scenes.forEach((scene, sceneIndex) => {
          const sceneDuration = scene.duration || 5;
          
          // --- 1. HANDLE BACKGROUND (Visual) ---
          if (scene.visuals) {
            if (scene.visuals.type === 'video') {
              creatomateElements.push({
                type: 'video',
                track: 1,
                time: currentCursor,
                duration: sceneDuration,
                source: scene.visuals.url,
                animations: scene.visuals.animation ? [{ 
                  time: 0, 
                  duration: 1, 
                  type: 'fade', 
                  easing: 'quadratic-out' 
                }] : []
              });
            } else if (scene.visuals.type === 'image') {
              creatomateElements.push({
                type: 'image',
                track: 10,
                time: currentCursor,
                duration: sceneDuration,
                source: scene.visuals.url,
                width: '100%',
                height: '100%',
                animations: scene.visuals.animation ? [{ 
                  time: 0, 
                  duration: 1, 
                  type: 'fade', 
                  easing: 'quadratic-out' 
                }] : []
              });
            }
          } else {
            // Fallback: white background
            creatomateElements.push({
              type: 'shape',
              shape: 'rectangle',
              track: 1,
              time: currentCursor,
              duration: sceneDuration,
              fill_color: '#FFFFFF',
              width: '100%',
              height: '100%'
            });
          }

          // --- 2. HANDLE AUDIO (VoiceOver) ---
          if (scene.voiceOver) {
            const audioElement = {
              name: `Voiceover-${sceneIndex}`,
              type: 'audio',
              track: 5,
              time: currentCursor,
              source: scene.voiceOver,
              provider: `elevenlabs model_id=eleven_multilingual_v2 voice_id=${this.elevenlabsVoiceId} stability=0.5 similarity_boost=0.75`
            };
            creatomateElements.push(audioElement);
          }

          // --- 3. HANDLE TEXT (On-screen text) ---
          // NEW FORMAT: Handle primary_text and secondary_text
          const hasPrimaryText = scene.primary_text && scene.primary_text.trim().length > 0;
          const hasSecondaryText = scene.secondary_text && scene.secondary_text.trim().length > 0;
          const hasOldText = scene.text && scene.text.trim().length > 0;

          if (hasPrimaryText || hasSecondaryText || hasOldText) {
            // Determine text style
            const textStyle = scene.text_style || 'normal';
            let fontWeight = '700';
            let textTransform = 'none';
            
            if (textStyle === 'bold' || textStyle === 'bold_uppercase') {
              fontWeight = '900';
            }
            if (textStyle === 'uppercase' || textStyle === 'bold_uppercase') {
              textTransform = 'uppercase';
            }

            // PRIMARY TEXT (if exists)
            if (hasPrimaryText) {
              const primaryTextElement = {
                type: 'text',
                track: 100,
                time: currentCursor,
                duration: sceneDuration,
                text: textTransform === 'uppercase' ? scene.primary_text.toUpperCase() : scene.primary_text,
                fill_color: '#ffffff',
                font_family: 'Montserrat',
                font_weight: fontWeight,
                font_size: '10 vmin', // Larger for primary
                width: '86.66%',
                x_alignment: '50%',
                y_alignment: hasSecondaryText ? '40%' : '50%', // Higher if there's secondary text
                stroke_color: '#333333',
                stroke_width: '1.2 vmin',
                background_color: 'rgba(0,0,0,0.7)',
                background_x_padding: '20%',
                background_y_padding: '5%',
                background_border_radius: '20%'
              };

              if (scene.voiceOver) {
                primaryTextElement.transcript_source = `Voiceover-${sceneIndex}`;
                primaryTextElement.transcript_effect = 'highlight';
                primaryTextElement.animations = [{
                  time: 0,
                  duration: 1,
                  easing: 'quadratic-out',
                  type: 'text-slide',
                  scope: 'split-clip',
                  split: 'line',
                  background_effect: 'scaling-clip'
                }];
              } else {
                primaryTextElement.animations = [{
                  time: 0,
                  duration: 1.5,
                  easing: 'quadratic-out',
                  type: 'scale',
                  start_scale: '50%'
                }];
              }

              creatomateElements.push(primaryTextElement);
            }

            // SECONDARY TEXT (if exists)
            if (hasSecondaryText) {
              const secondaryTextElement = {
                type: 'text',
                track: 101,
                time: currentCursor,
                duration: sceneDuration,
                text: scene.secondary_text,
                fill_color: '#ffffff',
                font_family: 'Montserrat',
                font_weight: '600',
                font_size: '6 vmin', // Smaller for secondary
                width: '80%',
                x_alignment: '50%',
                y_alignment: '60%', // Below primary text
                stroke_color: '#333333',
                stroke_width: '0.8 vmin',
                background_color: 'rgba(0,0,0,0.6)',
                background_x_padding: '15%',
                background_y_padding: '3%',
                background_border_radius: '15%',
                animations: [{
                  time: 0.5, // Slight delay after primary
                  duration: 1,
                  easing: 'quadratic-out',
                  type: 'scale',
                  start_scale: '80%'
                }]
              };

              creatomateElements.push(secondaryTextElement);
            }

            // FALLBACK: OLD TEXT FORMAT (if no primary/secondary but has text)
            if (!hasPrimaryText && !hasSecondaryText && hasOldText) {
              const textElement = {
                type: 'text',
                track: 100,
                time: currentCursor,
                duration: sceneDuration,
                text: scene.text,
                fill_color: '#ffffff',
                font_family: 'Montserrat',
                font_weight: '700',
                font_size: '8 vmin',
                width: '86.66%',
                height: '37.71%',
                x_alignment: '50%',
                y_alignment: '50%',
                stroke_color: '#333333',
                stroke_width: '1.05 vmin',
                background_color: 'rgba(0,0,0,0.7)',
                background_x_padding: '26%',
                background_y_padding: '7%',
                background_border_radius: '28%'
              };

              if (scene.voiceOver) {
                textElement.transcript_source = `Voiceover-${sceneIndex}`;
                textElement.transcript_effect = 'highlight';
                textElement.animations = [{
                  time: 0,
                  duration: 1,
                  easing: 'quadratic-out',
                  type: 'text-slide',
                  scope: 'split-clip',
                  split: 'line',
                  background_effect: 'scaling-clip'
                }];
              } else {
                textElement.animations = [{
                  time: 0,
                  duration: 1.5,
                  easing: 'quadratic-out',
                  type: 'scale',
                  start_scale: '50%'
                }];
              }

              creatomateElements.push(textElement);
            }
          }

          currentCursor += sceneDuration;
        });

      } 
      // OLD FORMAT: Handle 'elements' array (backward compatibility)
      else if (scriptObj.elements && Array.isArray(scriptObj.elements)) {
        console.log('📝 Processing OLD script format with elements...');
        
        const scenes = {};
        
        scriptObj.elements.forEach(element => {
          const startTime = element.start !== undefined ? element.start : (element.time || 0);
          if (!scenes[startTime]) scenes[startTime] = [];
          scenes[startTime].push(element);
        });

        const sortedStartTimes = Object.keys(scenes).map(Number).sort((a, b) => a - b);
        
        let videoCount = 0;
        let imageCount = 0;
        let textCount = 0;

        sortedStartTimes.forEach((originalStartTime, sceneIndex) => {
          const sceneElements = scenes[originalStartTime];
          
          const audioEl = sceneElements.find(e => e.type === 'audio');
          const visualEl = sceneElements.find(e => e.type === 'image' || e.type === 'video');
          const textEl = sceneElements.find(e => e.type === 'text');
          
          let sceneDuration = 3;
          
          if (audioEl) {
            sceneDuration = this.estimateTextDuration(audioEl.source || audioEl.url);
          } else if (textEl && !visualEl) {
            sceneDuration = textEl.duration || 3;
          } else if (visualEl && visualEl.duration) {
            sceneDuration = visualEl.duration;
          }
          
          // Handle background
          if (visualEl) {
            if (visualEl.type === 'video') {
              videoCount++;
              const trackNum = 1 + (videoCount % 2);
              creatomateElements.push({
                type: 'video',
                track: trackNum,
                time: currentCursor,
                duration: sceneDuration,
                source: visualEl.url,
                animations: visualEl.animation ? [{ time: 0, duration: 1, type: 'fade', easing: 'quadratic-out' }] : []
              });
            } else {
              imageCount++;
              const trackNum = 10 + (imageCount % 2);
              creatomateElements.push({
                type: 'image',
                track: trackNum,
                time: currentCursor,
                duration: sceneDuration,
                source: visualEl.url,
                width: '100%',
                height: '100%',
                animations: visualEl.animation ? [{ time: 0, duration: 1, type: 'fade', easing: 'quadratic-out' }] : []
              });
            }
          } else {
            const bgColor = textEl?.style?.background || '#FFFFFF';
            
            creatomateElements.push({
              type: 'shape',
              shape: 'rectangle',
              track: 1,
              time: currentCursor,
              duration: sceneDuration,
              fill_color: bgColor,
              width: '100%',
              height: '100%',
              animations: [{ time: 0, duration: 1, type: 'fade', easing: 'quadratic-out' }]
            });
          }

          // Handle audio
          if (audioEl) {
            const audioElement = {
              name: audioEl.name || `Voiceover-${sceneIndex}`,
              type: 'audio',
              track: 5,
              time: currentCursor,
              source: audioEl.source || audioEl.url,
              provider: `elevenlabs model_id=eleven_multilingual_v2 voice_id=${this.elevenlabsVoiceId} stability=0.5 similarity_boost=0.75`
            };
            creatomateElements.push(audioElement);
          }

          // Handle text
          if (textEl) {
            textCount++;
            const trackNum = 100 + (textCount % 2);
            const useTextBackground = !!visualEl;

            const textElement = {
              type: 'text',
              track: trackNum,
              time: currentCursor,
              duration: sceneDuration,
              text: textEl.text,
              fill_color: textEl.style?.color || '#ffffff',
              font_family: textEl.style?.font || 'Montserrat',
              font_weight: '700',
              font_size: '8 vmin',
              width: useTextBackground ? '86.66%' : '100%',
              height: useTextBackground ? '37.71%' : 'auto',
              x_alignment: '50%',
              y_alignment: '50%',
              stroke_color: textEl.style?.stroke || '#333333',
              stroke_width: '0'
            };

            if (useTextBackground) {
              textElement.background_color = textEl.style?.background || 'rgba(0,0,0,0.7)';
              textElement.background_x_padding = '26%';
              textElement.background_y_padding = '7%';
              textElement.background_border_radius = '28%';
              textElement.stroke_width = '1.05 vmin';
            }

            if (audioEl) {
              textElement.transcript_source = `Voiceover-${sceneIndex}`;
              textElement.transcript_effect = 'highlight';
              
              if (textEl.animation) {
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
            } else {
              textElement.animations = [{
                time: 0,
                duration: 1.5,
                easing: 'quadratic-out',
                type: 'scale',
                start_scale: '50%'
              }];
            }

            creatomateElements.push(textElement);
          }

          currentCursor += sceneDuration;
        });
      } else {
        throw new Error('Invalid script format: No scenes or elements array found');
      }

      // --- QR CODE OVERLAY ---
      if (qrCodeUrl) {
        creatomateElements.push({
          name: 'QR-Overlay',
          type: 'image',
          track: 200,
          time: 0,
          duration: currentCursor,
          source: qrCodeUrl,
          width: '15vmin',
          height: '15vmin',
          fit: 'contain',
          x_alignment: '100%',
          y_alignment: '0%',
          x: '92%',
          y: '8%',
          shadow_color: 'rgba(0,0,0,0.5)',
          shadow_blur: '1vmin',
          animations: [{ time: 0, duration: 1, type: 'fade', easing: 'quadratic-out' }]
        });
      }

      return {
        output_format: scriptObj.output_format || 'mp4',
        width: scriptObj.config?.dimensions?.width || scriptObj.width || 1280,
        height: scriptObj.config?.dimensions?.height || scriptObj.height || 720,
        duration: currentCursor,
        render_scale: 1,
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