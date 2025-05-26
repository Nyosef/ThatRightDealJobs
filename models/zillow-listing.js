/**
 * Zillow Listing Model
 * Handles Zillow listing data processing and storage
 */

const { db } = require('../index');

/**
 * Find a Zillow listing by zillow_id
 * @param {string} zillowId - Zillow property ID
 * @returns {Promise<Object|null>} Listing record or null if not found
 */
async function findByZillowId(zillowId) {
  const supabase = db.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('zillow_listing')
    .select('*')
    .eq('zillow_id', zillowId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding Zillow listing: ${error.message}`);
  return data;
}

/**
 * Insert a new Zillow listing record
 * @param {Object} listingData - Listing data
 * @returns {Promise<Object>} Inserted listing record
 */
async function insert(listingData) {
  return db.insertRecord('zillow_listing', listingData);
}

/**
 * Update an existing Zillow listing record
 * @param {string} zillowId - Zillow property ID
 * @param {Object} listingData - Updated listing data
 * @returns {Promise<Object>} Updated listing record
 */
async function update(zillowId, listingData) {
  return db.updateRecords('zillow_listing', { zillow_id: zillowId }, listingData);
}

/**
 * Process Zillow API listing data and insert or update records
 * @param {Object} apiData - Zillow API response
 * @param {string} zipCode - Zip code being processed
 * @returns {Promise<Object>} Processing results
 */
async function processAndUpsertFromZillow(apiData, zipCode) {
  const result = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    skipped: 0
  };
  
  // Extract listings from API response
  const listings = apiData.listings || [];
  
  console.log(`Processing ${listings.length} Zillow listings for zip code ${zipCode}`);
  
  for (const listing of listings) {
    try {
      // Skip if no zillow_id
      if (!listing.zillow_id) {
        console.warn('Listing missing zillow_id, skipping');
        result.skipped++;
        continue;
      }
      
      // Check if listing exists
      const existingListing = await findByZillowId(listing.zillow_id);
      
      if (existingListing) {
        // Check if data has changed
        if (hasListingDataChanged(existingListing, listing)) {
          console.log(`Updating Zillow listing with zillow_id: ${listing.zillow_id} - data has changed`);
          await update(existingListing.zillow_id, listing);
          result.updated++;
        } else {
          // Record is unchanged
          result.unchanged++;
        }
      } else {
        // Insert new listing
        console.log(`Inserting new Zillow listing with zillow_id: ${listing.zillow_id}`);
        await insert(listing);
        result.inserted++;
      }
    } catch (error) {
      console.error(`Error processing Zillow listing:`, error.message);
      console.error('Error details:', error);
      result.errors++;
    }
  }
  
  return result;
}

/**
 * Helper function to compare floating point values with a small epsilon
 * @param {number|string} a - First value
 * @param {number|string} b - Second value
 * @returns {boolean} True if values are equal within epsilon
 */
function floatsAreEqual(a, b) {
  // If either value is null/undefined, convert to empty string for comparison
  if (a == null) a = '';
  if (b == null) b = '';
  
  // If both are empty strings, they're equal
  if (a === '' && b === '') return true;
  
  // Try to parse as floats
  const floatA = parseFloat(a);
  const floatB = parseFloat(b);
  
  // If either can't be parsed as a float, do string comparison
  if (isNaN(floatA) || isNaN(floatB)) {
    return String(a) === String(b);
  }
  
  // For floating point comparison, use a small epsilon
  const epsilon = 0.0000001;
  return Math.abs(floatA - floatB) < epsilon;
}

/**
 * Check if listing data has changed
 * @param {Object} existingListing - Existing listing from database
 * @param {Object} newListingData - New listing data
 * @returns {boolean} True if data has changed
 */
function hasListingDataChanged(existingListing, newListingData) {
  // Compare essential fields that matter for business logic
  
  // Text fields - use simple string comparison
  const existingAddress = existingListing.address || '';
  const newAddress = newListingData.address || '';
  
  const existingStatus = existingListing.listing_status || '';
  const newStatus = newListingData.listing_status || '';
  
  const existingBroker = existingListing.broker_name || '';
  const newBroker = newListingData.broker_name || '';
  
  // Numeric fields - use float comparison
  const addressChanged = existingAddress !== newAddress;
  const statusChanged = existingStatus !== newStatus;
  const brokerChanged = existingBroker !== newBroker;
  
  // Use float comparison for numeric fields
  const priceChanged = !floatsAreEqual(existingListing.price, newListingData.price);
  const zestimateChanged = !floatsAreEqual(existingListing.zestimate, newListingData.zestimate);
  const marketRentChanged = !floatsAreEqual(existingListing.market_rent, newListingData.market_rent);
  const bedroomsChanged = !floatsAreEqual(existingListing.bedrooms, newListingData.bedrooms);
  const bathroomsChanged = !floatsAreEqual(existingListing.bathrooms, newListingData.bathrooms);
  const sqftChanged = !floatsAreEqual(existingListing.sqft, newListingData.sqft);
  const latChanged = !floatsAreEqual(existingListing.lat, newListingData.lat);
  const lonChanged = !floatsAreEqual(existingListing.lon, newListingData.lon);
  const daysOnZillowChanged = !floatsAreEqual(existingListing.days_on_zillow, newListingData.days_on_zillow);
  
  // Check if any essential fields have changed
  const hasChanged = (
    addressChanged ||
    statusChanged ||
    brokerChanged ||
    priceChanged ||
    zestimateChanged ||
    marketRentChanged ||
    bedroomsChanged ||
    bathroomsChanged ||
    sqftChanged ||
    latChanged ||
    lonChanged ||
    daysOnZillowChanged
  );
  
  if (hasChanged) {
    console.log(`Zillow listing data changed for zillow_id ${existingListing.zillow_id}:`);
    if (addressChanged) {
      console.log(`  - Address changed: ${existingAddress} -> ${newAddress}`);
    }
    if (statusChanged) {
      console.log(`  - Status changed: ${existingStatus} -> ${newStatus}`);
    }
    if (brokerChanged) {
      console.log(`  - Broker changed: ${existingBroker} -> ${newBroker}`);
    }
    if (priceChanged) {
      console.log(`  - Price changed: ${existingListing.price} -> ${newListingData.price}`);
    }
    if (zestimateChanged) {
      console.log(`  - Zestimate changed: ${existingListing.zestimate} -> ${newListingData.zestimate}`);
    }
    if (marketRentChanged) {
      console.log(`  - Market rent changed: ${existingListing.market_rent} -> ${newListingData.market_rent}`);
    }
    if (bedroomsChanged) {
      console.log(`  - Bedrooms changed: ${existingListing.bedrooms} -> ${newListingData.bedrooms}`);
    }
    if (bathroomsChanged) {
      console.log(`  - Bathrooms changed: ${existingListing.bathrooms} -> ${newListingData.bathrooms}`);
    }
    if (sqftChanged) {
      console.log(`  - Sqft changed: ${existingListing.sqft} -> ${newListingData.sqft}`);
    }
    if (latChanged) {
      console.log(`  - Latitude changed: ${existingListing.lat} -> ${newListingData.lat}`);
    }
    if (lonChanged) {
      console.log(`  - Longitude changed: ${existingListing.lon} -> ${newListingData.lon}`);
    }
    if (daysOnZillowChanged) {
      console.log(`  - Days on Zillow changed: ${existingListing.days_on_zillow} -> ${newListingData.days_on_zillow}`);
    }
  }
  
  return hasChanged;
}

/**
 * Get listings by zip code
 * @param {string} zipCode - Zip code to filter by
 * @param {Object} options - Query options (limit, offset, etc.)
 * @returns {Promise<Array>} Array of listings
 */
async function getListingsByZipCode(zipCode, options = {}) {
  const supabase = db.getSupabaseClient();
  
  let query = supabase
    .from('zillow_listing')
    .select('*')
    .eq('zip5', zipCode)
    .order('last_updated', { ascending: false });
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Error getting listings by zip code: ${error.message}`);
  return data || [];
}

