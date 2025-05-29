/**
 * Redfin Listing Model
 * Handles Redfin listing data processing and storage
 */

const { db } = require('../index');

/**
 * Find a Redfin listing by redfin_id
 * @param {string} redfinId - Redfin property ID
 * @returns {Promise<Object|null>} Listing record or null if not found
 */
async function findByRedfinId(redfinId) {
  const supabase = db.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('redfin_listing')
    .select('*')
    .eq('redfin_id', redfinId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding Redfin listing: ${error.message}`);
  return data;
}

/**
 * Insert a new Redfin listing record
 * @param {Object} listingData - Listing data
 * @returns {Promise<Object>} Inserted listing record
 */
async function insert(listingData) {
  return db.insertRecord('redfin_listing', listingData);
}

/**
 * Update an existing Redfin listing record
 * @param {string} redfinId - Redfin property ID
 * @param {Object} listingData - Updated listing data
 * @returns {Promise<Object>} Updated listing record
 */
async function update(redfinId, listingData) {
  return db.updateRecords('redfin_listing', { redfin_id: redfinId }, listingData);
}

/**
 * Process Redfin API listing data and insert or update records
 * @param {Object} apiData - Redfin API response
 * @param {string} zipCode - Zip code being processed
 * @returns {Promise<Object>} Processing results
 */
async function processAndUpsertFromRedfin(apiData, zipCode) {
  const result = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    skipped: 0
  };
  
  // Extract listings from API response
  const listings = apiData.listings || [];
  
  console.log(`Processing ${listings.length} Redfin listings for zip code ${zipCode}`);
  
  for (const listing of listings) {
    try {
      // Skip if no redfin_id
      if (!listing.redfin_id) {
        console.warn('Listing missing redfin_id, skipping');
        result.skipped++;
        continue;
      }
      
      // Check if listing exists
      const existingListing = await findByRedfinId(listing.redfin_id);
      
      if (existingListing) {
        // Check if data has changed
        if (hasListingDataChanged(existingListing, listing)) {
          console.log(`Updating Redfin listing with redfin_id: ${listing.redfin_id} - data has changed`);
          await update(existingListing.redfin_id, listing);
          result.updated++;
        } else {
          // Record is unchanged
          result.unchanged++;
        }
      } else {
        // Insert new listing
        console.log(`Inserting new Redfin listing with redfin_id: ${listing.redfin_id}`);
        await insert(listing);
        result.inserted++;
      }
    } catch (error) {
      console.error(`Error processing Redfin listing:`, error.message);
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
  
  const existingMlsStatus = existingListing.mls_status || '';
  const newMlsStatus = newListingData.mls_status || '';
  
  const existingAgentName = existingListing.listing_agent_name || '';
  const newAgentName = newListingData.listing_agent_name || '';
  
  const existingRemarks = existingListing.listing_remarks || '';
  const newRemarks = newListingData.listing_remarks || '';
  
  // Numeric fields - use float comparison
  const addressChanged = existingAddress !== newAddress;
  const mlsStatusChanged = existingMlsStatus !== newMlsStatus;
  const agentNameChanged = existingAgentName !== newAgentName;
  const remarksChanged = existingRemarks !== newRemarks;
  
  // Use float comparison for numeric fields
  const priceChanged = !floatsAreEqual(existingListing.price, newListingData.price);
  const pricePerSqftChanged = !floatsAreEqual(existingListing.price_per_sqft, newListingData.price_per_sqft);
  const hoaFeeChanged = !floatsAreEqual(existingListing.hoa_fee, newListingData.hoa_fee);
  const bedroomsChanged = !floatsAreEqual(existingListing.bedrooms, newListingData.bedrooms);
  const bathroomsChanged = !floatsAreEqual(existingListing.bathrooms, newListingData.bathrooms);
  const sqftChanged = !floatsAreEqual(existingListing.sqft, newListingData.sqft);
  const lotSizeChanged = !floatsAreEqual(existingListing.lot_size, newListingData.lot_size);
  const yearBuiltChanged = !floatsAreEqual(existingListing.year_built, newListingData.year_built);
  const latChanged = !floatsAreEqual(existingListing.lat, newListingData.lat);
  const lonChanged = !floatsAreEqual(existingListing.lon, newListingData.lon);
  const domChanged = !floatsAreEqual(existingListing.dom, newListingData.dom);
  const timeOnRedfinChanged = !floatsAreEqual(existingListing.time_on_redfin, newListingData.time_on_redfin);
  const soldDateChanged = !floatsAreEqual(existingListing.sold_date, newListingData.sold_date);
  const searchStatusChanged = !floatsAreEqual(existingListing.search_status, newListingData.search_status);
  
  // Check if any essential fields have changed
  const hasChanged = (
    addressChanged ||
    mlsStatusChanged ||
    agentNameChanged ||
    remarksChanged ||
    priceChanged ||
    pricePerSqftChanged ||
    hoaFeeChanged ||
    bedroomsChanged ||
    bathroomsChanged ||
    sqftChanged ||
    lotSizeChanged ||
    yearBuiltChanged ||
    latChanged ||
    lonChanged ||
    domChanged ||
    timeOnRedfinChanged ||
    soldDateChanged ||
    searchStatusChanged
  );
  
  if (hasChanged) {
    console.log(`Redfin listing data changed for redfin_id ${existingListing.redfin_id}:`);
    if (addressChanged) {
      console.log(`  - Address changed: ${existingAddress} -> ${newAddress}`);
    }
    if (mlsStatusChanged) {
      console.log(`  - MLS Status changed: ${existingMlsStatus} -> ${newMlsStatus}`);
    }
    if (agentNameChanged) {
      console.log(`  - Agent name changed: ${existingAgentName} -> ${newAgentName}`);
    }
    if (remarksChanged) {
      console.log(`  - Remarks changed: ${existingRemarks.substring(0, 50)}... -> ${newRemarks.substring(0, 50)}...`);
    }
    if (priceChanged) {
      console.log(`  - Price changed: ${existingListing.price} -> ${newListingData.price}`);
    }
    if (pricePerSqftChanged) {
      console.log(`  - Price per sqft changed: ${existingListing.price_per_sqft} -> ${newListingData.price_per_sqft}`);
    }
    if (hoaFeeChanged) {
      console.log(`  - HOA fee changed: ${existingListing.hoa_fee} -> ${newListingData.hoa_fee}`);
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
    if (lotSizeChanged) {
      console.log(`  - Lot size changed: ${existingListing.lot_size} -> ${newListingData.lot_size}`);
    }
    if (yearBuiltChanged) {
      console.log(`  - Year built changed: ${existingListing.year_built} -> ${newListingData.year_built}`);
    }
    if (latChanged) {
      console.log(`  - Latitude changed: ${existingListing.lat} -> ${newListingData.lat}`);
    }
    if (lonChanged) {
      console.log(`  - Longitude changed: ${existingListing.lon} -> ${newListingData.lon}`);
    }
    if (domChanged) {
      console.log(`  - Days on market changed: ${existingListing.dom} -> ${newListingData.dom}`);
    }
    if (timeOnRedfinChanged) {
      console.log(`  - Time on Redfin changed: ${existingListing.time_on_redfin} -> ${newListingData.time_on_redfin}`);
    }
    if (soldDateChanged) {
      console.log(`  - Sold date changed: ${existingListing.sold_date} -> ${newListingData.sold_date}`);
    }
    if (searchStatusChanged) {
      console.log(`  - Search status changed: ${existingListing.search_status} -> ${newListingData.search_status}`);
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
    .from('redfin_listing')
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
    .from('redfin_listing')
    .select('price, price_per_sqft, hoa_fee, sqft, bedrooms, bathrooms, dom')
    .eq('zip5', zipCode)
    .not('price', 'is', null);
  
  if (error) throw new Error(`Error getting listing stats: ${error.message}`);
  
  if (!data || data.length === 0) {
    return {
      count: 0,
      avgPrice: null,
      medianPrice: null,
      avgPricePerSqft: null,
      avgHoaFee: null,
      avgDom: null
    };
  }
  
  const prices = data.map(d => d.price).filter(p => p != null);
  const pricesPerSqft = data.map(d => d.price_per_sqft).filter(p => p != null);
  const hoaFees = data.map(d => d.hoa_fee).filter(h => h != null);
  const doms = data.map(d => d.dom).filter(d => d != null);
  
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const medianPrice = prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null;
  const avgPricePerSqft = pricesPerSqft.length > 0 ? pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length : null;
  const avgHoaFee = hoaFees.length > 0 ? hoaFees.reduce((a, b) => a + b, 0) / hoaFees.length : null;
  const avgDom = doms.length > 0 ? doms.reduce((a, b) => a + b, 0) / doms.length : null;
  
  return {
    count: data.length,
    avgPrice: avgPrice ? Math.round(avgPrice) : null,
    medianPrice: medianPrice ? Math.round(medianPrice) : null,
    avgPricePerSqft: avgPricePerSqft ? Math.round(avgPricePerSqft) : null,
    avgHoaFee: avgHoaFee ? Math.round(avgHoaFee) : null,
    avgDom: avgDom ? Math.round(avgDom) : null
  };
}

module.exports = {
  findByRedfinId,
  insert,
  update,
  processAndUpsertFromRedfin,
  getListingsByZipCode,
  getListingStatsByZipCode
};
