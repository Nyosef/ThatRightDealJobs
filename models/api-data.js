/**
 * API Data Model
 * Handles storing raw API responses
 */

const { db } = require('../index');

/**
 * Store raw API response data
 * @param {Object} apiData - Raw API response data
 * @param {string} source - Source of the data (e.g., 'attom', 'rentcast')
 * @param {string} zipCode - Zip code the data is for
 * @returns {Promise<Object>} Inserted record
 */
async function storeRawApiData(apiData, source, zipCode) {
  const record = {
    data: {
      source,
      zipCode,
      fetchedAt: new Date().toISOString(),
      response: apiData
    }
  };
  
  return db.insertRecord('api_data', record);
}

module.exports = {
  storeRawApiData
};