/**
 * Get listing statistics by zip code
 * @param {string} zipCode - Zip code to analyze
 * @returns {Promise<Object>} Statistics object
 */
async function getListingStatsByZipCode(zipCode) {
  const supabase = db.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('zillow_listing')
    .select('price, zestimate, market_rent, sqft, bedrooms, bathrooms')
    .eq('zip5', zipCode)
    .not('price', 'is', null);
  
  if (error) throw new Error(`Error getting listing stats: ${error.message}`);
  
  if (!data || data.length === 0) {
    return {
      count: 0,
      avgPrice: null,
      medianPrice: null,
      avgPricePerSqft: null,
      avgMarketRent: null,
      avgRentYield: null
    };
  }
  
  const prices = data.map(d => d.price).filter(p => p != null);
  const rents = data.map(d => d.market_rent).filter(r => r != null);
  const sqfts = data.map(d => d.sqft).filter(s => s != null);
  
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const medianPrice = prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null;
  const avgMarketRent = rents.length > 0 ? rents.reduce((a, b) => a + b, 0) / rents.length : null;
  
  // Calculate average price per sqft
  const pricesPerSqft = data
    .filter(d => d.price && d.sqft && d.sqft > 0)
    .map(d => d.price / d.sqft);
  const avgPricePerSqft = pricesPerSqft.length > 0 ? pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length : null;
  
  // Calculate average rent yield (annual rent / price)
  const rentYields = data
    .filter(d => d.price && d.market_rent && d.price > 0)
    .map(d => (d.market_rent * 12) / d.price);
  const avgRentYield = rentYields.length > 0 ? rentYields.reduce((a, b) => a + b, 0) / rentYields.length : null;
  
  return {
    count: data.length,
    avgPrice: avgPrice ? Math.round(avgPrice) : null,
    medianPrice: medianPrice ? Math.round(medianPrice) : null,
    avgPricePerSqft: avgPricePerSqft ? Math.round(avgPricePerSqft) : null,
    avgMarketRent: avgMarketRent ? Math.round(avgMarketRent) : null,
    avgRentYield: avgRentYield ? (avgRentYield * 100).toFixed(2) + '%' : null
  };
}

module.exports = {
  findByZillowId,
  insert,
  update,
  processAndUpsertFromZillow,
  getListingsByZipCode,
  getListingStatsByZipCode
};
