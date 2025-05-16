/**
 * ATTOM Sale API Functions
 * Handles sale-specific API calls
 */

const AttomApiClient = require('./client');

/**
 * Fetch sale snapshot data for a specific geographic area and date range
 * @param {string} geoIdV4 - Geographic ID
 * @param {string} startDate - Start date in format YYYY/MM/DD
 * @param {string} endDate - End date in format YYYY/MM/DD
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 * @returns {Promise<Object>} Sale data
 */
async function getSaleSnapshot(geoIdV4, startDate, endDate, page = 1, pageSize = 100) {
  const client = new AttomApiClient();
  
  return client.request('sale/snapshot', {
    geoIdV4,
    startSaleSearchDate: startDate,
    endSaleSearchDate: endDate,
    page,
    pageSize,
    orderBy: 'calendarDate desc'
  });
}

module.exports = {
  getSaleSnapshot
};
