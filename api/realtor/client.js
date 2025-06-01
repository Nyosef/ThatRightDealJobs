/**
 * Realtor.com API Client using Apify Realtor Scraper
 * Handles communication with the Apify Realtor scraper actor
 */

// Load environment variables
require('dotenv').config();

// Import Apify client
const { ApifyClient } = require('apify-client');

class RealtorApiClient {
  constructor(apiToken = process.env.APIFY_API_TOKEN) {
    if (!apiToken) {
      throw new Error('Apify API token is required');
    }
    
    this.apiToken = apiToken;
    this.actorId = 'epctex/realtor-scraper'; // The Realtor scraper actor ID
    
    // Create Apify client instance
    this.client = new ApifyClient({
      token: this.apiToken
    });
  }
  
  /**
   * Search for Realtor listings by zip code
   * @param {string} zipCode - Zip code to search
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Scraper results
   */
  async searchByZipCode(zipCode, options = {}) {
    const input = {
      search: zipCode,
      mode: "BUY",
      proxy: {
        useApifyProxy: true
      },
      maxItems: options.maxItems || 100,
      includeFloorplans: false, // Not needed for BUY mode
      ...options
    };
    
    console.log(`Starting Realtor scraper for zip code: ${zipCode}`);
    console.log(`Scraper input:`, JSON.stringify(input, null, 2));
    
    try {
      // Start the actor run
      const run = await this.client.actor(this.actorId).call(input);
      
      console.log(`Realtor scraper run completed with status: ${run.status}`);
      console.log(`Run ID: ${run.id}`);
      
      if (run.status !== 'SUCCEEDED') {
        throw new Error(`Scraper run failed with status: ${run.status}`);
      }
      
      // Get the results from the default dataset
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      console.log(`Retrieved ${items.length} listings from Realtor scraper`);
      
      // Log the response size
      const responseSize = JSON.stringify(items).length;
      console.log(`Realtor API response size: ${(responseSize / 1024).toFixed(2)} KB`);
      
      return {
        runId: run.id,
        status: run.status,
        itemCount: items.length,
        items: items
      };
      
    } catch (error) {
      console.error(`Error in Realtor scraper for zip code ${zipCode}:`, error.message);
      
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error('Response data:', JSON.stringify(error.response.data));
      }
      
      throw new Error(`Realtor scraper failed: ${error.message}`);
    }
  }
  
  /**
   * Search for Realtor listings with custom parameters
   * @param {Object} searchParams - Custom search parameters
   * @returns {Promise<Object>} Scraper results
   */
  async searchWithParams(searchParams) {
    const input = {
      mode: "BUY",
      proxy: {
        useApifyProxy: true
      },
      maxItems: 100,
      includeFloorplans: false,
      ...searchParams
    };
    
    console.log(`Starting Realtor scraper with custom params`);
    console.log(`Scraper input:`, JSON.stringify(input, null, 2));
    
    try {
      // Start the actor run
      const run = await this.client.actor(this.actorId).call(input);
      
      console.log(`Realtor scraper run completed with status: ${run.status}`);
      console.log(`Run ID: ${run.id}`);
      
      if (run.status !== 'SUCCEEDED') {
        throw new Error(`Scraper run failed with status: ${run.status}`);
      }
      
      // Get the results from the default dataset
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      console.log(`Retrieved ${items.length} listings from Realtor scraper`);
      
      return {
        runId: run.id,
        status: run.status,
        itemCount: items.length,
        items: items
      };
      
    } catch (error) {
      console.error(`Error in Realtor scraper:`, error.message);
      
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error('Response data:', JSON.stringify(error.response.data));
      }
      
      throw new Error(`Realtor scraper failed: ${error.message}`);
    }
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

module.exports = RealtorApiClient;
