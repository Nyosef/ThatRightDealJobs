/**
 * Zillow API Client using Apify Zillow Scraper
 * Handles communication with the Apify Zillow scraper actor
 */

// Load environment variables
require('dotenv').config();

// Import Apify client
const { ApifyClient } = require('apify-client');

class ZillowApiClient {
  constructor(apiToken = process.env.APIFY_API_TOKEN) {
    if (!apiToken) {
      throw new Error('Apify API token is required');
    }
    
    this.apiToken = apiToken;
    this.actorId = 'maxcopell/zillow-scraper'; // The Zillow scraper actor ID
    
    // Create Apify client instance
    this.client = new ApifyClient({
      token: this.apiToken
    });
  }
  
  /**
   * Search for Zillow listings by zip code
   * @param {string} zipCode - Zip code to search
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Scraper results
   */
  async searchByZipCode(zipCode, options = {}) {
    // Build Zillow search URL for the zip code
    const searchUrl = this.buildZillowSearchUrl(zipCode, options);
    
    const input = {
      searchUrls: [
        {
          url: searchUrl
        }
      ], // Array of objects with url property
      extractionMethod: "PAGINATION_WITH_ZOOM_IN",
      ...options
    };
    
    console.log(`Starting Zillow scraper for zip code: ${zipCode}`);
    console.log(`Search URL: ${searchUrl}`);
    console.log(`Scraper input:`, JSON.stringify(input, null, 2));
    
    try {
      // Start the actor run
      const run = await this.client.actor(this.actorId).call(input);
      
      console.log(`Zillow scraper run completed with status: ${run.status}`);
      console.log(`Run ID: ${run.id}`);
      
      if (run.status !== 'SUCCEEDED') {
        throw new Error(`Scraper run failed with status: ${run.status}`);
      }
      
      // Get the results from the default dataset
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      console.log(`Retrieved ${items.length} listings from Zillow scraper`);
      
      // Log the response size
      const responseSize = JSON.stringify(items).length;
      console.log(`Zillow API response size: ${(responseSize / 1024).toFixed(2)} KB`);
      
      return {
        runId: run.id,
        status: run.status,
        itemCount: items.length,
        items: items
      };
      
    } catch (error) {
      console.error(`Error in Zillow scraper for zip code ${zipCode}:`, error.message);
      
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error('Response data:', JSON.stringify(error.response.data));
      }
      
      throw new Error(`Zillow scraper failed: ${error.message}`);
    }
  }
  
  /**
   * Build Zillow search URL for a specific zip code
   * @param {string} zipCode - Zip code to search
   * @param {Object} options - Search options
   * @returns {string} Formatted Zillow search URL
   */
  buildZillowSearchUrl(zipCode, options = {}) {
    // Use the correct URL format for zipcode 16146
    if (zipCode === '16146') {
      const searchUrl = 'https://www.zillow.com/sharon-pa-16146/?searchQueryState=%7B%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22north%22%3A41.26251769347416%2C%22south%22%3A41.19144412594777%2C%22east%22%3A-80.41961522692874%2C%22west%22%3A-80.57496877307132%7D%2C%22filterState%22%3A%7B%22sort%22%3A%7B%22value%22%3A%22globalrelevanceex%22%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A14%2C%22usersSearchTerm%22%3A%2216146%22%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A64473%2C%22regionType%22%3A7%7D%5D%7D';
      console.log(`Built Zillow URL for ${zipCode}: ${searchUrl}`);
      return searchUrl;
    }
    
    // Fallback for other zip codes
    const searchUrl = `https://www.zillow.com/homes/for_sale/${zipCode}/`;
    console.log(`Built fallback Zillow URL for ${zipCode}: ${searchUrl}`);
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

module.exports = ZillowApiClient;
