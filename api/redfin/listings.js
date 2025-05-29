/**
 * Redfin Listings API
 * Handles Redfin listing search and data processing
 */

const RedfinApiClient = require('./client');

/**
 * Search for Redfin listings by zip code
 * @param {string} zipCode - Zip code to search
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Processed listings data
 */
async function searchListingsByZipCode(zipCode, options = {}) {
  const client = new RedfinApiClient();
  
  try {
    console.log(`Searching Redfin listings for zip code: ${zipCode}`);
    
    // Search using the Apify scraper
    const results = await client.searchByZipCode(zipCode, options);
    
    // Process and validate the results
    console.log(`Raw items from scraper: ${results.items.length}`);
    if (results.items.length > 0) {
      console.log('First raw item structure:', JSON.stringify(results.items[0], null, 2));
    }
    
    const processedListings = results.items.map((listing, index) => {
      const transformed = transformRedfinListingData(listing, zipCode);
      console.log(`Item ${index}: redfin_id = ${transformed?.redfin_id}, propertyId = ${listing.propertyId}, listingId = ${listing.listingId}`);
      return transformed;
    }).filter(listing => listing && listing.redfin_id); // Filter out invalid listings
    
    console.log(`Processed ${processedListings.length} valid listings for zip ${zipCode}`);
    
    return {
      zipCode,
      runId: results.runId,
      totalItems: results.itemCount,
      validListings: processedListings.length,
      listings: processedListings
    };
    
  } catch (error) {
    console.error(`Error searching Redfin listings for zip ${zipCode}:`, error.message);
    throw error;
  }
}

/**
 * Transform Redfin listing data to our database schema
 * @param {Object} listing - Raw Redfin listing data
 * @param {string} zipCode - Zip code being processed
 * @returns {Object} Transformed listing data
 */
function transformRedfinListingData(listing, zipCode) {
  try {
    // Debug logging for the specific problematic listing
    if (listing.propertyId === 101266790) {
      console.log('\n=== DEBUG: Found problematic listing 101266790 ===');
      console.log('RAW LISTING DATA:', JSON.stringify(listing, null, 2));
      console.log('=== END RAW DATA ===\n');
    }
    
    const transformed = {
      // IDs and References
      redfin_id: listing.propertyId?.toString(),
      listing_id: listing.listingId?.toString(),
      mls_id: extractValue(listing.mlsId),
      
      // Location Information
      zip5: listing.zip || extractValue(listing.postalCode) || zipCode,
      address: extractValue(listing.streetLine),
      city: listing.city,
      state: listing.state,
      
      // Pricing Information
      price: extractNumericValue(listing.price),
      price_per_sqft: extractNumericValue(listing.pricePerSqFt),
      hoa_fee: extractNumericValue(listing.hoa),
      
      // Property Details
      bedrooms: listing.beds,
      bathrooms: listing.baths,
      sqft: extractNumericValue(listing.sqFt),
      lot_size: extractNumericValue(listing.lotSize),
      year_built: extractNumericValue(listing.yearBuilt),
      property_type: listing.propertyType,
      listing_type: listing.listingType,
      
      // Status and Timing
      mls_status: listing.mlsStatus,
      search_status: listing.searchStatus,
      dom: extractNumericValue(listing.dom), // days on market
      time_on_redfin: extractNumericValue(listing.timeOnRedfin),
      sold_date: listing.soldDate, // timestamp in milliseconds
      last_updated: new Date().toISOString().split('T')[0],
      
      // Location Coordinates
      lat: extractLatLong(listing.latLong, 'latitude'),
      lon: extractLatLong(listing.latLong, 'longitude'),
      
      // Additional Information
      redfin_url: listing.url,
      listing_remarks: listing.listingRemarks,
      listing_agent_name: listing.listingAgent?.name,
      listing_agent_id: extractNumericValue(listing.listingAgent?.redfinAgentId), // FIXED: Now using extractNumericValue
      
      // Features and Amenities
      has_virtual_tour: Boolean(listing.hasVirtualTour),
      has_video_tour: Boolean(listing.hasVideoTour),
      has_3d_tour: Boolean(listing.has3DTour),
      is_hot: Boolean(listing.isHot),
      is_new_construction: Boolean(listing.isNewConstruction),
      
      // Market Information - FIXED: Now using extractNumericValue for all ID fields
      market_id: extractNumericValue(listing.marketId),
      data_source_id: extractNumericValue(listing.dataSourceId),
      business_market_id: extractNumericValue(listing.businessMarketId),
      time_zone: listing.timeZone,
      
      // Display and Media
      primary_photo_display_level: listing.primaryPhotoDisplayLevel,
      has_photos: Boolean(listing.photos?.level),
      show_address_on_map: Boolean(listing.showAddressOnMap),
      
      // Metadata - FIXED: Now using extractNumericValue for service_policy_id
      ui_property_type: listing.uiPropertyType,
      country_code: listing.countryCode,
      service_policy_id: extractNumericValue(listing.servicePolicyId),
      is_redfin: Boolean(listing.isRedfin),
      is_shortlisted: Boolean(listing.isShortlisted),
      is_viewed_listing: Boolean(listing.isViewedListing)
    };
    
    // Debug logging for the specific problematic listing - TRANSFORMED DATA
    if (listing.propertyId === 101266790) {
      console.log('\n=== DEBUG: Transformed data for listing 101266790 ===');
      console.log('TRANSFORMED DATA:', JSON.stringify(transformed, null, 2));
      
      // Check each field for the problematic value 7193062800
      console.log('\n=== CHECKING FOR VALUE 7193062800 ===');
      Object.entries(transformed).forEach(([key, value]) => {
        if (value === 7193062800 || value === '7193062800') {
          console.log(`*** FOUND 7193062800 in field: ${key} = ${value} (type: ${typeof value})`);
        }
        if (typeof value === 'number' && value > 2147483647) {
          console.log(`*** Large number in field: ${key} = ${value} (type: ${typeof value})`);
        }
      });
      console.log('=== END TRANSFORMED DATA DEBUG ===\n');
    }
    
    return transformed;
  } catch (error) {
    console.error(`Error transforming listing data for propertyId ${listing.propertyId}:`, error.message);
    console.error('Raw listing data:', JSON.stringify(listing, null, 2));
    return null;
  }
}

