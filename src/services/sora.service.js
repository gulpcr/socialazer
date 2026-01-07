// src/services/sora.service.js

const fs = require('fs').promises;
const fsSync = require('fs'); 
const path = require('path');
const OpenAI = require('openai');
const Papa = require('papaparse');

class SoraService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Define Paths
    this.scrapedCsvPath = path.join(__dirname, '../../src/scraped.csv');
    this.scriptCsvPath = path.join(__dirname, '../../src/script.csv');
    this.configCsvPath = path.join(__dirname, '../../src/config.csv');
    this.outputDir = path.resolve(process.cwd(), 'outputs');

    // Ensure output directory exists
    if (!fsSync.existsSync(this.outputDir)) {
      fsSync.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async _readCsv(filePath, type = 'json_column', columnName = null) {
    try {
      const csvContent = await fs.readFile(filePath, 'utf-8');
      return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data.length > 0) {
              const lastRow = results.data[results.data.length - 1];
              if (type === 'json_column' && columnName) {
                try {
                  const jsonData = JSON.parse(lastRow[columnName]);
                  resolve(jsonData);
                } catch (parseError) {
                  reject(new Error(`Failed to parse JSON in ${columnName}`));
                }
              } else {
                resolve(lastRow);
              }
            } else {
              reject(new Error(`No data found in ${path.basename(filePath)}`));
            }
          },
          error: (err) => reject(err)
        });
      });
    } catch (error) {
      throw new Error(`File error: ${error.message}`);
    }
  }

  mapResolution(width, height) {
    const w = parseInt(width);
    const h = parseInt(height);
    const ratio = w / h;
    if (ratio < 1) {
      if (w <= 720) return '720x1280';
      return '1024x1792';
    } else {
      if (h <= 720) return '1280x720';
      return '1792x1024';
    }
  }

  constructElaborativePrompt(scriptData, scrapedData, configData) {
    const width = configData.width || 1080;
    const height = configData.height || 1920;
    const channel = configData.channel || 'social media';
    const duration = configData.duration || '10';
    
    const brandName = scrapedData.branding?.brandName || "The Brand";
    const colors = scrapedData.branding?.colors?.join(', ') || "Professional";
    const valueProp = scrapedData.extractedContent?.valueProposition || "";

    let prompt = `Create a video for "${brandName}".\n`;
    prompt += `STYLE: ${channel} commercial. High-end production.\n`;
    prompt += `BRANDING: Colors: ${colors}. Vibe: ${valueProp}.\n`;
    prompt += `Video duration msut be : ${duration}.`;
    prompt += `CAMERA: Cinematic, steady gimbal shots, 24fps.\n\n`;
    prompt += `--- VISUAL NARRATIVE SEQUENCE ---\n`;

    scriptData.scenes.forEach((scene, index) => {
      const visuals = scene.visuals || {};
      const action = visuals.visualContent || "Product showcase";
      const mood = visuals.mood || "Professional";
      const productType = visuals.productType || "The Product";
      // We rely on visual descriptions for the video generation
      prompt += `[Scene ${index + 1}]: Show ${productType}. ${action}. Mood: ${mood}. Lighting: Volumetric.\n`;
    });

    prompt += `\nREQUIREMENTS:\n`;
    prompt += `- NO generated text overlays.\n`;
    prompt += `- Seamless transitions between scenes.\n`;
    prompt += `- Photorealistic quality.`;

    return prompt;
  }

  // 1. START GENERATION
  async createReel() {
    try {
      console.log('🔄 SORA SERVICE: Preparing Data...');

      const [scrapedData, scriptData, configData] = await Promise.all([
        this._readCsv(this.scrapedCsvPath, 'json_column', 'data'),
        this._readCsv(this.scriptCsvPath, 'json_column', 'script'),
        this._readCsv(this.configCsvPath, 'flat')
      ]);

      const supportedSize = this.mapResolution(configData.width, configData.height);
      const soraPrompt = this.constructElaborativePrompt(scriptData, scrapedData, configData);
      
      console.log('🚀 Sending request to Sora-2-pro...');

      const video = await this.openai.videos.create({
        model: 'sora-2-pro', // Using specific model requested
        prompt: soraPrompt,
        size: supportedSize 
      });

      console.log('✨ Video generation started. ID:', video.id);

      return {
        success: true,
        videoId: video.id,
        status: video.status || 'processing'
      };

    } catch (error) {
      console.error("❌ Sora Create Error:", error);
      throw error;
    }
  }

  // 2. CHECK STATUS & DOWNLOAD (Specific Implementation)
  async downloadVideoIfReady(videoId) {
    try {
      const video = await this.openai.videos.retrieve(videoId);
      
      if (video.status === 'failed') {
          throw new Error('Sora video generation marked as failed by OpenAI.');
      }
      
      if (video.status === 'in_progress' || video.status === 'queued' || video.status === 'processing') {
          return { status: 'processing', progress: video.progress || 0 };
      }
      
      if (video.status === 'completed' || video.status === 'succeeded') {
          console.log('📥 Status Completed. Downloading video content...');
          
          // Using the specific download method requested
          const content = await this.openai.videos.downloadContent(videoId);
          console.log(videoId);
          const body = await content.arrayBuffer();
          const buffer = Buffer.from(body);
          
          const fileName = `sora_${videoId}.mp4`;
          const filePath = path.join(this.outputDir, fileName);
          
          await fs.writeFile(filePath, buffer);
          console.log(`✅ Video successfully downloaded to: ${filePath}`);

          return { 
              status: 'completed', 
              localPath: filePath 
          };
      }

      return { status: video.status };

    } catch (error) {
      console.error('Error in downloadVideoIfReady:', error.message);
      throw error;
    }
  }
}

const serviceInstance = new SoraService();
module.exports = {
  createReel: serviceInstance.createReel.bind(serviceInstance),
  downloadVideoIfReady: serviceInstance.downloadVideoIfReady.bind(serviceInstance)
};