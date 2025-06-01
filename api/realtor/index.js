/**
 * Realtor.com API Module
 * Main entry point for Realtor.com API operations
 */

const RealtorApiClient = require('./client');
const RealtorListingsApi = require('./listings');

// Create instances
const client = new RealtorApiClient();
const listings = new RealtorListingsApi();

/**
 * Search for listings by zip code
 * @param {string} zipCode - Zip code to search
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
async function searchListingsByZipCode(zipCode, options = {}) {
  return await listings.searchListingsByZipCode(zipCode, options);
}

/**
 * Get run status
 * @param {string} runId - Run ID to check
 * @returns {Promise<Object>} Run status
 */
async function getRunStatus(runId) {
  return await client.getRunStatus(runId);
}

/**
 * Wait for a run to complete
 * @param {string} runId - Run ID to wait for
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} Final run status
 */
async function waitForRun(runId, timeoutMs = 300000) {
  return await client.waitForRun(runId, timeoutMs);
}

module.exports = {
  client,
  listings,
  searchListingsByZipCode,
  getRunStatus,
  waitForRun
};
