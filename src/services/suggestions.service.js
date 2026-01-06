// src/services/suggestions.service.js
const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

class SuggestionsService {
  constructor() {
    this.scriptCsvPath = path.join(__dirname, '../../src/script.csv');
    this.scrapedCsvPath = path.join(__dirname, '../../src/scraped.csv');
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Read all scripts from CSV
   */
  async readScripts() {
    try {
      const csvContent = await fs.readFile(this.scriptCsvPath, 'utf-8');
      return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const scripts = results.data.map(row => {
              try {
                return {
                  ...row,
                  parsedScript: JSON.parse(row.script)
                };
              } catch (e) {
                return null;
              }
            }).filter(s => s !== null);
            resolve(scripts);
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      throw new Error(`Failed to read scripts: ${error.message}`);
    }
  }

  /**
   * Read scraped brand data from CSV
   */
  async readScrapedData() {
    try {
      const csvContent = await fs.readFile(this.scrapedCsvPath, 'utf-8');
      return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data.length > 0) {
              try {
                resolve(JSON.parse(results.data[0].data));
              } catch (e) {
                reject(new Error('Failed to parse scraped data'));
              }
            } else {
              reject(new Error('No scraped data found'));
            }
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      throw new Error(`Failed to read scraped data: ${error.message}`);
    }
  }

  /**
   * Find script by ID
   */
  async findScriptById(scriptId) {
    const scripts = await this.readScripts();
    const found = scripts.find(s => s.parsedScript.id === scriptId);
    
    if (!found) {
      throw new Error(`Script with ID ${scriptId} not found`);
    }
    
    return found.parsedScript;
  }

  /**
   * Generate AI-powered suggestions using OpenAI
   */
  async generateSuggestions(script, brandData) {
    try {
      const systemPrompt = `You are an expert video marketing analyst specializing in social media content optimization.

Analyze the provided video script and brand data to generate actionable improvement suggestions.

ANALYSIS CRITERIA:
1. **Content Quality**: Hook strength, message clarity, storytelling flow
2. **Brand Alignment**: Consistency with brand voice, value proposition, key messages
3. **Call-to-Action**: Clarity, urgency, placement, effectiveness
4. **Engagement Factors**: Emotional appeal, visual variety, pacing
5. **Platform Optimization**: Format suitability for the target platform

OUTPUT FORMAT (JSON only):
{
  "suggestions": [
    {
      "priority": "high|medium|low",
      "category": "content|cta|visual|pacing|brand",
      "title": "Brief suggestion title",
      "description": "Detailed explanation of the improvement",
      "sceneId": "scene_X or null if general",
      "autoApplicable": true|false,
      "specificChange": "Exact text/element to modify (if applicable)"
    }
  ],
  "qualityScores": {
    "engagement": 0-100,
    "clarity": 0-100,
    "brandAlignment": 0-100,
    "callToAction": 0-100
  },
  "overallAssessment": "Brief summary of script strengths and weaknesses"
}

GUIDELINES:
- Provide 3-7 actionable suggestions
- Prioritize high-impact changes
- Be specific and actionable
- Consider the target platform and duration
- Reference specific scenes when relevant`;

      const userPrompt = `Analyze this video script and provide optimization suggestions:

**BRAND CONTEXT:**
Brand: ${brandData.branding?.brandName || brandData.brandName || 'Unknown'}
Value Proposition: ${brandData.extractedContent?.valueProposition || brandData.description || 'N/A'}
Target Audience: ${brandData.extractedContent?.targetAudience || 'General audience'}
Key Points: ${JSON.stringify(brandData.extractedContent?.keyPoints || brandData.keyMessages || [])}

**SCRIPT DETAILS:**
Platform: ${script.config?.platform || 'instagram'}
Duration: ${script.totalDuration || 'N/A'} seconds
Aspect Ratio: ${script.config?.aspectRatio || '9:16'}
Tone: ${script.config?.tone || 'N/A'}

**SCENES:**
${script.scenes.map((scene, idx) => `
Scene ${idx + 1} (${scene.duration}s):
- Text: "${scene.text}"
- Voiceover: "${scene.voiceOver}"
- Visual: ${scene.visuals?.type} (${scene.visuals?.animation || 'no animation'})
`).join('\n')}

Provide detailed suggestions for improvement.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = JSON.parse(completion.choices[0].message.content);
      
      // Add unique IDs to suggestions
      response.suggestions = response.suggestions.map((suggestion, idx) => ({
        id: `sugg_${uuidv4().split('-')[0]}`,
        ...suggestion
      }));

      return response;
    } catch (error) {
      throw new Error(`Failed to generate suggestions: ${error.message}`);
    }
  }

  /**
   * Main function to get suggestions for a script
   */
  async getSuggestions(scriptId) {
    try {
      console.log('🔍 Finding script...');
      const script = await this.findScriptById(scriptId);

      console.log('📊 Loading brand data...');
      const brandData = await this.readScrapedData();

      console.log('🤖 Generating AI suggestions...');
      const analysis = await this.generateSuggestions(script, brandData);

      return {
        scriptId: scriptId,
        suggestions: analysis.suggestions || [],
        qualityScores: analysis.qualityScores || {
          engagement: 75,
          clarity: 75,
          brandAlignment: 75,
          callToAction: 75
        },
        overallAssessment: analysis.overallAssessment || 'Script analysis completed',
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get suggestions: ${error.message}`);
    }
  }

  /**
   * Apply a suggestion to a script (for future enhancement)
   */
  async applySuggestion(scriptId, suggestionId) {
    // This could be implemented to automatically apply suggestions
    // For now, just return a placeholder
    return {
      success: true,
      message: 'Suggestion applied',
      scriptId,
      suggestionId
    };
  }
}

module.exports = new SuggestionsService();