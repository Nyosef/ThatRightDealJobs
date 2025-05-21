/**
 * RentCast Listings API Functions
 * Handles listings-specific API calls
 */

const RentCastApiClient = require('./client');

// Configuration constants - easy to change in one place
const DEFAULT_BATCH_SIZE = 50; // Number of listings to fetch per request
const MAX_TOTAL_LISTINGS = 50; // Maximum total number of listings to fetch across all requests

/**
 * Get listings by zip code (using the listings/sale endpoint)
 * @param {string} zipCode - Zip code to search for
 * @param {number} limit - Maximum number of listings to return per request (default: DEFAULT_BATCH_SIZE)
 * @param {number} offset - Offset for pagination (default: 0)
 * @param {number} daysOld - Number of days old the listings should be (default: 1)
 * @returns {Promise<Object>} Listings data
 */
async function getListingsByZipCode(zipCode, limit = DEFAULT_BATCH_SIZE, offset = 0, daysOld = 4) {
  const client = new RentCastApiClient();
  
  const params = {
    zipCode,
    limit,
    offset,
    status: 'Active',
    propertyType: 'Residential',
    listingType: 'For Sale',
    daysOld
  };
  
  return client.request('listings/sale', params);
}

/**
 * Get all listings in a zip code (handles pagination)
 * @param {string} zipCode - Zip code to search for
 * @param {number} batchSize - Number of listings to fetch per request (default: DEFAULT_BATCH_SIZE)
 * @param {number} maxTotal - Maximum total number of listings to fetch (default: MAX_TOTAL_LISTINGS)
 * @param {number} daysOld - Number of days old the listings should be (default: 1)
 * @returns {Promise<Array>} All listings in the zip code (up to maxTotal)
 */
async function getAllListingsInZipCode(zipCode, batchSize = DEFAULT_BATCH_SIZE, maxTotal = MAX_TOTAL_LISTINGS, daysOld = 4) {
  const client = new RentCastApiClient();
  let allListings = [];
  let offset = 0;
  let hasMore = true;
  
  console.log(`Fetching all listings in zip code ${zipCode}...`);
  
  while (hasMore) {
    try {
      console.log(`Fetching batch of ${batchSize} listings with offset ${offset} and daysOld=${daysOld}...`);
      const response = await getListingsByZipCode(zipCode, batchSize, offset, daysOld);
      
      // The listings/sale endpoint returns an array directly
      const listings = Array.isArray(response) ? response : [];
      
      if (listings.length === 0) {
        hasMore = false;
        break;
      }
      
      // Add listings to our collection
      allListings = allListings.concat(listings);
      console.log(`Fetched ${listings.length} listings. Total so far: ${allListings.length}`);
      
      // Check if we've reached the maximum total limit
      if (allListings.length >= maxTotal) {
        console.log(`Reached maximum total limit of ${maxTotal} listings. Stopping.`);
        allListings = allListings.slice(0, maxTotal); // Trim to exact limit
        hasMore = false;
        break;
      }
      
      // If we got fewer listings than the batch size, we've reached the end
      if (listings.length < batchSize) {
        hasMore = false;
        break;
      }
      
      // Increment offset for next batch
      offset += batchSize;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching listings for zip code ${zipCode} at offset ${offset}:`, error.message);
      hasMore = false;
      break;
    }
  }
  
  console.log(`Finished fetching listings for zip code ${zipCode}. Total: ${allListings.length}`);
  return allListings;
}

module.exports = {
  getListingsByZipCode,
  getAllListingsInZipCode
};
