/**
 * Zillow Listings API
 * Handles Zillow listing search and data processing
 */

const ZillowApiClient = require('./client');

/**
 * Search for Zillow listings by zip code
 * @param {string} zipCode - Zip code to search
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Processed listings data
 */
async function searchListingsByZipCode(zipCode, options = {}) {
  const client = new ZillowApiClient();
  
  try {
    console.log(`Searching Zillow listings for zip code: ${zipCode}`);
    
    // Search using the Apify scraper
    const results = await client.searchByZipCode(zipCode, options);
    
    // Process and validate the results
    console.log(`Raw items from scraper: ${results.items.length}`);
    if (results.items.length > 0) {
      console.log('First raw item structure:', JSON.stringify(results.items[0], null, 2));
    }
    
    const processedListings = results.items.map((listing, index) => {
      const transformed = transformZillowListingData(listing, zipCode);
      console.log(`Item ${index}: zillow_id = ${transformed?.zillow_id}, zpid = ${listing.zpid}, id = ${listing.id}`);
      return transformed;
    }).filter(listing => listing && listing.zillow_id); // Filter out invalid listings
    
    console.log(`Processed ${processedListings.length} valid listings for zip ${zipCode}`);
    
    return {
      zipCode,
      runId: results.runId,
      totalItems: results.itemCount,
      validListings: processedListings.length,
      listings: processedListings
    };
    
  } catch (error) {
    console.error(`Error searching Zillow listings for zip ${zipCode}:`, error.message);
    throw error;
  }
}

/**
 * Transform Zillow listing data to our database schema
 * @param {Object} listing - Raw Zillow listing data
 * @param {string} zipCode - Zip code being processed
 * @returns {Object} Transformed listing data
 */
function transformZillowListingData(listing, zipCode) {
  try {
    return {
      // IDs and Location
      zillow_id: listing.zpid || listing.id,
      zip5: listing.addressZipcode || zipCode,
      address: listing.address,
      address_street: listing.addressStreet,
      city: listing.addressCity,
      state: listing.addressState,
      
      // Pricing Information
      price: parsePrice(listing.unformattedPrice),
      zestimate: parsePrice(listing.zestimate),
      last_sold_price: null, // Not available in current response format
      market_rent: parsePrice(listing.hdpData?.homeInfo?.rentZestimate),
      
      // Property Details
      bedrooms: parseInteger(listing.beds || listing.hdpData?.homeInfo?.bedrooms),
      bathrooms: parseFloatValue(listing.baths || listing.hdpData?.homeInfo?.bathrooms),
      sqft: parseInteger(listing.area || listing.hdpData?.homeInfo?.livingArea),
      property_type: listing.hdpData?.homeInfo?.homeType,
      listing_status: listing.statusType || listing.hdpData?.homeInfo?.homeStatus,
      
      // Dates and Timing
      listing_date: null, // Not available in current response format
      last_sold_date: null, // Not available in current response format
      days_on_zillow: parseInteger(listing.hdpData?.homeInfo?.daysOnZillow),
      last_updated: new Date().toISOString().split('T')[0],
      
      // Location
      lat: parseFloatValue(listing.latLong?.latitude || listing.hdpData?.homeInfo?.latitude),
      lon: parseFloatValue(listing.latLong?.longitude || listing.hdpData?.homeInfo?.longitude),
      
      // Additional Info
      zillow_url: listing.detailUrl,
      img_src: listing.imgSrc,
      has_image: Boolean(listing.hasImage),
      broker_name: listing.brokerName,
      status_text: listing.statusText,
      country_currency: listing.countryCurrency,
      
      // Metadata
      is_zillow_owned: Boolean(listing.isZillowOwned),
      is_featured: Boolean(listing.hdpData?.homeInfo?.isFeatured),
      has_3d_model: Boolean(listing.has3DModel),
      has_video: Boolean(listing.hasVideo)
    };
  } catch (error) {
    console.error(`Error transforming listing data for zpid ${listing.zpid}:`, error.message);
    console.error('Raw listing data:', JSON.stringify(listing, null, 2));
    return null;
  }
}

/**
 * Helper function to safely parse price values
 * @param {any} value - Value to parse as price
 * @returns {number|null} Parsed price or null
 */
function parsePrice(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // If it's already a number, return it
  if (typeof value === 'number') {
    return value;
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

/**
 * Helper function to safely parse integer values
 * @param {any} value - Value to parse as integer
 * @returns {number|null} Parsed integer or null
 */
function parseInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Helper function to safely parse float values
 * @param {any} value - Value to parse as float
 * @returns {number|null} Parsed float or null
 */
function parseFloatValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const parsed = Number(value);
  return isNaN(parsed) ? null : parsed;
}

module.exports = {
  searchListingsByZipCode,
  transformZillowListingData
};
