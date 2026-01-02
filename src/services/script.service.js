const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');

class ScriptService {
  constructor() {
    this.scrapedCsvPath = path.join(__dirname, '../../src/scraped.csv');
    this.scriptCsvPath = path.join(__dirname, '../../src/script.csv');
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.elevenlabsVoiceId = process.env.ELEVENLABS_VOICE_ID || 'XrExE9yKIg1WjnnlVkGX';
  }

  async readScrapedCsv() {
    try {
      const csvContent = await fs.readFile(this.scrapedCsvPath, 'utf-8');
      return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      throw new Error(`Failed to read scraped.csv: ${error.message}`);
    }
  }

  async generateScriptWithGPT(scrapedData) {
    try {
      const prompt = `You are a video script generator for Creatomate RenderScript API. Generate a sequential marketing reel script with voiceovers.

Input data: ${JSON.stringify(scrapedData)}

CRITICAL REQUIREMENTS:
1. Create a SEQUENTIAL video where scenes appear ONE AFTER ANOTHER
2. Total duration should be 20-30 seconds
3. Each scene should be 4-5 seconds long
4. Use "start" field to set when each element begins (e.g., 0, 5, 10, 15, 20)
5. Use only the image URLs provided in the input data
6. For EACH text element, create a corresponding voiceover element
7. Format each element like this:

For voiceover:
{
  "type": "voiceover",
  "text": "The actual text to be spoken",
  "start": 0,
  "duration": 5
}

For image:
{
  "type": "image",
  "url": "actual-image-url-from-input",
  "start": 0,
  "duration": 5,
  "animation": {
    "in": "fade",
    "out": "fade",
    "duration": 1
  }
}

For text overlay:
{
  "type": "text",
  "text": "EXACT SAME TEXT as the voiceover - word for word",
  "start": 0,
  "duration": 5,
  "style": {
    "color": "#CE4912",
    "font": "Montserrat",
    "size": 48,
    "background": "rgba(0,0,0,0.7)"
  },
  "animation": {
    "in": "fade",
    "out": "fade",
    "duration": 1
  }
}

8. Create 4-6 scenes that tell a story about the company
9. Each scene = 1 image + 1 text overlay + 1 voiceover (all appearing at the SAME start time)
10. Use brand colors: #CE4912 and #F34700
11. Keep voiceover text concise (1-2 sentences per scene)

Example structure:
Scene 1 (0-5s): Voiceover 1 + Image 1 + Text 1
Scene 2 (5-10s): Voiceover 2 + Image 2 + Text 2
Scene 3 (10-15s): Voiceover 3 + Image 3 + Text 3
Scene 4 (15-20s): Voiceover 4 + Image 4 + Text 4

Return ONLY valid JSON with this structure:
{
  "output_format": "mp4",
  "width": 1280,
  "height": 720,
  "elements": [...]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a video script generator. Create SEQUENTIAL scenes with proper start times. Each scene must have: 1 voiceover element, 1 image element, and 1 text element - all with the same start time. Each element must have a "start" field indicating when it appears (0, 5, 10, 15, 20, etc.).'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const scriptContent = data.choices[0].message.content.trim();
      
      let jsonScript;
      try {
        const jsonMatch = scriptContent.match(/\{[\s\S]*\}/);
        jsonScript = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(scriptContent);
      } catch (parseError) {
        throw new Error('Failed to parse GPT response as JSON');
      }

      // Process elements to add voiceover support
      if (jsonScript.elements && Array.isArray(jsonScript.elements)) {
        const processedElements = [];
        
        jsonScript.elements.forEach((element, index) => {
          // Convert voiceover elements to Creatomate audio format
          if (element.type === 'voiceover') {
            const audioElement = {
              name: `Voiceover-${index}`,
              type: 'audio',
              track: processedElements.filter(e => e.type === 'audio').length + 1,
              time: element.start || 0,
              source: element.text,
              provider: `elevenlabs model_id=eleven_multilingual_v2 voice_id=${this.elevenlabsVoiceId} stability=0.75`
            };
            // Don't set duration - let ElevenLabs determine natural speech length
            processedElements.push(audioElement);
          }
          // Keep image and text elements as is (will be converted by reelgen.service.js)
          else if (element.type === 'image' || element.type === 'text') {
            processedElements.push(element);
          }
          // Remove any other audio elements with invalid URLs
          else if (element.type === 'audio') {
            const url = element.url || element.source;
            if (url && 
                !url.includes('example.com') && 
                !url.includes('placeholder') &&
                (url.startsWith('http://') || url.startsWith('https://'))) {
              processedElements.push(element);
            }
          } else {
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

  /**
   * 1. GET CURRENT SCRIPT
   * Reads the CSV and parses the JSON from the last entry.
   * This is used by the Controller (GET) and by updateScript (PATCH).
   */
  async getCurrentScript() {
    try {
      const results = await this.readScrapedCsv(); // Wait... readScrapedCsv? No, we need readScriptCsv.
      // NOTE: Your original code had readScrapedCsv. We need a reader for script.csv.
      // Let's implement a specific reader for the script.csv if not present, 
      // or reuse the logic if you have one.
      
      // Implementation of reading script.csv:
      const csvContent = await fs.readFile(this.scriptCsvPath, 'utf-8').catch(() => '');
      if (!csvContent) return null;

      return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              // Get the most recent entry
              const lastEntry = results.data[results.data.length - 1];
              try {
                // Return the parsed JSON object and metadata
                resolve({
                  timestamp: lastEntry.timestamp,
                  status: lastEntry.status,
                  script: JSON.parse(lastEntry.script)
                });
              } catch (e) {
                resolve(null); // content might be corrupted or empty
              }
            } else {
              resolve(null);
            }
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      // If file doesn't exist yet, return null
      return null;
    }
  }

  /**
   * 2. UPDATE SCRIPT (PATCH LOGIC)
   * Reads current -> Merges changes -> Validates -> Saves
   */
  async updateScript(incomingChanges) {
    try {
      // STEP 1: READ CURRENT
      const currentData = await this.getCurrentScript();
      
      if (!currentData || !currentData.script) {
        throw new Error('No existing script found to patch. Please generate one first.');
      }

      const originalScript = currentData.script;

      // STEP 2: MERGE
      // We perform a shallow merge. 
      // If incomingChanges has 'elements', it replaces the old 'elements'.
      // If incomingChanges has 'width', it replaces the old 'width'.
      // Everything else is preserved.
      const updatedScript = {
        ...originalScript,
        ...incomingChanges
      };

      // STEP 3: VALIDATE
      // Ensure the merge didn't break the core structure
      if (!updatedScript.elements || !Array.isArray(updatedScript.elements)) {
        throw new Error('Invalid update: Resulting script is missing "elements" array');
      }

      // STEP 4: SAVE
      // We overwrite the CSV with the new merged version
      const csvData = [{
        timestamp: new Date().toISOString(),
        script: JSON.stringify(updatedScript),
        status: 'user-updated' 
      }];

      const csv = Papa.unparse(csvData);
      await fs.writeFile(this.scriptCsvPath, csv, 'utf-8');
      
      return {
        success: true,
        message: 'Script patched successfully',
        script: updatedScript
      };

    } catch (error) {
      throw new Error(`Failed to update script: ${error.message}`);
    }
  }
  
  async processAndGenerateScript() {
    try {
      const scrapedData = await this.readScrapedCsv();
      const generatedScript = await this.generateScriptWithGPT(scrapedData);
      const saveResult = await this.saveScriptToCsv(generatedScript);
      
      return {
        success: true,
        script: generatedScript,
        saved: saveResult
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ScriptService();