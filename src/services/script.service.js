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
    // Added config path
    this.configCsvPath = path.join(__dirname, '../../src/config.csv'); 
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

  /**
   * Helper to convert aspect ratio string to resolution dimensions
   */
  getResolutionFromAspectRatio(ratio) {
    const resolutions = {
      '9:16': { width: 1080, height: 1920 },
      '16:9': { width: 1920, height: 1080 },
      '1:1':  { width: 1080, height: 1080 },
      '4:5':  { width: 1080, height: 1350 }
    };
    // Default to 9:16 (1080x1920) if unknown
    return resolutions[ratio] || { width: 1080, height: 1920 };
  }

  /**
   * Saves the generation configuration to config.csv
   */
  async saveConfigToCsv(config) {
    try {
      const resolution = this.getResolutionFromAspectRatio(config.aspectRatio);
      
      const configData = [{
        channel: config.platform,
        duration: config.duration,
        adType: 'sales', // Defaulting to sales as per requirement, or could map from tone
        width: resolution.width,
        height: resolution.height,
        voiceover: true,
        updatedAt: new Date().toISOString()
      }];

      const csv = Papa.unparse(configData);
      await fs.writeFile(this.configCsvPath, csv, 'utf-8');
      console.log('💾 Config saved to src/config.csv');
    } catch (error) {
      console.error('Failed to save config:', error);
      // We log but don't throw here to ensure script generation continues even if config save fails
    }
  }

  /**
   * SMART SCRIPT GENERATION WITH IMAGE-AWARE MATCHING
   * GRACEFUL FALLBACK: If no images, generates text-only script structure.
   */
  async generateScriptWithGPT(scrapedData, config) {
    try {
      const { platform, duration, aspectRatio, tone, voiceStyle } = config;

      const brandName = scrapedData.branding?.brandName || scrapedData.brandName || 'Our Brand';
      const description = scrapedData.extractedContent?.description || scrapedData.description || '';
      const valueProposition = scrapedData.extractedContent?.valueProposition || '';
      const targetAudience = scrapedData.extractedContent?.targetAudience || '';
      const keyPoints = scrapedData.extractedContent?.keyPoints || [];
      const headlines = scrapedData.extractedContent?.headlines || [];

      // Get available images
      const availableImages = scrapedData.media?.images || [];
      const selectedImages = availableImages.filter(img => img.selected !== false && img.url);
      const hasImages = selectedImages.length > 0;

      if (!hasImages) {
        console.warn("⚠️ No valid images found. Generating script with placeholders.");
      }

      // Calculate scene parameters
      const targetDuration = parseInt(duration);
      const endCardDuration = 5;
      const scenesTotalDuration = targetDuration - endCardDuration;
      const sceneDuration = scenesTotalDuration <= 10 ? 3 : 5;
      const numScenes = Math.floor(scenesTotalDuration / sceneDuration);
      const wordsPerSecond = 2.5;
      const targetWordsPerScene = Math.floor(sceneDuration * wordsPerSecond);

      console.log(`📊 Duration: ${targetDuration}s = ${scenesTotalDuration}s scenes + ${endCardDuration}s end card`);
      console.log(`🎬 Generating ${numScenes} scenes x ${sceneDuration}s each`);

      let imageDescriptions = [];
      let uniqueProducts = [];
      let uniqueCategories = [];

      if (hasImages) {
        /**
         * Build detailed image descriptions for the AI
         */
        imageDescriptions = selectedImages.map((img, idx) => {
          return {
            index: idx,
            productType: img.productType || 'Product',
            productCategory: img.productCategory || 'general',
            visualContent: img.visualContent || img.alt || 'Product image',
            keyFeatures: img.keyFeatures?.join(', ') || '',
            mood: img.mood || 'professional',
            suggestedNarration: img.suggestedNarration || '',
            bestUsedFor: img.bestUsedFor || 'feature',
            url: img.url
          };
        });

        uniqueProducts = [...new Set(imageDescriptions.map(i => i.productType).filter(p => p !== 'Product' && p !== 'Unknown product'))];
        uniqueCategories = [...new Set(imageDescriptions.map(i => i.productCategory).filter(c => c !== 'general'))];
      } else {
        // Fallback for no images
        uniqueProducts = [scrapedData.extractedContent?.pageType || 'Brand Product'];
        uniqueCategories = ['General'];
      }

      console.log(`📸 Available images: ${selectedImages.length}`);

      // Dynamic System Prompt based on image availability
      const matchingInstructions = hasImages 
        ? `AVAILABLE IMAGES (YOU MUST USE THESE - MATCH CONTENT TO IMAGE):
═══════════════════════════════════════════════════════════
${imageDescriptions.map(img => `
[IMAGE ${img.index}]
• Product: ${img.productType}
• Category: ${img.productCategory}
• Shows: ${img.visualContent}
• Features: ${img.keyFeatures || 'N/A'}
• Mood: ${img.mood}
• Best for: ${img.bestUsedFor}
`).join('\n')}
═══════════════════════════════════════════════════════════

MATCHING RULES:
1. Scene 1 (Hook): Use an image with bestUsedFor="hook" or hero image.
2. Match voiceOver to the assigned image content.
3. NEVER write about a product not shown in the assigned image.`
        
        : `NO IMAGES DETECTED:
- Generate a script based purely on the text/brand data.
- Leave 'imageIndex' as -1.
- Focus on general brand benefits and value proposition.`;

      const systemPrompt = `You are an expert video scriptwriter for ${platform}.

BRAND CONTEXT:
- Brand: ${brandName}
- Description: ${description}
- Value Proposition: ${valueProposition}
- Target Audience: ${targetAudience}
- Tone: ${tone}

PRODUCTS/CONTEXT:
${uniqueProducts.length > 0 ? uniqueProducts.map(p => `• ${p}`).join('\n') : '• General Brand Services'}

KEY POINTS:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

${matchingInstructions}

REQUIREMENTS:
- Generate exactly ${numScenes} scenes
- Each scene: ${sceneDuration} seconds
- Each voiceOver: ~${targetWordsPerScene} words
- Platform: ${platform}
- Aspect Ratio: ${aspectRatio}

OUTPUT FORMAT (JSON only):
{
  "scenes": [
    {
      "order": 1,
      "duration": ${sceneDuration},
      "primary_text": "Short headline (max 5 words)",
      "secondary_text": "Supporting text (max 8 words)",
      "text_style": "bold",
      "voiceOver": "Narration text.",
      "imageIndex": ${hasImages ? 0 : -1},
      "animation": "zoom-in",
      "transition": "fade"
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 4000
      });

      const jsonScript = JSON.parse(completion.choices[0].message.content);

      // Process scenes with validation
      const usedImageIndices = new Set();

      const scenes = (jsonScript.scenes || []).map((scene, idx) => {
        let imageIndex = scene.imageIndex;
        let selectedImage = null;

        if (hasImages) {
          // Validate imageIndex if images exist
          if (typeof imageIndex !== 'number' || imageIndex < 0 || imageIndex >= selectedImages.length || usedImageIndices.has(imageIndex)) {
            // Find appropriate unused image
            if (idx === 0) {
              const hookImg = imageDescriptions.find(i => !usedImageIndices.has(i.index) && (i.bestUsedFor === 'hook' || i.mood === 'premium'));
              imageIndex = hookImg?.index ?? 0;
            } else if (idx === jsonScript.scenes.length - 1) {
              const ctaImg = imageDescriptions.find(i => !usedImageIndices.has(i.index) && (i.bestUsedFor === 'cta' || i.bestUsedFor === 'lifestyle'));
              imageIndex = ctaImg?.index ?? (idx % selectedImages.length);
            } else {
              const featureImg = imageDescriptions.find(i => !usedImageIndices.has(i.index));
              imageIndex = featureImg?.index ?? (idx % selectedImages.length);
            }
          }
          usedImageIndices.add(imageIndex);
          selectedImage = selectedImages[imageIndex];
        } else {
          // No images exist - create fallback placeholder
          imageIndex = -1;
          selectedImage = {
            url: '', // Empty URL indicates no image
            productType: 'Generic',
            productCategory: 'General'
          };
        }

        // Log for debugging
        const wordCount = (scene.voiceOver || '').trim().split(/\s+/).length;
        if (hasImages && selectedImage) {
           console.log(`   Scene ${idx + 1}: Image ${imageIndex} (${selectedImage.productType}) | ${wordCount} words`);
        } else {
           console.log(`   Scene ${idx + 1}: No Image (Placeholder) | ${wordCount} words`);
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
            url: selectedImage.url || '', // Graceful fallback
            animation: scene.animation || 'fade-in',
            productType: selectedImage.productType,
            productCategory: selectedImage.productCategory
          },
          transition: scene.transition || 'dissolve'
        };
      });

      return scenes;

    } catch (error) {
      throw new Error(`Failed to generate script: ${error.message}`);
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
      if (!currentScript) throw new Error('No script found to update');

      let updatedScenes = [...currentScript.scenes];

      if (updates.scenes && Array.isArray(updates.scenes)) {
        updatedScenes = updates.scenes.map((scene, idx) => ({
          ...scene,
          id: scene.id || `scene_${idx + 1}`,
          order: scene.order || idx + 1
        }));
      }

      if (updates.updateScenes && Array.isArray(updates.updateScenes)) {
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

      if (updates.addScenes && Array.isArray(updates.addScenes)) {
        updates.addScenes.forEach(newScene => {
          const position = newScene.position || updatedScenes.length;
          updatedScenes.splice(position, 0, {
            id: newScene.id || `scene_${uuidv4().split('-')[0]}`,
            order: position + 1,
            duration: newScene.duration || 5,
            primary_text: newScene.primary_text || '',
            secondary_text: newScene.secondary_text || '',
            text_style: newScene.text_style || 'normal',
            voiceOver: newScene.voiceOver || '',
            visuals: newScene.visuals || { type: 'image', url: '', animation: 'fade-in' },
            transition: newScene.transition || 'dissolve'
          });
        });
      }

      if (updates.removeScenes && Array.isArray(updates.removeScenes)) {
        updatedScenes = updatedScenes.filter(scene => !updates.removeScenes.includes(scene.id));
      }

      if (updates.reorderScenes && Array.isArray(updates.reorderScenes)) {
        const reordered = [];
        updates.reorderScenes.forEach(sceneId => {
          const scene = updatedScenes.find(s => s.id === sceneId);
          if (scene) reordered.push(scene);
        });
        updatedScenes.forEach(scene => {
          if (!updates.reorderScenes.includes(scene.id)) reordered.push(scene);
        });
        updatedScenes = reordered;
      }

      updatedScenes = updatedScenes.map((scene, idx) => ({ ...scene, order: idx + 1 }));

      const updatedScript = {
        ...currentScript,
        scenes: updatedScenes,
        totalDuration: updatedScenes.reduce((sum, s) => sum + (s.duration || 0), 0),
        updatedAt: new Date().toISOString()
      };

      await this.saveScriptToCsv(updatedScript);
      return updatedScript;
    } catch (error) {
      throw new Error(`Failed to update script: ${error.message}`);
    }
  }

  async processAndGenerateScript(analysisId, config) {
    try {
      // Step 0: Save Configuration to CSV immediately
      await this.saveConfigToCsv(config);

      console.log('📖 Reading scraped data...');
      const scrapedData = await this.readScrapedData();

      console.log('✅ Validating analysis ID...');
      this.validateAnalysisId(scrapedData, analysisId);

      // Log available image data for debugging
      const images = scrapedData.media?.images || [];
      console.log(`\n📸 Available images with analysis:`);
      images.slice(0, 5).forEach((img, i) => {
        console.log(`   ${i + 1}. ${img.productType || 'Unknown'} (${img.productCategory || 'general'}) - ${img.bestUsedFor || 'feature'}`);
      });

      console.log('\n🎬 Generating script with image-aware matching...');
      const scenes = await this.generateScriptWithGPT(scrapedData, config);

      const scriptResult = {
        id: `script_${uuidv4().split('-')[0]}`,
        scenes,
        totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
        createdAt: new Date().toISOString()
      };

      await this.saveScriptToCsv(scriptResult);
      console.log('💾 Script saved successfully');

      return scriptResult;
    } catch (error) {
      throw new Error(`Script generation failed: ${error.message}`);
    }
  }
}

module.exports = new ScriptService();