const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');

class ConfigService {
  constructor() {
    this.configCsvPath = path.join(__dirname, '../../src/config.csv');
    
    // Default configuration if file doesn't exist
    this.defaultConfig = {
      channel: 'instagram',
      duration: 30,
      adType: 'awareness',
      dimensions: { width: 1080, height: 1920 },
      voiceover: true
    };
  }

  /**
   * Save configuration to CSV (Overwrites existing)
   * Flattens dimensions into width/height columns
   */
  async saveConfig(configData) {
    try {
      // Merge with defaults to ensure all fields exist
      const mergedConfig = { ...this.defaultConfig, ...configData };

      // Flatten for CSV storage
      const csvRow = [{
        channel: mergedConfig.channel,
        duration: mergedConfig.duration,
        adType: mergedConfig.adType,
        width: mergedConfig.dimensions?.width || 1080,
        height: mergedConfig.dimensions?.height || 1920,
        voiceover: mergedConfig.voiceover,
        updatedAt: new Date().toISOString()
      }];

      const csv = Papa.unparse(csvRow);
      await fs.writeFile(this.configCsvPath, csv, 'utf-8');
      
      return mergedConfig;
    } catch (error) {
      throw new Error(`Failed to save config.csv: ${error.message}`);
    }
  }

  /**
   * Read configuration from CSV
   * Reconstructs the dimensions object and parses types
   */
  async getConfig() {
    try {
      // Check if file exists
      await fs.access(this.configCsvPath);
      
      const csvContent = await fs.readFile(this.configCsvPath, 'utf-8');
      
      return new Promise((resolve) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              const row = results.data[0];
              
              // Reconstruct object with correct types
              resolve({
                channel: row.channel,
                duration: parseInt(row.duration) || 30,
                adType: row.adType,
                dimensions: {
                  width: parseInt(row.width) || 1080,
                  height: parseInt(row.height) || 1920
                },
                // CSV stores boolean as string 'true'/'false'
                voiceover: row.voiceover === 'true' || row.voiceover === true,
                updatedAt: row.updatedAt
              });
            } else {
              resolve(this.defaultConfig);
            }
          },
          error: () => resolve(this.defaultConfig)
        });
      });
    } catch (error) {
      // If file doesn't exist, return default
      return this.defaultConfig;
    }
  }
}

module.exports = new ConfigService();