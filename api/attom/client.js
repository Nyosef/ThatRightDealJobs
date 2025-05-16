/**
 * ATTOM API Client
 * Handles communication with the ATTOM API
 */

// Load environment variables
require('dotenv').config();

class AttomApiClient {
  constructor(apiKey = process.env.ATTOM_API_KEY) {
    if (!apiKey) {
      throw new Error('ATTOM API key is required');
    }
    
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
  }
  
  /**
   * Make a request to the ATTOM API
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async request(endpoint, params = {}) {
    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    console.log(`Making ATTOM API request to: ${url.toString()}`);
    
    // Make the request
    const response = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
        'apikey': this.apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`ATTOM API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Log the count of items found in the response
    this.logResponseCount(endpoint, data);
    
    return data;
  }
  
  /**
   * Log the count of items found in the API response
   * @param {string} endpoint - API endpoint
   * @param {Object} data - API response data
   */
  logResponseCount(endpoint, data) {
    let count = 0;
    
    // Different endpoints have different response structures
    if (endpoint.startsWith('sale/snapshot')) {
      count = data.property?.length || 0;
      console.log(`Found ${count} properties in ATTOM API response`);
    } else {
      // For other endpoints, try to determine the count based on common patterns
      const possibleArrays = ['property', 'properties', 'sales', 'records', 'results', 'data'];
      
      for (const key of possibleArrays) {
        if (Array.isArray(data[key])) {
          count = data[key].length;
          console.log(`Found ${count} ${key} in ATTOM API response`);
          break;
        }
      }
      
      if (count === 0) {
        console.log('Unable to determine count from ATTOM API response structure');
      }
    }
    
    // Log the total size of the response
    const responseSize = JSON.stringify(data).length;
    console.log(`ATTOM API response size: ${(responseSize / 1024).toFixed(2)} KB`);
  }
}

module.exports = AttomApiClient;
