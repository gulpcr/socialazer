// src/services/script.service.js

const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

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
            if (results.data.length > 0) {
              resolve(JSON.parse(results.data[0].data));
            } else {
              reject(new Error('No data found in scraped.csv'));
            }
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) { 
      throw new Error(`Failed to read scraped data: ${error.message}`); 
    }
  }

  validateAnalysisId(scrapedData, analysisId) {
    if (scrapedData.id !== analysisId) {
      throw new Error(`Analysis ID mismatch. Expected ${analysisId}, found ${scrapedData.id}`);
    }
  }

  async generateScriptWithGPT(scrapedData, config) {
    try {
      const { platform, duration, aspectRatio, tone, voiceStyle } = config;
      
      const brandName = scrapedData.branding?.brandName || scrapedData.brandName || 'Our Brand';
      const description = scrapedData.extractedContent?.description || scrapedData.description || '';
      const valueProposition = scrapedData.extractedContent?.valueProposition || '';
      const targetAudience = scrapedData.extractedContent?.targetAudience || '';
      const keyPoints = scrapedData.extractedContent?.keyPoints || scrapedData.keyMessages || [];
      const headlines = scrapedData.extractedContent?.headlines || [];
      
      // Get available images
      const availableImages = scrapedData.media?.images || scrapedData.adReadyImages || [];
      const selectedImages = availableImages.filter(img => img.selected !== false && img.url);

      if (selectedImages.length === 0) {
        throw new Error("No valid images found in scraped data.");
      }

      // Calculate scene parameters
      const targetDuration = parseInt(duration);
      const sceneDuration = targetDuration <= 15 ? 3 : targetDuration <= 30 ? 5 : 6;
      const numScenes = Math.ceil(targetDuration / sceneDuration);

      // Prepare image descriptions for AI
      const imageDescriptions = selectedImages.map((img, idx) => ({
        index: idx,
        description: img.alt || img.visualContent || 'Product image',
        category: img.category || 'general',
        url: img.url
      }));

      const systemPrompt = `You are an expert video scriptwriter specializing in ${platform} ads.

Generate a ${targetDuration}-second video script with exactly ${numScenes} scenes.

BRAND CONTEXT:
- Brand: ${brandName}
- Description: ${description}
- Value Proposition: ${valueProposition}
- Target Audience: ${targetAudience}

KEY POINTS TO HIGHLIGHT:
${keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

AVAILABLE HEADLINES:
${headlines.map(h => `- ${h.text || h}`).join('\n')}

AVAILABLE IMAGES:
${imageDescriptions.map(img => `[${img.index}] ${img.category}: ${img.description}`).join('\n')}

REQUIREMENTS:
- Platform: ${platform}
- Duration: ${targetDuration} seconds total
- Aspect Ratio: ${aspectRatio}
- Tone: ${tone}
- Voice Style: ${voiceStyle}
- Each scene should be approximately ${sceneDuration} seconds

CRITICAL INSTRUCTIONS:
1. Match images to narration semantically (e.g., if talking about a laptop, use laptop image)
2. Start with an attention-grabbing hook
3. Include key benefits and features
4. End with a clear call-to-action
5. Keep text concise for ${platform}
6. Match ${tone} tone and ${voiceStyle} voice throughout

OUTPUT FORMAT (JSON only, no markdown):
{
  "scenes": [
    {
      "order": 1,
      "duration": ${sceneDuration},
      "text": "On-screen text/caption",
      "voiceOver": "Spoken narration",
      "imageIndex": 0,
      "animation": "fade-in",
      "transition": "fade"
    }
  ]
}

Available animations: fade-in, zoom-in, slide-up, pan, zoom-out
Available transitions: fade, cut, dissolve, slide`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 2000
      });

      const jsonScript = JSON.parse(completion.choices[0].message.content);

      // Process and format scenes
      const scenes = (jsonScript.scenes || []).map((scene, idx) => {
        let imageIndex = scene.imageIndex;
        
        // Validate image index
        if (typeof imageIndex !== 'number' || imageIndex < 0 || imageIndex >= selectedImages.length) {
          imageIndex = idx % selectedImages.length;
        }

        const selectedImage = selectedImages[imageIndex];

        return {
          id: `scene_${idx + 1}`,
          order: scene.order || idx + 1,
          duration: scene.duration || sceneDuration,
          text: scene.text || '',
          voiceOver: scene.voiceOver || '',
          visuals: {
            type: 'image',
            url: selectedImage.url,
            animation: scene.animation || 'fade-in'
          },
          transition: scene.transition || (idx === jsonScript.scenes.length - 1 ? 'fade' : 'dissolve')
        };
      });

      return scenes;

    } catch (error) {
      throw new Error(`Failed to generate script with GPT: ${error.message}`);
    }
  }

  async saveScriptToCsv(scriptData) {
    const csvData = [{ 
      timestamp: new Date().toISOString(), 
      script: JSON.stringify(scriptData), 
      status: 'generated' 
    }];
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
              try { 
                resolve(JSON.parse(results.data[results.data.length - 1].script)); 
              } catch { 
                resolve(null); 
              }
            } else {
              resolve(null);
            }
          }
        });
      });
    } catch { 
      return null; 
    }
  }

  /**
   * ENHANCED UPDATE SCRIPT FUNCTION
   * Supports multiple update operations:
   * 1. Update entire scenes array
   * 2. Update specific scenes by ID
   * 3. Add new scenes at specific positions
   * 4. Remove scenes
   * 5. Reorder scenes
   */
  async updateScript(updates) {
    try {
      const currentScript = await this.getCurrentScript();
      
      if (!currentScript) {
        throw new Error('No script found to update');
      }

      let updatedScenes = [...currentScript.scenes];

      // OPERATION 1: Replace entire scenes array
      if (updates.scenes && Array.isArray(updates.scenes)) {
        console.log('🔄 Replacing entire scenes array...');
        updatedScenes = updates.scenes.map((scene, idx) => ({
          ...scene,
          id: scene.id || `scene_${idx + 1}`,
          order: scene.order || idx + 1
        }));
      }

      // OPERATION 2: Update specific scenes by ID
      if (updates.updateScenes && Array.isArray(updates.updateScenes)) {
        console.log('✏️ Updating specific scenes...');
        updates.updateScenes.forEach(sceneUpdate => {
          const sceneIndex = updatedScenes.findIndex(s => s.id === sceneUpdate.id);
          
          if (sceneIndex !== -1) {
            // Merge updates into existing scene
            updatedScenes[sceneIndex] = {
              ...updatedScenes[sceneIndex],
              ...sceneUpdate,
              // Preserve ID
              id: updatedScenes[sceneIndex].id,
              // Update visuals properly if provided
              visuals: sceneUpdate.visuals ? {
                ...updatedScenes[sceneIndex].visuals,
                ...sceneUpdate.visuals
              } : updatedScenes[sceneIndex].visuals
            };
          }
        });
      }

      // OPERATION 3: Add new scenes
      if (updates.addScenes && Array.isArray(updates.addScenes)) {
        console.log('➕ Adding new scenes...');
        updates.addScenes.forEach(newScene => {
          const position = newScene.position || updatedScenes.length;
          const sceneToAdd = {
            id: newScene.id || `scene_${uuidv4().split('-')[0]}`,
            order: position + 1,
            duration: newScene.duration || 5,
            text: newScene.text || '',
            voiceOver: newScene.voiceOver || '',
            visuals: newScene.visuals || { type: 'image', url: '', animation: 'fade-in' },
            transition: newScene.transition || 'dissolve'
          };
          
          updatedScenes.splice(position, 0, sceneToAdd);
        });
      }

      // OPERATION 4: Remove scenes
      if (updates.removeScenes && Array.isArray(updates.removeScenes)) {
        console.log('🗑️ Removing scenes...');
        updatedScenes = updatedScenes.filter(scene => 
          !updates.removeScenes.includes(scene.id)
        );
      }

      // OPERATION 5: Reorder scenes
      if (updates.reorderScenes && Array.isArray(updates.reorderScenes)) {
        console.log('🔀 Reordering scenes...');
        const reorderedScenes = [];
        
        updates.reorderScenes.forEach(sceneId => {
          const scene = updatedScenes.find(s => s.id === sceneId);
          if (scene) {
            reorderedScenes.push(scene);
          }
        });
        
        // Add any scenes that weren't in the reorder list
        updatedScenes.forEach(scene => {
          if (!updates.reorderScenes.includes(scene.id)) {
            reorderedScenes.push(scene);
          }
        });
        
        updatedScenes = reorderedScenes;
      }

      // Normalize scene order numbers
      updatedScenes = updatedScenes.map((scene, idx) => ({
        ...scene,
        order: idx + 1
      }));

      // Recalculate total duration
      const totalDuration = updatedScenes.reduce(
        (sum, scene) => sum + (scene.duration || 0), 
        0
      );

      // Create updated script
      const updatedScript = {
        ...currentScript,
        scenes: updatedScenes,
        totalDuration: totalDuration,
        updatedAt: new Date().toISOString()
      };

      // Save updated script
      await this.saveScriptToCsv(updatedScript);
      console.log('💾 Script updated successfully');

      return updatedScript;
    } catch (error) {
      throw new Error(`Failed to update script: ${error.message}`);
    }
  }

  async processAndGenerateScript(analysisId, config) {
    try {
      console.log('📖 Reading scraped data from CSV...');
      const scrapedData = await this.readScrapedData();

      console.log('✅ Validating analysis ID...');
      this.validateAnalysisId(scrapedData, analysisId);

      console.log('🎬 Generating scenes with GPT...');
      const scenes = await this.generateScriptWithGPT(scrapedData, config);

      // Calculate total duration
      const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

      // Create final script object
      const scriptResult = {
        id: `script_${uuidv4().split('-')[0]}`,
        scenes: scenes,
        totalDuration: totalDuration,
        createdAt: new Date().toISOString()
      };

      // Save script to CSV
      await this.saveScriptToCsv(scriptResult);
      console.log('💾 Script saved successfully');

      return scriptResult;
    } catch (error) {
      throw new Error(`Failed to process and generate script: ${error.message}`);
    }
  }
}

module.exports = new ScriptService();