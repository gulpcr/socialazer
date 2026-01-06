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

  /**
   * SMART SCRIPT GENERATION WITH IMAGE-AWARE MATCHING
   * This version uses the detailed image analysis to ensure
   * script content matches the actual images
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

      // Get available images WITH their detailed analysis
      const availableImages = scrapedData.media?.images || [];
      const selectedImages = availableImages.filter(img => img.selected !== false && img.url);

      if (selectedImages.length === 0) {
        throw new Error("No valid images found in scraped data.");
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

      /**
       * CRITICAL: Build detailed image descriptions for the AI
       * This is what ensures script matches images
       */
      const imageDescriptions = selectedImages.map((img, idx) => {
        // Use ALL the detailed fields from scraper analysis
        const productType = img.productType || 'Product';
        const productCategory = img.productCategory || 'general';
        const visualContent = img.visualContent || img.alt || 'Product image';
        const keyFeatures = img.keyFeatures?.join(', ') || '';
        const mood = img.mood || 'professional';
        const suggestedNarration = img.suggestedNarration || '';
        const bestUsedFor = img.bestUsedFor || 'feature';

        return {
          index: idx,
          productType,
          productCategory,
          visualContent,
          keyFeatures,
          mood,
          suggestedNarration,
          bestUsedFor,
          url: img.url
        };
      });

      // Group images by category for smarter matching
      const imagesByCategory = {
        hook: imageDescriptions.filter(i => i.bestUsedFor === 'hook'),
        feature: imageDescriptions.filter(i => i.bestUsedFor === 'feature'),
        detail: imageDescriptions.filter(i => i.bestUsedFor === 'detail'),
        lifestyle: imageDescriptions.filter(i => i.bestUsedFor === 'lifestyle'),
        cta: imageDescriptions.filter(i => i.bestUsedFor === 'cta')
      };

      // Get unique product types for the AI to focus on
      const uniqueProducts = [...new Set(imageDescriptions.map(i => i.productType).filter(p => p !== 'Product' && p !== 'Unknown product'))];
      const uniqueCategories = [...new Set(imageDescriptions.map(i => i.productCategory).filter(c => c !== 'general'))];

      console.log(`📸 Available images: ${selectedImages.length}`);
      console.log(`🏷️ Products detected: ${uniqueProducts.join(', ') || 'Various products'}`);
      console.log(`📁 Categories: ${uniqueCategories.join(', ') || 'General'}`);

      const systemPrompt = `You are an expert video scriptwriter for ${platform}.

CRITICAL RULE: The script MUST match the actual images available. Each scene's voiceOver MUST describe what's shown in the assigned image.

BRAND CONTEXT:
- Brand: ${brandName}
- Description: ${description}
- Value Proposition: ${valueProposition}
- Target Audience: ${targetAudience}
- Tone: ${tone}

PRODUCTS SHOWN IN IMAGES:
${uniqueProducts.length > 0 ? uniqueProducts.map(p => `• ${p}`).join('\n') : '• Various brand products'}

CATEGORIES:
${uniqueCategories.length > 0 ? uniqueCategories.map(c => `• ${c}`).join('\n') : '• General products'}

KEY POINTS:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

═══════════════════════════════════════════════════════════
AVAILABLE IMAGES (YOU MUST USE THESE - MATCH CONTENT TO IMAGE):
═══════════════════════════════════════════════════════════
${imageDescriptions.map(img => `
[IMAGE ${img.index}]
• Product: ${img.productType}
• Category: ${img.productCategory}
• Shows: ${img.visualContent}
• Features: ${img.keyFeatures || 'N/A'}
• Mood: ${img.mood}
• Best for: ${img.bestUsedFor}
• Suggested narration: ${img.suggestedNarration || 'N/A'}
`).join('\n')}
═══════════════════════════════════════════════════════════

REQUIREMENTS:
- Generate exactly ${numScenes} scenes
- Each scene: ${sceneDuration} seconds
- Each voiceOver: ~${targetWordsPerScene} words
- Platform: ${platform}
- Aspect Ratio: ${aspectRatio}

MATCHING RULES (VERY IMPORTANT):
1. Scene 1 (Hook): Use an image with bestUsedFor="hook" OR a hero/product image. Write about THAT specific product.
2. Middle scenes: Match the voiceOver to what's ACTUALLY in the image. If image shows earbuds, talk about earbuds - NOT laptops.
3. Final scene (CTA): Use any strong product image. Write a call-to-action relevant to that product.
4. NEVER write about a product that isn't shown in the assigned image.
5. Each scene's voiceOver should describe features/benefits of the SPECIFIC product in that scene's image.

SCENE STRUCTURE:
- Scene 1: Hook - Grab attention with the product shown in the first image
- Scenes 2-${numScenes - 1}: Features - Each scene talks about the product in ITS assigned image
- Scene ${numScenes}: CTA - Call to action for the brand

OUTPUT FORMAT (JSON only):
{
  "scenes": [
    {
      "order": 1,
      "duration": ${sceneDuration},
      "primary_text": "Short headline (max 5 words)",
      "secondary_text": "Supporting text (max 8 words)",
      "text_style": "bold",
      "voiceOver": "Narration that describes the product in IMAGE 0. Must be ~${targetWordsPerScene} words and specifically about what's shown in the image.",
      "imageIndex": 0,
      "animation": "zoom-in",
      "transition": "fade"
    }
  ]
}

REMEMBER: 
- Look at each image's "Product" and "Shows" fields
- Write voiceOver that matches THAT SPECIFIC image
- If image shows "MacBook Pro with silver finish", talk about MacBook Pro - not iPhone
- If image shows "wireless earbuds in charging case", talk about earbuds - not laptop`;

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

        // Validate imageIndex
        if (typeof imageIndex !== 'number' || imageIndex < 0 || imageIndex >= selectedImages.length || usedImageIndices.has(imageIndex)) {
          // Find an appropriate unused image based on scene position
          if (idx === 0) {
            // Hook - find hero/hook image
            const hookImg = imageDescriptions.find(i => !usedImageIndices.has(i.index) && (i.bestUsedFor === 'hook' || i.mood === 'premium'));
            imageIndex = hookImg?.index ?? 0;
          } else if (idx === jsonScript.scenes.length - 1) {
            // CTA - find lifestyle or product image
            const ctaImg = imageDescriptions.find(i => !usedImageIndices.has(i.index) && (i.bestUsedFor === 'cta' || i.bestUsedFor === 'lifestyle'));
            imageIndex = ctaImg?.index ?? (idx % selectedImages.length);
          } else {
            // Feature - find unused feature image
            const featureImg = imageDescriptions.find(i => !usedImageIndices.has(i.index));
            imageIndex = featureImg?.index ?? (idx % selectedImages.length);
          }
        }

        usedImageIndices.add(imageIndex);
        const selectedImage = selectedImages[imageIndex];

        // Log matching for debugging
        const wordCount = (scene.voiceOver || '').trim().split(/\s+/).length;
        console.log(`   Scene ${idx + 1}: Image ${imageIndex} (${selectedImage.productType || selectedImage.productCategory || 'product'}) | ${wordCount} words`);

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
            animation: scene.animation || 'fade-in',
            // Include image metadata for reference
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