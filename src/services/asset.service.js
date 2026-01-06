const axios = require('axios');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');

const pipeline = promisify(stream.pipeline);

class AssetService {
  constructor() {
    // Define local storage path
    this.assetsDir = path.join(__dirname, '../assets/images');
  }

  /**
   * Downloads all images defined in the script.
   * Supports both NEW format (scenes) and OLD format (elements).
   * Cleans the directory first to ensure a fresh start (POC mode).
   * @param {Object} scriptData - The JSON object from script.service
   */
  async downloadScriptAssets(scriptData) {
    try {
      console.log('⬇️ Starting Asset Download...');

      // 1. Clean Slate: Remove existing directory and recreate it
      if (fs.existsSync(this.assetsDir)) {
        fs.rmSync(this.assetsDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.assetsDir, { recursive: true });

      // 2. Extract image URLs from script (handle both formats)
      let imageUrls = [];

      // NEW FORMAT: scenes array
      if (scriptData.scenes && Array.isArray(scriptData.scenes)) {
        console.log('   📝 Processing NEW script format (scenes)...');
        imageUrls = scriptData.scenes
          .filter(scene => scene.visuals && scene.visuals.url)
          .map(scene => scene.visuals.url);
      }
      // OLD FORMAT: elements array
      else if (scriptData.elements && Array.isArray(scriptData.elements)) {
        console.log('   📝 Processing OLD script format (elements)...');
        imageUrls = scriptData.elements
          .filter(el => el.type === 'image' && el.url)
          .map(el => el.url);
      }
      else {
        throw new Error('Invalid script data: No scenes or elements found.');
      }

      if (imageUrls.length === 0) {
        console.warn('⚠️ No images found in script to download.');
        return [];
      }

      // Remove duplicates
      imageUrls = [...new Set(imageUrls)];

      const results = [];

      // 3. Download images sequentially
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        
        // Determine file extension (default to .jpg if unknown)
        // We strip query parameters (e.g., image.jpg?width=500 -> .jpg)
        let ext = path.extname(url).split('?')[0];
        if (!ext || ext === '') ext = '.jpg';

        // Naming convention: image_0.jpg, image_1.jpg
        // This makes it easy for FFmpeg to find them later
        const filename = `image_${i}${ext}`;
        const localPath = path.join(this.assetsDir, filename);

        console.log(`   Downloading (${i+1}/${imageUrls.length}): ${filename}`);
        
        await this.downloadFile(url, localPath);

        results.push({
          originalUrl: url,
          localPath: localPath,
          index: i
        });
      }

      console.log(`✅ Successfully downloaded ${results.length} images to ${this.assetsDir}`);
      return results;

    } catch (error) {
      console.error('❌ Asset Download Failed:', error.message);
      throw error;
    }
  }

  /**
   * Helper to download a single file using Axios streams
   */
  async downloadFile(url, outputPath) {
    try {
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      await pipeline(response.data, fs.createWriteStream(outputPath));
    } catch (error) {
      throw new Error(`Failed to download ${url}: ${error.message}`);
    }
  }
}

module.exports = new AssetService();