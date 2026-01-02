// src/services/script.service.js
const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');
const OpenAI = require('openai');

class ScriptService {
  constructor() {
    this.scrapedCsvPath = path.join(__dirname, '../../src/scraped.csv');
    this.scriptCsvPath = path.join(__dirname, '../../src/script.csv');
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.elevenlabsVoiceId = process.env.ELEVENLABS_VOICE_ID || 'NDTYOmYEjbDIVCKB35i3';
  }

  /**
   * Reads the scraped CSV and parses the inner JSON data
   */
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

  async generateScriptWithGPT(scrapedData) {
    try {
      // 1. Prepare Context from Scraper Data
      const brandColors = scrapedData.brandColors || ['#000000', '#ffffff'];
      const primaryColor = brandColors[0];
      const secondaryColor = brandColors[1] || brandColors[0];
      const brandName = scrapedData.brandName || 'Our Brand';
      
      // Filter images to give GPT a clean list with context
      const availableImages = (scrapedData.adReadyImages || []).map(img => ({
        url: img.url,
        context: img.context || 'general',
        bestUseCase: img.bestUseCase
      }));

      // 2. Construct Enhanced Prompt
      const systemPrompt = `You are an expert video director for the brand "${brandName}".
      
Target Audience: ${scrapedData.targetAudience}
Tone: ${scrapedData.emotionalTone}
Value Prop: ${scrapedData.valueProposition}

Your goal is to generate a JSON video script for Creatomate.
Total Duration: 20-30 seconds.
Structure: 4-6 Scenes.

AVAILABLE ASSETS:
Colors: Primary ${primaryColor}, Secondary ${secondaryColor}
Images: ${JSON.stringify(availableImages)}

RULES:
1. "start" times must be sequential (e.g., 0, 5, 10).
2. Use "hero" or "logo" images for the intro (Scene 1).
3. Use "product" or "feature" images for the middle scenes.
4. Match the voiceover text to the ${scrapedData.emotionalTone} tone.
5. Text overlays must match the voiceover keywords.
6. Use the provided Hex codes for text styles.
7. CRITICAL FINAL SCENE: The script MUST end with a dedicated scene displaying ONLY the Brand Name ("${brandName}"). For this specific element, set the style "background" to "#FFFFFF" (white) and the "color" (text color) to "${primaryColor}". Do not include an image in this final scene.`;

      const userPrompt = `Create a sequential marketing video script.

Return ONLY valid JSON with this structure:
{
  "output_format": "mp4",
  "width": 1920,
  "height": 1080,
  "elements": [
    {
      "type": "voiceover",
      "text": "Script line here...",
      "start": 0
    },
    {
      "type": "image",
      "url": "URL_FROM_AVAILABLE_ASSETS",
      "start": 0,
      "duration": 5,
      "animation": { "in": "fade", "duration": 1 }
    },
    {
      "type": "text",
      "text": "OVERLAY TEXT",
      "start": 0,
      "duration": 5,
      "style": {
        "color": "${primaryColor}",
        "background": "${secondaryColor}",
        "font": "Montserrat",
        "size": 50
      }
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

      // 3. Post-Process: Add Audio Configuration
      if (jsonScript.elements && Array.isArray(jsonScript.elements)) {
        const processedElements = [];
        
        jsonScript.elements.forEach((element, index) => {
          if (element.type === 'voiceover') {
            processedElements.push({
              name: `Voiceover-${index}`,
              type: 'audio',
              track: 1,
              time: element.start || 0,
              source: element.text,
              provider: `elevenlabs model_id=eleven_multilingual_v2 voice_id=${this.elevenlabsVoiceId} stability=0.5 similarity_boost=0.75`
            });
          } else {
            // Ensure images have valid URLs from our scraped list
            if (element.type === 'image') {
              const isValid = availableImages.some(img => img.url === element.url);
              if (!isValid && availableImages.length > 0) {
                element.url = availableImages[0].url;
              }
            }
            processedElements.push(element);
          }
        });
        
        jsonScript.elements = processedElements;
      }

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
  
  async processAndGenerateScript() {
    try {
      const scrapedData = await this.readScrapedData();
      const generatedScript = await this.generateScriptWithGPT(scrapedData);
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