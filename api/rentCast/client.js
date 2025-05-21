/**
 * RentCast API Client
 * Handles communication with the RentCast API
 */

// Load environment variables
require('dotenv').config();

// Import axios
const axios = require('axios');

class RentCastApiClient {
  constructor(apiKey = process.env.RENTCAST_API_KEY) {
    if (!apiKey) {
      throw new Error('RentCast API key is required');
    }
    
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.rentcast.io/v1';
    
    // Create axios instance with default config
    this.axios = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': this.apiKey
      }
    });
  }
  
  /**
   * Make a request to the RentCast API
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async request(endpoint, params = {}) {
    // Build URL with query parameters
    const url = endpoint;
    
    console.log(`Making RentCast API request to: ${this.baseUrl}/${url}`);
    console.log(`API Key: ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
    console.log('Query parameters:', params);
    
    try {
      // Make the request
      const response = await this.axios.get(url, { params });
      
      // Log the response size
      const responseSize = JSON.stringify(response.data).length;
      console.log(`RentCast API response status: ${response.status}`);
      console.log(`RentCast API response size: ${(responseSize / 1024).toFixed(2)} KB`);
      
      return response.data;
    } catch (error) {
      console.error(`Error in RentCast API request to ${this.baseUrl}/${url}:`, error.message);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(`Response status: ${error.response.status}`);
        console.error('Response headers:', JSON.stringify(error.response.headers));
        console.error('Response data:', JSON.stringify(error.response.data));
        throw new Error(`RentCast API request failed with status: ${error.response.status}. Details: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received');
        throw new Error(`RentCast API request failed: No response received`);
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(`RentCast API request failed: ${error.message}`);
      }
    }
  }
}

module.exports = RentCastApiClient;
