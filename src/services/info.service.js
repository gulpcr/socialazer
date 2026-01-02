const scriptService = require('./script.service');
const configService = require('./config.service');

class InfoService {
  /**
   * Aggregates all project data: Scraped content, Configuration, and Generated Script.
   * Returns null for any section if the file doesn't exist yet.
   */
  async getFullProjectData() {
    try {
      // Execute all reads in parallel for performance
      const [scrapedData, configData, scriptData] = await Promise.all([
        this.getSafely(() => scriptService.readScrapedData()),
        this.getSafely(() => configService.getConfig()),
        this.getSafely(() => scriptService.getCurrentScript())
      ]);

      return {
        // 1. Raw Scraped Data (Images, Colors, Branding)
        scraped: scrapedData || null,
        
        // 2. User Configuration (Duration, Platform, etc.)
        config: configData || null,
        
        // 3. Generated/Edited Script (Scenes, Timeline)
        script: scriptData || null,
        
        // Helper flag for frontend to know what step to show
        workflowState: this.determineWorkflowState(scrapedData, scriptData)
      };
    } catch (error) {
      throw new Error(`Failed to aggregate info: ${error.message}`);
    }
  }

  /**
   * Helper to determine where the user is in the flow
   */
  determineWorkflowState(scraped, script) {
    if (!scraped) return 'IDLE';        // No URL scraped yet
    if (!script) return 'SCRAPED';      // Scraped, but no script generated
    return 'SCRIPT_READY';              // Script exists, ready for editing/generation
  }

  /**
   * Wrapper to catch errors (e.g., file not found) and return null
   * instead of crashing the whole request.
   */
  async getSafely(promiseFn) {
    try {
      return await promiseFn();
    } catch (error) {
      // Log warning internally, but return null to controller
      // console.warn('InfoService: Data segment missing', error.message);
      return null;
    }
  }
}

module.exports = new InfoService();