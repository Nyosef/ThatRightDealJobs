/**
 * Redfin API Client using Apify Redfin Scraper
 * Handles communication with the Apify Redfin scraper actor
 */

// Load environment variables
require('dotenv').config();

// Import Apify client
const { ApifyClient } = require('apify-client');

class RedfinApiClient {
  constructor(apiToken = process.env.APIFY_API_TOKEN) {
    if (!apiToken) {
      throw new Error('Apify API token is required');
    }
    
    this.apiToken = apiToken;
    this.actorId = 'tri_angle/redfin-search'; // The Redfin scraper actor ID
    
    // Create Apify client instance
    this.client = new ApifyClient({
      token: this.apiToken
    });
  }
  
  /**
   * Search for Redfin listings by zip code
   * @param {string} zipCode - Zip code to search
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Scraper results
   */
  async searchByZipCode(zipCode, options = {}) {
    // Build Redfin search URL for the zip code
    const searchUrl = this.buildRedfinSearchUrl(zipCode, options);
    
    const input = {
      debugLog: false,
      searchUrls: [
        {
          url: searchUrl,
          method: "GET"
        }
      ],
      zoomIn: true,
      ...options
    };
    
    console.log(`Starting Redfin scraper for zip code: ${zipCode}`);
    console.log(`Search URL: ${searchUrl}`);
    console.log(`Scraper input:`, JSON.stringify(input, null, 2));
    
    try {
      // Start the actor run
      const run = await this.client.actor(this.actorId).call(input);
      
      console.log(`Redfin scraper run completed with status: ${run.status}`);
      console.log(`Run ID: ${run.id}`);
      
      if (run.status !== 'SUCCEEDED') {
        throw new Error(`Scraper run failed with status: ${run.status}`);
      }
      
      // Get the results from the default dataset
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      console.log(`Retrieved ${items.length} listings from Redfin scraper`);
      
      // Log the response size
      const responseSize = JSON.stringify(items).length;
      console.log(`Redfin API response size: ${(responseSize / 1024).toFixed(2)} KB`);
      
      return {
        runId: run.id,
        status: run.status,
        itemCount: items.length,
        items: items
      };
      
    } catch (error) {
      console.error(`Error in Redfin scraper for zip code ${zipCode}:`, error.message);
      
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error('Response data:', JSON.stringify(error.response.data));
      }
      
      throw new Error(`Redfin scraper failed: ${error.message}`);
    }
  }
  
  /**
   * Build Redfin search URL for a specific zip code
   * @param {string} zipCode - Zip code to search
   * @param {Object} options - Search options
   * @returns {string} Formatted Redfin search URL
   */
  buildRedfinSearchUrl(zipCode, options = {}) {
    // Use the standard Redfin zipcode URL format
    const searchUrl = `https://www.redfin.com/zipcode/${zipCode}`;
    console.log(`Built Redfin URL for ${zipCode}: ${searchUrl}`);
    return searchUrl;
  }
  
  /**
   * Get run details and status
   * @param {string} runId - The run ID to check
   * @returns {Promise<Object>} Run details
   */
  async getRunStatus(runId) {
    try {
      const run = await this.client.run(runId).get();
      return {
        id: run.id,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        stats: run.stats
      };
    } catch (error) {
      console.error(`Error getting run status for ${runId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Wait for a run to complete
   * @param {string} runId - The run ID to wait for
   * @param {number} timeoutMs - Timeout in milliseconds (default: 5 minutes)
   * @returns {Promise<Object>} Final run status
   */
  async waitForRun(runId, timeoutMs = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getRunStatus(runId);
      
      if (status.status === 'SUCCEEDED' || status.status === 'FAILED') {
        return status;
      }
      
      console.log(`Run ${runId} status: ${status.status}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
    
    throw new Error(`Run ${runId} timed out after ${timeoutMs}ms`);
  }
}

module.exports = RedfinApiClient;
