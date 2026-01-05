// src/services/script.service.js

const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');
const OpenAI = require('openai');
const configService = require('./config.service');

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
          header: true, skipEmptyLines: true,
          complete: (results) => {
            if (results.data.length > 0) resolve(JSON.parse(results.data[0].data));
            else reject(new Error('No data'));
          }
        });
      });
    } catch (error) { throw error; }
  }

  async generateScriptWithGPT(scrapedData, config) {
    try {
      const brandName = scrapedData.brandName || 'Our Brand';
      const keyMessages = scrapedData.keyMessages || [];
      
      // Prepare Asset Library with Categories
      const assetLibrary = (scrapedData.adReadyImages || [])
        .filter(img => img.url && img.url.length > 10)
        .map((img, index) => ({
          id: index,
          category: img.category || 'general',
          description: img.visualContent || "Brand visual",
          url: img.url
        }));

      if (assetLibrary.length === 0) throw new Error("No valid images found.");

      const duration = parseInt(config.duration || 15);
      const targetImageCount = Math.max(3, Math.floor(duration / 5));
      const wordCount = Math.floor(duration * 3.5); 

      const voiceoverInstruction = config.voiceover 
        ? `Generate a voiceover of exactly ${wordCount} words. 
           CRITICAL:
           1. Use the KEY MESSAGES provided.
           2. Talk about the products visible in the ASSET LIBRARY descriptions.
           3. End with "Visit ${brandName} today."`
        : `NO VOICEOVER.`;

      const systemPrompt = `You are a video director.

KEY MESSAGES (Facts to use):
${JSON.stringify(keyMessages)}

ASSET LIBRARY (Available Images):
${JSON.stringify(assetLibrary.slice(0, 15).map(a => `ID ${a.id} [${a.category}]: ${a.description}`))}

INSTRUCTIONS:
1. Create a ${duration}s script with ${targetImageCount} scenes.
2. **SEMANTIC MATCHING:** If the voiceover talks about a specific product (e.g. "iPad"), you MUST select an image ID where the description matches that product. Do not show a movie poster when talking about a laptop.
3. ${voiceoverInstruction}

OUTPUT JSON:
{
  "elements": [
    { "type": "voiceover", "text": "Talking about iPad..." },
    { "type": "image", "assetId": 0, "duration": 5 }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.4, // Lower temp for strict matching
      });

      const jsonScript = JSON.parse(completion.choices[0].message.content);

      if (jsonScript.elements) {
        const processedElements = [];
        let imageCounter = 0;

        jsonScript.elements.forEach((element, index) => {
          if (element.type === 'voiceover') {
            if (config.voiceover) {
              processedElements.push({
                name: `Voiceover-${index}`,
                type: 'audio',
                track: 1,
                time: 0,
                source: element.text,
                provider: `elevenlabs model_id=eleven_multilingual_v2 voice_id=${this.elevenlabsVoiceId}`
              });
            }
          } 
          else if (element.type === 'image') {
            let imgIndex = element.assetId;
            
            // Validation
            if (typeof imgIndex !== 'number' || imgIndex >= assetLibrary.length) {
                // If LLM failed to pick a valid ID, pick the next one in line
                imgIndex = imageCounter % assetLibrary.length;
            }
            imageCounter++;

            processedElements.push({
              type: 'image',
              url: assetLibrary[imgIndex].url,
              start: 0,
              duration: element.duration || 5
            });
          }
        });
        jsonScript.elements = processedElements;
      }

      jsonScript.width = config.dimensions.width;
      jsonScript.height = config.dimensions.height;

      return jsonScript;

    } catch (error) {
      throw new Error(`Failed to generate script: ${error.message}`);
    }
  }

  async saveScriptToCsv(scriptData) {
    const csvData = [{ timestamp: new Date().toISOString(), script: JSON.stringify(scriptData), status: 'generated' }];
    const csv = Papa.unparse(csvData);
    await fs.writeFile(this.scriptCsvPath, csv, 'utf-8');
    return { success: true, path: this.scriptCsvPath };
  }

  async getCurrentScript() {
    try {
        const csvContent = await fs.readFile(this.scriptCsvPath, 'utf-8');
        return new Promise((resolve) => {
            Papa.parse(csvContent, {
                header: true,
                complete: (results) => {
                    if (results.data.length > 0) {
                        try { resolve({ script: JSON.parse(results.data[results.data.length-1].script) }); }
                        catch { resolve(null); }
                    } else resolve(null);
                }
            });
        });
    } catch { return null; }
  }

  async processAndGenerateScript() {
      const scraped = await this.readScrapedData();
      const config = await configService.getConfig();
      const script = await this.generateScriptWithGPT(scraped, config);
      await this.saveScriptToCsv(script);
      return { success: true, script };
  }
}

module.exports = new ScriptService();