const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');
const OpenAI = require('openai');
const configService = require('./config.service'); // Import the ConfigService

class ScriptService {
  constructor() {
    this.scrapedCsvPath = path.join(__dirname, '../../src/scraped.csv');
    this.scriptCsvPath = path.join(__dirname, '../../src/script.csv');
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.elevenlabsVoiceId = process.env.ELEVENLABS_VOICE_ID;
  }

  async readScrapedData() {
    try {
      const csvContent = await fs.readFile(this.scrapedCsvPath, 'utf-8');
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0 && results.data[0].data) {
              try {
                const parsedData = JSON.parse(results.data[0].data);
                resolve(parsedData);
              } catch (e) {
                reject(new Error('Failed to parse inner JSON from scraped CSV'));
              }
            } else {
              reject(new Error('No valid data found in scraped CSV'));
            }
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      throw new Error(`Failed to read scraped.csv: ${error.message}`);
    }
  }

  /**
   * Generates prompt based on User Configuration + Scraped Data
   */
  async generateScriptWithGPT(scrapedData, config) {
    try {
      // 1. Prepare Context from Scraped Data
      const brandColors = scrapedData.brandColors || ['#000000', '#ffffff'];
      const primaryColor = brandColors[0];
      const secondaryColor = brandColors[1] || brandColors[0];
      const brandName = scrapedData.brandName || 'Our Brand';
      
      const availableImages = (scrapedData.adReadyImages || []).map(img => ({
        url: img.url,
        context: img.context || 'general',
        bestUseCase: img.bestUseCase
      }));

      // 2. Map Config to Prompt Logic
      const duration = parseInt(config.duration || 30);
      const isShortForm = duration <= 15;
      
      // Estimated specs
      const wordCount = Math.floor(duration * 2.5); // ~2.5 words per second
      const sceneCount = isShortForm ? '3-4' : '5-8';
      
      // Voiceover instruction
      const voiceoverInstruction = config.voiceover 
        ? `Generate a compelling voiceover script (approx ${wordCount} words).`
        : `NO VOICEOVER. The video relies entirely on Kinetic Typography (text overlays) to tell the story.`;

      // Channel nuance
      let channelNuance = '';
      if (config.channel.includes('instagram') || config.channel.includes('tiktok')) {
        channelNuance = 'Fast-paced, high energy, visual hook in the first 3 seconds.';
      } else if (config.channel.includes('linkedin')) {
        channelNuance = 'Professional, value-driven, authoritative tone.';
      } else {
        channelNuance = 'Engaging, clear, standard social media pacing.';
      }

      // 3. Construct Enhanced Prompt
      const systemPrompt = `You are an expert video director for the brand "${brandName}".
      
CAMPAIGN CONFIG:
- Goal: ${config.adType} (Optimize script for this outcome)
- Platform: ${config.channel}
- Duration: ${duration} seconds
- Tone: ${scrapedData.emotionalTone}
- Audience: ${scrapedData.targetAudience}

INSTRUCTIONS:
${channelNuance}
${voiceoverInstruction}
Structure: ${sceneCount} Scenes.

AVAILABLE ASSETS:
Colors: Primary ${primaryColor}, Secondary ${secondaryColor}
Images: ${JSON.stringify(availableImages)}

RULES:
1. "start" times must be sequential.
2. Scene 1 MUST be a "hook" relevant to ${config.adType}.
3. Use "product" or "feature" images for the middle scenes.
4. Text overlays must be punchy and readable.
5. CRITICAL FINAL SCENE: End with a scene displaying ONLY the Brand Name "${brandName}" with background: #FFFFFF and color: ${primaryColor}. No image in final scene.
6. Return JSON matching the structure requested.`;

      const userPrompt = `Create a ${duration}-second video script for ${config.channel}.

Return ONLY valid JSON:
{
  "output_format": "mp4",
  "width": ${config.dimensions.width},
  "height": ${config.dimensions.height},
  "elements": [
    ${config.voiceover ? `{ "type": "voiceover", "text": "Spoken words...", "start": 0 },` : ''}
    {
      "type": "image",
      "url": "URL_FROM_ASSETS",
      "start": 0,
      "duration": 4
    },
    {
      "type": "text",
      "text": "OVERLAY TEXT",
      "start": 0,
      "duration": 4,
      "style": { "color": "${primaryColor}", "background": "${secondaryColor}" }
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const scriptContent = completion.choices[0].message.content;
      const jsonScript = JSON.parse(scriptContent);

      // 4. Post-Process
      if (jsonScript.elements && Array.isArray(jsonScript.elements)) {
        const processedElements = [];
        
        jsonScript.elements.forEach((element, index) => {
          // Handle Voiceover logic
          if (element.type === 'voiceover') {
            if (config.voiceover) {
              processedElements.push({
                name: `Voiceover-${index}`,
                type: 'audio',
                track: 1,
                time: element.start || 0,
                source: element.text,
                provider: `elevenlabs model_id=eleven_multilingual_v2 voice_id=${this.elevenlabsVoiceId} stability=0.5 similarity_boost=0.75`
              });
            } 
            // If config.voiceover is false, we simply skip adding this element
          } else {
            // Validation for Images
            if (element.type === 'image') {
              const isValid = availableImages.some(img => img.url === element.url);
              if (!isValid && availableImages.length > 0) {
                // Fallback to best available image if LLM hallucinates a URL
                element.url = availableImages[0].url;
              }
            }
            processedElements.push(element);
          }
        });
        
        jsonScript.elements = processedElements;
      }

      // Ensure dimensions are set from config
      jsonScript.width = config.dimensions.width;
      jsonScript.height = config.dimensions.height;

      return jsonScript;
    } catch (error) {
      throw new Error(`Failed to generate script: ${error.message}`);
    }
  }

  async saveScriptToCsv(scriptData) {
    try {
      const csvData = [{
        timestamp: new Date().toISOString(),
        script: JSON.stringify(scriptData),
        status: 'generated'
      }];

      const csv = Papa.unparse(csvData);
      await fs.writeFile(this.scriptCsvPath, csv, 'utf-8');
      return { success: true, path: this.scriptCsvPath };
    } catch (error) {
      throw new Error(`Failed to save script.csv: ${error.message}`);
    }
  }

  async getCurrentScript() {
    try {
      const csvContent = await fs.readFile(this.scriptCsvPath, 'utf-8').catch(() => '');
      if (!csvContent) return null;

      return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              const lastEntry = results.data[results.data.length - 1];
              try {
                resolve({
                  timestamp: lastEntry.timestamp,
                  status: lastEntry.status,
                  script: JSON.parse(lastEntry.script)
                });
              } catch (e) {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      return null;
    }
  }

  async updateScript(incomingChanges) {
    try {
      const currentData = await this.getCurrentScript();
      if (!currentData || !currentData.script) {
        throw new Error('No existing script found to patch.');
      }

      // --- VALIDATION START ---
      // Prevent corruption: If elements are being updated, ensure it's still an Array
      if (incomingChanges.elements && !Array.isArray(incomingChanges.elements)) {
        throw new Error("Invalid update: 'elements' must be an array.");
      }
      // --- VALIDATION END ---

      const updatedScript = {
        ...currentData.script,
        ...incomingChanges
      };

      const csvData = [{
        timestamp: new Date().toISOString(),
        script: JSON.stringify(updatedScript),
        status: 'user-updated' 
      }];

      const csv = Papa.unparse(csvData);
      await fs.writeFile(this.scriptCsvPath, csv, 'utf-8');
      
      return { success: true, script: updatedScript };
    } catch (error) {
      throw new Error(`Failed to update script: ${error.message}`);
    }
  }
  
  // UPDATED: Now reads from files instead of args
  async processAndGenerateScript() {
    try {
      // 1. Read Scraped Data (scraped.csv)
      const scrapedData = await this.readScrapedData();
      
      // 2. Read Config Data (config.csv) via Service
      // This ensures we pick up the latest user settings
      const config = await configService.getConfig();

      console.log('🤖 Generating script with Config:', JSON.stringify(config, null, 2));

      // 3. Generate with LLM
      const generatedScript = await this.generateScriptWithGPT(scrapedData, config);
      
      // 4. Save result
      const saveResult = await this.saveScriptToCsv(generatedScript);
      
      return {
        success: true,
        script: generatedScript,
        saved: saveResult
      };
    } catch (error) {
      console.error("Script Generation Error:", error);
      throw error;
    }
  }
}

module.exports = new ScriptService();