/**
 * Helper function to safely extract values from Redfin's nested value objects
 * @param {any} valueObj - Value object that may have a 'value' or 'level' property
 * @returns {any} Extracted value or null
 */
function extractValue(valueObj) {
  if (valueObj === null || valueObj === undefined) {
    return null;
  }
  
  // If it's not an object, return as-is
  if (typeof valueObj !== 'object') {
    return valueObj;
  }
  
  // If it's an object with a 'value' property, extract it
  if (valueObj.hasOwnProperty('value')) {
    return valueObj.value;
  }
  
  // If it's an object with a 'level' property but no value, return null
  // This handles cases like {"level":1} where there's no actual value
  if (valueObj.hasOwnProperty('level') && !valueObj.hasOwnProperty('value')) {
    return null;
  }
  
  // Otherwise return the value as-is
  return valueObj;
}

/**
 * Helper function to safely extract numeric values from Redfin's nested objects
 * @param {any} valueObj - Value object that may contain numeric data
 * @returns {number|null} Extracted numeric value or null
 */
function extractNumericValue(valueObj) {
  const extracted = extractValue(valueObj);
  
  if (extracted === null || extracted === undefined) {
    return null;
  }
  
  // If it's already a number, return it
  if (typeof extracted === 'number') {
    return extracted;
  }
  
  // If it's a string, try to parse it
  if (typeof extracted === 'string') {
    const parsed = parseFloat(extracted);
    return isNaN(parsed) ? null : parsed;
  }
  
  // If it's still an object, log warning and return null
  if (typeof extracted === 'object') {
    console.warn('Unexpected object in numeric field:', JSON.stringify(extracted));
    return null;
  }
  
  return null;
}

/**
 * Helper function to safely extract latitude/longitude from latLong object
 * @param {Object} latLongObj - LatLong object
 * @param {string} coord - 'latitude' or 'longitude'
 * @returns {number|null} Coordinate value or null
 */
function extractLatLong(latLongObj, coord) {
  if (!latLongObj || typeof latLongObj !== 'object') {
    return null;
  }
  
  // Check if it's a nested value object
  if (latLongObj.value && typeof latLongObj.value === 'object') {
    return latLongObj.value[coord] || null;
  }
  
  // Check if coordinates are directly on the object
  return latLongObj[coord] || null;
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
  transformRedfinListingData
};
