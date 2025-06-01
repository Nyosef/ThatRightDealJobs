/**
 * Realtor Listing Model
 * Handles Realtor listing data processing and storage
 */

const { db } = require('../index');

/**
 * Find a Realtor listing by realtor_id
 * @param {string} realtorId - Realtor property ID
 * @returns {Promise<Object|null>} Listing record or null if not found
 */
async function findByRealtorId(realtorId) {
  const supabase = db.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('realtor_listing')
    .select('*')
    .eq('realtor_id', realtorId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding Realtor listing: ${error.message}`);
  return data;
}

/**
 * Insert a new Realtor listing record
 * @param {Object} listingData - Listing data
 * @returns {Promise<Object>} Inserted listing record
 */
async function insert(listingData) {
  return db.insertRecord('realtor_listing', listingData);
}

/**
 * Update an existing Realtor listing record
 * @param {string} realtorId - Realtor property ID
 * @param {Object} listingData - Updated listing data
 * @returns {Promise<Object>} Updated listing record
 */
async function update(realtorId, listingData) {
  return db.updateRecords('realtor_listing', { realtor_id: realtorId }, listingData);
}

/**
 * Process Realtor API listing data and insert or update records
 * @param {Object} apiData - Realtor API response
 * @param {string} zipCode - Zip code being processed
 * @returns {Promise<Object>} Processing results
 */
async function processAndUpsertFromRealtor(apiData, zipCode) {
  const result = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    skipped: 0
  };
  
  // Extract listings from API response
  const listings = apiData.listings || [];
  
  console.log(`Processing ${listings.length} Realtor listings for zip code ${zipCode}`);
  
  for (const listing of listings) {
    try {
      // Skip if no realtor_id
      if (!listing.realtor_id) {
        console.warn('Listing missing realtor_id, skipping');
        result.skipped++;
        continue;
      }
      
      // Check if listing exists
      const existingListing = await findByRealtorId(listing.realtor_id);
      
      if (existingListing) {
        // Check if data has changed
        if (hasListingDataChanged(existingListing, listing)) {
          console.log(`Updating Realtor listing with realtor_id: ${listing.realtor_id} - data has changed`);
          await update(existingListing.realtor_id, listing);
          result.updated++;
        } else {
          // Record is unchanged
          result.unchanged++;
        }
      } else {
        // Insert new listing
        console.log(`Inserting new Realtor listing with realtor_id: ${listing.realtor_id}`);
        await insert(listing);
        result.inserted++;
      }
    } catch (error) {
      console.error(`Error processing Realtor listing:`, error.message);
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
 * Helper function to compare JSONB objects
 * @param {Object|string} a - First object
 * @param {Object|string} b - Second object
 * @returns {boolean} True if objects are equal
 */
function jsonbAreEqual(a, b) {
  // Convert to strings for comparison
  const strA = typeof a === 'string' ? a : JSON.stringify(a);
  const strB = typeof b === 'string' ? b : JSON.stringify(b);
  
  return strA === strB;
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
  const existingUrl = existingListing.url || '';
  const newUrl = newListingData.url || '';
  
  const existingStatus = existingListing.status || '';
  const newStatus = newListingData.status || '';
  
  const existingStreet = existingListing.street || '';
  const newStreet = newListingData.street || '';
  
  const existingPropertyType = existingListing.property_type || '';
  const newPropertyType = newListingData.property_type || '';
  
  // Numeric fields - use float comparison
  const urlChanged = existingUrl !== newUrl;
  const statusChanged = existingStatus !== newStatus;
  const streetChanged = existingStreet !== newStreet;
  const propertyTypeChanged = existingPropertyType !== newPropertyType;
  
  // Use float comparison for numeric fields
  const listPriceChanged = !floatsAreEqual(existingListing.list_price, newListingData.list_price);
  const lastSoldPriceChanged = !floatsAreEqual(existingListing.last_sold_price, newListingData.last_sold_price);
  const pricePerSqftChanged = !floatsAreEqual(existingListing.price_per_sqft, newListingData.price_per_sqft);
  const bedsChanged = !floatsAreEqual(existingListing.beds, newListingData.beds);
  const bathsChanged = !floatsAreEqual(existingListing.baths, newListingData.baths);
  const sqftChanged = !floatsAreEqual(existingListing.sqft, newListingData.sqft);
  const lotSqftChanged = !floatsAreEqual(existingListing.lot_sqft, newListingData.lot_sqft);
  const yearBuiltChanged = !floatsAreEqual(existingListing.year_built, newListingData.year_built);
  const latChanged = !floatsAreEqual(existingListing.latitude, newListingData.latitude);
  const lonChanged = !floatsAreEqual(existingListing.longitude, newListingData.longitude);
  
  // Risk assessment fields
  const floodScoreChanged = !floatsAreEqual(existingListing.flood_factor_score, newListingData.flood_factor_score);
  const fireScoreChanged = !floatsAreEqual(existingListing.fire_factor_score, newListingData.fire_factor_score);
  const noiseScoreChanged = !floatsAreEqual(existingListing.noise_score, newListingData.noise_score);
  
  // Tax information
  const taxYearChanged = !floatsAreEqual(existingListing.latest_tax_year, newListingData.latest_tax_year);
  const taxAmountChanged = !floatsAreEqual(existingListing.latest_tax_amount, newListingData.latest_tax_amount);
  
  // School ratings
  const elemRatingChanged = !floatsAreEqual(existingListing.nearest_elementary_rating, newListingData.nearest_elementary_rating);
  const middleRatingChanged = !floatsAreEqual(existingListing.nearest_middle_rating, newListingData.nearest_middle_rating);
  const highRatingChanged = !floatsAreEqual(existingListing.nearest_high_rating, newListingData.nearest_high_rating);
  
  // JSONB fields - compare as strings
  const schoolsChanged = !jsonbAreEqual(existingListing.nearby_schools, newListingData.nearby_schools);
  const riskDataChanged = !jsonbAreEqual(existingListing.local_risk_data, newListingData.local_risk_data);
  const historyChanged = !jsonbAreEqual(existingListing.price_history, newListingData.price_history);
  const taxHistoryChanged = !jsonbAreEqual(existingListing.tax_history, newListingData.tax_history);
  
  // Check if any essential fields have changed
  const hasChanged = (
    urlChanged ||
    statusChanged ||
    streetChanged ||
    propertyTypeChanged ||
    listPriceChanged ||
    lastSoldPriceChanged ||
    pricePerSqftChanged ||
    bedsChanged ||
    bathsChanged ||
    sqftChanged ||
    lotSqftChanged ||
    yearBuiltChanged ||
    latChanged ||
    lonChanged ||
    floodScoreChanged ||
    fireScoreChanged ||
    noiseScoreChanged ||
    taxYearChanged ||
    taxAmountChanged ||
    elemRatingChanged ||
    middleRatingChanged ||
    highRatingChanged ||
    schoolsChanged ||
    riskDataChanged ||
    historyChanged ||
    taxHistoryChanged
  );
  
  if (hasChanged) {
    console.log(`Realtor listing data changed for realtor_id ${existingListing.realtor_id}:`);
    if (urlChanged) {
      console.log(`  - URL changed: ${existingUrl} -> ${newUrl}`);
    }
    if (statusChanged) {
      console.log(`  - Status changed: ${existingStatus} -> ${newStatus}`);
    }
    if (streetChanged) {
      console.log(`  - Street changed: ${existingStreet} -> ${newStreet}`);
    }
    if (propertyTypeChanged) {
      console.log(`  - Property type changed: ${existingPropertyType} -> ${newPropertyType}`);
    }
    if (listPriceChanged) {
      console.log(`  - List price changed: ${existingListing.list_price} -> ${newListingData.list_price}`);
    }
    if (lastSoldPriceChanged) {
      console.log(`  - Last sold price changed: ${existingListing.last_sold_price} -> ${newListingData.last_sold_price}`);
    }
    if (pricePerSqftChanged) {
      console.log(`  - Price per sqft changed: ${existingListing.price_per_sqft} -> ${newListingData.price_per_sqft}`);
    }
    if (bedsChanged) {
      console.log(`  - Beds changed: ${existingListing.beds} -> ${newListingData.beds}`);
    }
    if (bathsChanged) {
      console.log(`  - Baths changed: ${existingListing.baths} -> ${newListingData.baths}`);
    }
    if (sqftChanged) {
      console.log(`  - Sqft changed: ${existingListing.sqft} -> ${newListingData.sqft}`);
    }
    if (lotSqftChanged) {
      console.log(`  - Lot sqft changed: ${existingListing.lot_sqft} -> ${newListingData.lot_sqft}`);
    }
    if (yearBuiltChanged) {
      console.log(`  - Year built changed: ${existingListing.year_built} -> ${newListingData.year_built}`);
    }
    if (latChanged) {
      console.log(`  - Latitude changed: ${existingListing.latitude} -> ${newListingData.latitude}`);
    }
    if (lonChanged) {
      console.log(`  - Longitude changed: ${existingListing.longitude} -> ${newListingData.longitude}`);
    }
    if (floodScoreChanged) {
      console.log(`  - Flood score changed: ${existingListing.flood_factor_score} -> ${newListingData.flood_factor_score}`);
    }
    if (fireScoreChanged) {
      console.log(`  - Fire score changed: ${existingListing.fire_factor_score} -> ${newListingData.fire_factor_score}`);
    }
    if (noiseScoreChanged) {
      console.log(`  - Noise score changed: ${existingListing.noise_score} -> ${newListingData.noise_score}`);
    }
    if (taxYearChanged) {
      console.log(`  - Tax year changed: ${existingListing.latest_tax_year} -> ${newListingData.latest_tax_year}`);
    }
    if (taxAmountChanged) {
      console.log(`  - Tax amount changed: ${existingListing.latest_tax_amount} -> ${newListingData.latest_tax_amount}`);
    }
    if (elemRatingChanged) {
      console.log(`  - Elementary rating changed: ${existingListing.nearest_elementary_rating} -> ${newListingData.nearest_elementary_rating}`);
    }
    if (middleRatingChanged) {
      console.log(`  - Middle rating changed: ${existingListing.nearest_middle_rating} -> ${newListingData.nearest_middle_rating}`);
    }
    if (highRatingChanged) {
      console.log(`  - High rating changed: ${existingListing.nearest_high_rating} -> ${newListingData.nearest_high_rating}`);
    }
    if (schoolsChanged) {
      console.log(`  - Schools data changed`);
    }
    if (riskDataChanged) {
      console.log(`  - Risk data changed`);
    }
    if (historyChanged) {
      console.log(`  - Price history changed`);
    }
    if (taxHistoryChanged) {
      console.log(`  - Tax history changed`);
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
    .from('realtor_listing')
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
    .from('realtor_listing')
    .select('list_price, last_sold_price, price_per_sqft, sqft, beds, baths, latest_tax_amount, flood_factor_score, fire_factor_score, noise_score')
    .eq('zip5', zipCode)
    .not('last_sold_price', 'is', null);
  
  if (error) throw new Error(`Error getting listing stats: ${error.message}`);
  
  if (!data || data.length === 0) {
    return {
      count: 0,
      avgListPrice: null,
      avgSoldPrice: null,
      medianSoldPrice: null,
      avgPricePerSqft: null,
      avgTax: null,
      avgFloodScore: null,
      avgFireScore: null,
      avgNoiseScore: null
    };
  }
  
  const listPrices = data.map(d => d.list_price).filter(p => p != null);
  const soldPrices = data.map(d => d.last_sold_price).filter(p => p != null);
  const pricesPerSqft = data.map(d => d.price_per_sqft).filter(p => p != null);
  const taxes = data.map(d => d.latest_tax_amount).filter(t => t != null);
  const floodScores = data.map(d => d.flood_factor_score).filter(s => s != null);
  const fireScores = data.map(d => d.fire_factor_score).filter(s => s != null);
  const noiseScores = data.map(d => d.noise_score).filter(s => s != null);
  
  const avgListPrice = listPrices.length > 0 ? listPrices.reduce((a, b) => a + b, 0) / listPrices.length : null;
  const avgSoldPrice = soldPrices.length > 0 ? soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length : null;
  const medianSoldPrice = soldPrices.length > 0 ? soldPrices.sort((a, b) => a - b)[Math.floor(soldPrices.length / 2)] : null;
  const avgPricePerSqft = pricesPerSqft.length > 0 ? pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length : null;
  const avgTax = taxes.length > 0 ? taxes.reduce((a, b) => a + b, 0) / taxes.length : null;
  const avgFloodScore = floodScores.length > 0 ? floodScores.reduce((a, b) => a + b, 0) / floodScores.length : null;
  const avgFireScore = fireScores.length > 0 ? fireScores.reduce((a, b) => a + b, 0) / fireScores.length : null;
  const avgNoiseScore = noiseScores.length > 0 ? noiseScores.reduce((a, b) => a + b, 0) / noiseScores.length : null;
  
  return {
    count: data.length,
    avgListPrice: avgListPrice ? Math.round(avgListPrice) : null,
    avgSoldPrice: avgSoldPrice ? Math.round(avgSoldPrice) : null,
    medianSoldPrice: medianSoldPrice ? Math.round(medianSoldPrice) : null,
    avgPricePerSqft: avgPricePerSqft ? Math.round(avgPricePerSqft) : null,
    avgTax: avgTax ? Math.round(avgTax) : null,
    avgFloodScore: avgFloodScore ? Math.round(avgFloodScore * 10) / 10 : null,
    avgFireScore: avgFireScore ? Math.round(avgFireScore * 10) / 10 : null,
    avgNoiseScore: avgNoiseScore ? Math.round(avgNoiseScore) : null
  };
}

module.exports = {
  findByRealtorId,
  insert,
  update,
  processAndUpsertFromRealtor,
  getListingsByZipCode,
  getListingStatsByZipCode
};
