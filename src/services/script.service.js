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
      const endCardDuration = 5;
      const scenesTotalDuration = targetDuration - endCardDuration;
      
      const sceneDuration = scenesTotalDuration <= 10 ? 3 : scenesTotalDuration <= 20 ? 5 : 5;
      const numScenes = Math.floor(scenesTotalDuration / sceneDuration);
      
      // Calculate words needed per scene for proper pacing
      // Average speaking rate: 140-160 words per minute = ~2.5 words per second
      const wordsPerSecond = 2.5;
      const targetWordsPerScene = Math.floor(sceneDuration * wordsPerSecond);
      
      console.log(`📊 Duration breakdown: Total ${targetDuration}s = Scenes ${scenesTotalDuration}s + End Card ${endCardDuration}s`);
      console.log(`🎤 Target: ~${targetWordsPerScene} words per ${sceneDuration}s scene`);

      // Prepare image descriptions for AI
      const imageDescriptions = selectedImages.map((img, idx) => ({
        index: idx,
        description: img.alt || img.visualContent || 'Product image',
        category: img.category || 'general',
        url: img.url
      }));

      const systemPrompt = `You are an expert video scriptwriter specializing in ${platform} ads.

Generate a ${scenesTotalDuration}-second video script with exactly ${numScenes} scenes.
NOTE: These scenes will be followed by a ${endCardDuration}-second end card, totaling ${targetDuration} seconds.

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
- Scenes Duration: ${scenesTotalDuration} seconds (followed by ${endCardDuration}s end card)
- Total Video Duration: ${targetDuration} seconds
- Aspect Ratio: ${aspectRatio}
- Tone: ${tone}
- Voice Style: ${voiceStyle}
- Each scene should be approximately ${sceneDuration} seconds
- **CRITICAL**: Each voiceOver must be approximately ${targetWordsPerScene} words (~${sceneDuration}s of speech)

VOICEOVER LENGTH REQUIREMENTS:
- Speaking rate: ~2.5 words per second
- Each ${sceneDuration}s scene needs ~${targetWordsPerScene} words
- Write COMPLETE SENTENCES with natural flow
- Add detail, context, and emotion to fill the time
- Example BAD (too short): "Premium coffee beans"
- Example GOOD (proper length): "Discover our premium, hand-selected coffee beans, carefully roasted to perfection to bring out rich, bold flavors that coffee lovers crave every morning"

CRITICAL INSTRUCTIONS:
1. **VOICEOVER MUST BE DETAILED AND DESCRIPTIVE** - No short phrases!
2. Match images to narration semantically (e.g., if talking about a laptop, use laptop image)
3. Start with an attention-grabbing hook with detail
4. Include key benefits and features WITH EXPLANATIONS
5. End with a clear, detailed call-to-action that leads into the end card
6. Keep primary_text concise (max 5 words) but voiceOver MUST be longer
7. Use secondary_text for supporting details (max 8 words)
8. Match ${tone} tone and ${voiceStyle} voice throughout
9. Each voiceOver should tell a mini-story or explain a benefit thoroughly
10. Build momentum across scenes - start engaging, build interest, end with action

SCENE STRUCTURE GUIDE:
- Scene 1 (Hook): Grab attention with a compelling statement + context
- Middle Scenes: Explain features/benefits with descriptive language
- Final Scene: Strong call-to-action with urgency and reason

OUTPUT FORMAT (JSON only, no markdown):
{
  "scenes": [
    {
      "order": 1,
      "duration": ${sceneDuration},
      "primary_text": "Main headline (max 5 words)",
      "secondary_text": "Supporting text (max 8 words)",
      "text_style": "bold|normal|italic|uppercase",
      "voiceOver": "Detailed spoken narration with approximately ${targetWordsPerScene} words. This should be a complete, flowing sentence or two that provides context, detail, and emotion. Make it conversational and engaging.",
      "imageIndex": 0,
      "animation": "fade-in",
      "transition": "fade"
    }
  ]
}

Available text_style: bold, normal, italic, uppercase, bold_uppercase
Available animations: fade-in, zoom-in, slide-up, pan, zoom-out
Available transitions: fade, cut, dissolve, slide

REMEMBER: Longer voiceOver = Better engagement. Write naturally as if speaking to a friend, explaining why they should care about this product.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.7, // Slightly higher for more creative, longer text
        max_tokens: 3000 // Increased for longer responses
      });

      const jsonScript = JSON.parse(completion.choices[0].message.content);

      // Process and validate scenes
      const scenes = (jsonScript.scenes || []).map((scene, idx) => {
        let imageIndex = scene.imageIndex;
        
        // Validate image index
        if (typeof imageIndex !== 'number' || imageIndex < 0 || imageIndex >= selectedImages.length) {
          imageIndex = idx % selectedImages.length;
        }

        const selectedImage = selectedImages[imageIndex];
        
        // Validate voiceOver length
        const wordCount = (scene.voiceOver || '').trim().split(/\s+/).length;
        const estimatedDuration = wordCount / wordsPerSecond;
        
        console.log(`   Scene ${idx + 1}: ${wordCount} words (~${estimatedDuration.toFixed(1)}s estimated)`);
        
        // Warn if too short
        if (wordCount < targetWordsPerScene * 0.7) {
          console.warn(`   ⚠️ Scene ${idx + 1} voiceOver may be too short (${wordCount} words)`);
        }

        return {
          id: `scene_${idx + 1}`,
          order: scene.order || idx + 1,
          duration: scene.duration || sceneDuration,
          primary_text: scene.primary_text || '',
          secondary_text: scene.secondary_text || '',
          text_style: scene.text_style || 'normal',
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

  async updateScript(updates) {
    try {
      const currentScript = await this.getCurrentScript();
      
      if (!currentScript) {
        throw new Error('No script found to update');
      }

      let updatedScenes = [...currentScript.scenes];

      // Replace entire scenes array
      if (updates.scenes && Array.isArray(updates.scenes)) {
        console.log('🔄 Replacing entire scenes array...');
        updatedScenes = updates.scenes.map((scene, idx) => ({
          ...scene,
          id: scene.id || `scene_${idx + 1}`,
          order: scene.order || idx + 1
        }));
      }

      // Update specific scenes by ID
      if (updates.updateScenes && Array.isArray(updates.updateScenes)) {
        console.log('✏️ Updating specific scenes...');
        updates.updateScenes.forEach(sceneUpdate => {
          const sceneIndex = updatedScenes.findIndex(s => s.id === sceneUpdate.id);
          
          if (sceneIndex !== -1) {
            updatedScenes[sceneIndex] = {
              ...updatedScenes[sceneIndex],
              ...sceneUpdate,
              id: updatedScenes[sceneIndex].id,
              visuals: sceneUpdate.visuals ? {
                ...updatedScenes[sceneIndex].visuals,
                ...sceneUpdate.visuals
              } : updatedScenes[sceneIndex].visuals
            };
          }
        });
      }

      // Add new scenes
      if (updates.addScenes && Array.isArray(updates.addScenes)) {
        console.log('➕ Adding new scenes...');
        updates.addScenes.forEach(newScene => {
          const position = newScene.position || updatedScenes.length;
          const sceneToAdd = {
            id: newScene.id || `scene_${uuidv4().split('-')[0]}`,
            order: position + 1,
            duration: newScene.duration || 5,
            primary_text: newScene.primary_text || '',
            secondary_text: newScene.secondary_text || '',
            text_style: newScene.text_style || 'normal',
            voiceOver: newScene.voiceOver || '',
            visuals: newScene.visuals || { type: 'image', url: '', animation: 'fade-in' },
            transition: newScene.transition || 'dissolve'
          };
          
          updatedScenes.splice(position, 0, sceneToAdd);
        });
      }

      // Remove scenes
      if (updates.removeScenes && Array.isArray(updates.removeScenes)) {
        console.log('🗑️ Removing scenes...');
        updatedScenes = updatedScenes.filter(scene => 
          !updates.removeScenes.includes(scene.id)
        );
      }

      // Reorder scenes
      if (updates.reorderScenes && Array.isArray(updates.reorderScenes)) {
        console.log('🔀 Reordering scenes...');
        const reorderedScenes = [];
        
        updates.reorderScenes.forEach(sceneId => {
          const scene = updatedScenes.find(s => s.id === sceneId);
          if (scene) {
            reorderedScenes.push(scene);
          }
        });
        
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

      const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

      const scriptResult = {
        id: `script_${uuidv4().split('-')[0]}`,
        scenes: scenes,
        totalDuration: totalDuration,
        createdAt: new Date().toISOString()
      };

      await this.saveScriptToCsv(scriptResult);
      console.log('💾 Script saved successfully');

      return scriptResult;
    } catch (error) {
      throw new Error(`Failed to process and generate script: ${error.message}`);
    }
  }
}

module.exports = new ScriptService();