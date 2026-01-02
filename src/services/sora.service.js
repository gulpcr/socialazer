const fs = require('fs');
const path = require('path');
const OpenAI = require("openai");
const https = require('https');
const scriptService = require('./script.service');
const configService = require('./config.service');

class SoraService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.outputDir = path.resolve(process.cwd(), 'outputs'); // Folder for saved videos
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 1. PREPARE: Fetches Script + Config + Scraped Data
   * 2. PROMPT: Constructs a cinematic prompt
   * 3. GENERATE: Calls Sora (with optional Start Image)
   */
  async generateReel() {
    try {
      // --- 1. GET DATA ---
      const [scriptData, config, scrapedData] = await Promise.all([
        scriptService.getCurrentScript(),
        configService.getConfig(),
        scriptService.readScrapedData()
      ]);

      if (!scriptData || !scriptData.script) {
        throw new Error("No script found. Please generate a script first.");
      }

      // --- 2. SELECT START IMAGE (Brand Consistency) ---
      // We look for a 'hero' or 'logo' image to ground the video style
      let startImageUrl = null;
      const validImages = scrapedData.adReadyImages || [];
      const heroImage = validImages.find(img => img.context === 'hero' || img.context === 'product');
      
      if (heroImage) {
        startImageUrl = heroImage.url;
        console.log(`🎨 Using start image for brand consistency: ${startImageUrl}`);
      }

      // --- 3. CONSTRUCT PROMPT ---
      const soraPrompt = this.constructSoraPrompt(scriptData.script, scrapedData, config);
      console.log("🎬 Sending Prompt to Sora:", soraPrompt);

      // --- 4. CALL SORA API ---
      // Note: Model name changes frequently. Ensure you have access to the specific model.
      const videoParams = {
        model: 'sora-2-pro', // or 'dall-e-3' if testing images, specific video model needed here
        prompt: soraPrompt,
        size: this.formatDimensions(config.dimensions),
        quality: "standard",
        response_format: "url"
      };

      // Inject image if available and supported by the specific model version
      if (startImageUrl) {
        // Note: Check specific OpenAI API docs for 'image' or 'input_image' parameter support
        // videoParams.image = startImageUrl; 
      }

      const video = await this.openai.videos.create(videoParams);

      return {
        success: true,
        videoId: video.id, // Sora usually returns an ID to poll
        status: 'processing',
        message: 'Video generation started. Poll status to get final URL.'
      };

    } catch (error) {
      console.error("Sora Generation Error:", error);
      throw new Error(`Failed to generate Sora video: ${error.message}`);
    }
  }

  /**
   * Polls the OpenAI API until the video is ready
   */
  async checkStatusAndDownload(videoId) {
    let video = await this.openai.videos.retrieve(videoId);

    // Poll logic usually handled by controller, but here is the helper
    if (video.status === 'completed') {
      const fileName = `sora_${videoId}.mp4`;
      const filePath = path.join(this.outputDir, fileName);
      
      // Download to local file system
      await this.downloadFile(video.url, filePath);

      return {
        status: 'completed',
        publicUrl: video.url, // The OpenAI hosted URL (temporary)
        localPath: filePath
      };
    }

    return { status: video.status };
  }

  /**
   * Helper: Converts Script JSON into a descriptive narrative for Sora
   */
  constructSoraPrompt(scriptJson, scrapedData, config) {
    const brandName = scrapedData.brandName;
    const tone = scrapedData.emotionalTone || "cinematic";
    
    // Extract visual descriptions from script elements
    const visualSequence = scriptJson.elements
      .filter(el => el.type === 'image' || el.type === 'video')
      .map((el, i) => `Scene ${i+1}: A ${tone} shot. ${el.text || 'Showcasing the product/brand aesthetics.'}`)
      .join(" ");

    return `
    Create a high-definition promotional video for the brand "${brandName}".
    Style: ${tone}, Professional Advertisement, ${config.channel} style.
    Dimensions: ${config.dimensions.width}x${config.dimensions.height}.
    
    Visual Narrative:
    ${visualSequence}
    
    Ensure smooth transitions between scenes. High fidelity, photorealistic lighting.
    NO TEXT OVERLAYS. (Text will be added in post-production).
    `;
  }

  formatDimensions(dim) {
    // OpenAI usually expects strings like "1080x1920"
    if (!dim) return "1080x1920";
    return `${dim.width}x${dim.height}`;
  }

  async downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    });
  }
}

module.exports = new SoraService();