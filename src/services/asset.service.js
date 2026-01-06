// src/services/asset.service.js
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');

class AssetService {
  constructor() {
    this.imagesDir = path.join(__dirname, '../assets/images');
    this.audioDir = path.join(__dirname, '../assets/audio');
    this.videosDir = path.join(__dirname, '../assets/videos');
    this.qrDir = path.join(__dirname, '../assets/qr');
    this.scriptCsvPath = path.join(__dirname, '../script.csv');
    
    // Enhanced timeout and retry settings
    this.downloadTimeout = 45000; // 45 seconds (increased from 15s)
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds between retries
  }

  /**
   * Sleep helper for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ENHANCED: Download file with retry logic and extended timeout
   */
  async downloadFile(url, destinationPath, retryCount = 0) {
    try {
      console.log(`      📥 Downloading: ${path.basename(destinationPath)} (attempt ${retryCount + 1}/${this.maxRetries})`);
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: this.downloadTimeout, // 45 seconds
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        // Progress tracking
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percentCompleted % 25 === 0) { // Log at 25%, 50%, 75%, 100%
              process.stdout.write(`\r      ⏳ Progress: ${percentCompleted}%`);
            }
          }
        }
      });

      await fs.writeFile(destinationPath, response.data);
      const fileSizeKB = (response.data.length / 1024).toFixed(2);
      console.log(`\r      ✅ Downloaded: ${path.basename(destinationPath)} (${fileSizeKB} KB)`);
      
      return destinationPath;

    } catch (error) {
      const errorMessage = error.code === 'ECONNABORTED' ? 'timeout' : 
                          error.code === 'ENOTFOUND' ? 'DNS lookup failed' :
                          error.response?.status ? `HTTP ${error.response.status}` :
                          error.message;

      console.log(`\r      ⚠️ Attempt ${retryCount + 1} failed: ${errorMessage}`);

      // Retry logic
      if (retryCount < this.maxRetries - 1) {
        console.log(`      🔄 Retrying in ${this.retryDelay / 1000}s...`);
        await this.sleep(this.retryDelay);
        return this.downloadFile(url, destinationPath, retryCount + 1);
      }

      // All retries exhausted
      throw new Error(`Failed to download ${url} after ${this.maxRetries} attempts: ${errorMessage}`);
    }
  }

  /**
   * Read current script from CSV
   */
  async getCurrentScript() {
    try {
      const csvContent = await fs.readFile(this.scriptCsvPath, 'utf-8');
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              try {
                const script = JSON.parse(results.data[results.data.length - 1].script);
                resolve(script);
              } catch (e) {
                reject(new Error('Failed to parse script JSON'));
              }
            } else {
              reject(new Error('No script data found in CSV'));
            }
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      throw new Error(`Failed to read script: ${error.message}`);
    }
  }

  /**
   * Ensure directories exist
   */
  async ensureDirectories() {
    const dirs = [this.imagesDir, this.audioDir, this.videosDir, this.qrDir];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Clean existing assets (optional - for fresh start)
   */
  async cleanAssets() {
    try {
      console.log('   🧹 Cleaning old assets...');
      
      // Remove old images
      try {
        const imageFiles = await fs.readdir(this.imagesDir);
        for (const file of imageFiles) {
          await fs.unlink(path.join(this.imagesDir, file));
        }
      } catch {}

      console.log('   ✅ Assets cleaned');
    } catch (error) {
      console.warn('   ⚠️ Could not clean assets:', error.message);
    }
  }

  /**
   * MAIN: Download all script assets with enhanced error handling
   */
  async downloadScriptAssets(scriptData) {
    try {
      console.log('⬇️ Starting Asset Download...');
      
      // Ensure directories exist
      await this.ensureDirectories();

      // Detect script format
      const hasScenes = scriptData.scenes && Array.isArray(scriptData.scenes);
      const hasElements = scriptData.elements && Array.isArray(scriptData.elements);

      if (!hasScenes && !hasElements) {
        throw new Error('Invalid script format: No scenes or elements found');
      }

      console.log(`   📝 Processing ${hasScenes ? 'NEW' : 'OLD'} script format (${hasScenes ? 'scenes' : 'elements'})...`);

      const downloadedAssets = {
        images: [],
        audio: [],
        videos: []
      };

      // Process NEW format (scenes)
      if (hasScenes) {
        let imageIndex = 0;

        for (const scene of scriptData.scenes) {
          // Download scene image
          if (scene.visuals && scene.visuals.url) {
            const imageUrl = scene.visuals.url;
            const ext = this.getFileExtension(imageUrl);
            const filename = `image_${imageIndex}.${ext}`;
            const destination = path.join(this.imagesDir, filename);

            console.log(`   Downloading (${imageIndex + 1}/${scriptData.scenes.length}): ${filename}`);

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
              console.log(`   ⏭️ Skipping this image, continuing with others...`);
              // Continue with next image instead of failing entire process
            }
          }
        }
      }
      // Process OLD format (elements)
      else if (hasElements) {
        let imageIndex = 0;
        let videoIndex = 0;

        for (const element of scriptData.elements) {
          try {
            if (element.type === 'image' && element.url) {
              const ext = this.getFileExtension(element.url);
              const filename = `image_${imageIndex}.${ext}`;
              const destination = path.join(this.imagesDir, filename);

              console.log(`   Downloading image ${imageIndex + 1}: ${filename}`);
              await this.downloadFile(element.url, destination);

              downloadedAssets.images.push({
                elementIndex: imageIndex,
                filename,
                path: destination,
                url: element.url
              });

              imageIndex++;
            } else if (element.type === 'video' && element.url) {
              const ext = this.getFileExtension(element.url);
              const filename = `video_${videoIndex}.${ext}`;
              const destination = path.join(this.videosDir, filename);

              console.log(`   Downloading video ${videoIndex + 1}: ${filename}`);
              await this.downloadFile(element.url, destination);

              downloadedAssets.videos.push({
                elementIndex: videoIndex,
                filename,
                path: destination,
                url: element.url
              });

              videoIndex++;
            }
          } catch (error) {
            console.error(`   ❌ Failed to download asset: ${error.message}`);
            console.log(`   ⏭️ Continuing with remaining assets...`);
            // Continue instead of failing
          }
        }
      }

      // Summary
      console.log('\n   📊 Download Summary:');
      console.log(`      • Images: ${downloadedAssets.images.length} downloaded`);
      console.log(`      • Videos: ${downloadedAssets.videos.length} downloaded`);
      console.log(`      • Audio: ${downloadedAssets.audio.length} downloaded`);

      if (downloadedAssets.images.length === 0 && downloadedAssets.videos.length === 0) {
        throw new Error('No assets were successfully downloaded');
      }

      return downloadedAssets;

    } catch (error) {
      console.error('❌ Asset Download Failed:', error.message);
      throw error;
    }
  }

  /**
   * Get file extension from URL
   */
  getFileExtension(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const ext = path.extname(pathname).slice(1).toLowerCase();
      
      // Default to common formats if no extension
      if (!ext || ext.length > 4) {
        return 'jpg';
      }
      
      return ext;
    } catch {
      return 'jpg';
    }
  }

  /**
   * Check if URL is accessible (quick pre-check)
   */
  async checkUrlAccessibility(url) {
    try {
      await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download assets with validation
   */
  async downloadScriptAssetsWithValidation(scriptData) {
    try {
      console.log('🔍 Validating asset URLs...');

      // Get all URLs from script
      const urls = [];
      
      if (scriptData.scenes) {
        scriptData.scenes.forEach(scene => {
          if (scene.visuals?.url) urls.push(scene.visuals.url);
        });
      } else if (scriptData.elements) {
        scriptData.elements.forEach(el => {
          if ((el.type === 'image' || el.type === 'video') && el.url) {
            urls.push(el.url);
          }
        });
      }

      console.log(`   Found ${urls.length} asset URLs to download`);

      // Quick accessibility check (optional - can skip if slow)
      let accessibleCount = 0;
      for (const url of urls.slice(0, 3)) { // Check first 3
        const accessible = await this.checkUrlAccessibility(url);
        if (accessible) accessibleCount++;
      }

      if (accessibleCount === 0) {
        console.warn('   ⚠️ Warning: Sample URLs may not be accessible');
      }

      // Proceed with download
      return await this.downloadScriptAssets(scriptData);

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AssetService();