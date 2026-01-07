// src/services/asset.service.js
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');

class AssetService {
  constructor() {
    // Define paths
    this.assetsBase = path.join(__dirname, '../assets');
    this.imagesDir = path.join(this.assetsBase, 'images');
    this.audioDir = path.join(this.assetsBase, 'audio');
    this.videosDir = path.join(this.assetsBase, 'videos');
    this.qrDir = path.join(this.assetsBase, 'qr');
    this.scriptCsvPath = path.join(__dirname, '../script.csv');
    
    // Enhanced timeout and retry settings
    this.downloadTimeout = 45000; 
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  /**
   * Sleep helper for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * FORCE CLEAN: Deletes directories entirely and recreates them.
   * This guarantees no old images remain.
   */
  async cleanAssets() {
    console.log('   🧹 Cleaning previous assets...');
    
    const dirsToClean = [this.imagesDir, this.audioDir, this.videosDir];

    for (const dir of dirsToClean) {
      try {
        // 1. Remove the directory and all its contents recursively
        await fs.rm(dir, { recursive: true, force: true });
        
        // 2. Recreate the empty directory immediately
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.warn(`   ⚠️ Warning cleaning dir ${path.basename(dir)}: ${error.message}`);
        // Attempt to verify existence or create if rm failed
        await this.ensureDirectory(dir);
      }
    }
    console.log('   ✅ Assets directory reset successfully.');
  }

  /**
   * Helper to ensure a specific directory exists
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Ensure all base directories exist (used if skipping clean)
   */
  async ensureDirectories() {
    await this.ensureDirectory(this.imagesDir);
    await this.ensureDirectory(this.audioDir);
    await this.ensureDirectory(this.videosDir);
    await this.ensureDirectory(this.qrDir);
  }

  /**
   * Download file with retry logic
   */
  async downloadFile(url, destinationPath, retryCount = 0) {
    try {
      console.log(`      📥 Downloading: ${path.basename(destinationPath)}`);
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: this.downloadTimeout,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        }
      });

      await fs.writeFile(destinationPath, response.data);
      return destinationPath;

    } catch (error) {
      const errorMessage = error.code || error.message;

      // Retry logic
      if (retryCount < this.maxRetries - 1) {
        console.log(`      ⚠️ Failed (Attempt ${retryCount + 1}): ${errorMessage}. Retrying...`);
        await this.sleep(this.retryDelay);
        return this.downloadFile(url, destinationPath, retryCount + 1);
      }

      throw new Error(`Failed to download ${url}: ${errorMessage}`);
    }
  }

  /**
   * MAIN: Download all script assets
   * Includes MANDATORY CLEANUP at the start
   */
  async downloadScriptAssets(scriptData) {
    try {
      console.log('\n⬇️ Starting Asset Pipeline...');

      // 1. CRITICAL: Clean old assets before doing anything else
      await this.cleanAssets();

      // Detect script format
      const hasScenes = scriptData.scenes && Array.isArray(scriptData.scenes);
      const hasElements = scriptData.elements && Array.isArray(scriptData.elements);

      if (!hasScenes && !hasElements) {
        throw new Error('Invalid script format: No scenes or elements found');
      }

      const downloadedAssets = {
        images: [],
        audio: [],
        videos: []
      };

      // Process NEW format (scenes)
      if (hasScenes) {
        console.log(`   📝 Processing ${scriptData.scenes.length} scenes...`);
        let imageIndex = 0;

        for (const scene of scriptData.scenes) {
          // Download scene image
          if (scene.visuals && scene.visuals.url) {
            const imageUrl = scene.visuals.url;
            const ext = this.getFileExtension(imageUrl);
            // Sequential naming guarantees ffmpeg sort order (image_0.jpg, image_1.jpg)
            const filename = `image_${imageIndex}.${ext}`;
            const destination = path.join(this.imagesDir, filename);

            try {
              await this.downloadFile(imageUrl, destination);
              downloadedAssets.images.push({
                sceneId: scene.id,
                filename,
                path: destination,
                url: imageUrl
              });
              imageIndex++;
            } catch (error) {
              console.error(`   ❌ Failed to download image for scene ${scene.id}: ${error.message}`);
            }
          }
        }
      }
      // Process OLD format (elements)
      else if (hasElements) {
        console.log(`   📝 Processing elements list...`);
        let imageIndex = 0;
        let videoIndex = 0;

        for (const element of scriptData.elements) {
          try {
            if (element.type === 'image' && element.url) {
              const ext = this.getFileExtension(element.url);
              const filename = `image_${imageIndex}.${ext}`;
              const destination = path.join(this.imagesDir, filename);

              await this.downloadFile(element.url, destination);
              downloadedAssets.images.push({
                index: imageIndex,
                filename,
                path: destination
              });
              imageIndex++;
            } else if (element.type === 'video' && element.url) {
              const ext = this.getFileExtension(element.url);
              const filename = `video_${videoIndex}.${ext}`;
              const destination = path.join(this.videosDir, filename);

              await this.downloadFile(element.url, destination);
              downloadedAssets.videos.push({
                index: videoIndex,
                filename,
                path: destination
              });
              videoIndex++;
            }
          } catch (error) {
            console.error(`   ❌ Failed asset: ${error.message}`);
          }
        }
      }

      console.log(`\n   ✅ Asset Pipeline Complete`);
      console.log(`      • Images: ${downloadedAssets.images.length}`);
      console.log(`      • Videos: ${downloadedAssets.videos.length}`);

      if (downloadedAssets.images.length === 0 && downloadedAssets.videos.length === 0) {
        throw new Error('No assets were successfully downloaded');
      }

      return downloadedAssets;

    } catch (error) {
      console.error('❌ Asset Download Failed:', error.message);
      throw error;
    }
  }

  getFileExtension(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const ext = path.extname(pathname).slice(1).toLowerCase();
      if (!ext || ext.length > 4) return 'jpg';
      return ext;
    } catch {
      return 'jpg';
    }
  }

  // Helper to read script (Utility)
  async getCurrentScript() {
    try {
      const csvContent = await fs.readFile(this.scriptCsvPath, 'utf-8');
      return new Promise((resolve) => {
        Papa.parse(csvContent, {
          header: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              try {
                resolve(JSON.parse(results.data[results.data.length - 1].script));
              } catch { resolve(null); }
            } else { resolve(null); }
          }
        });
      });
    } catch { return null; }
  }
}

module.exports = new AssetService();