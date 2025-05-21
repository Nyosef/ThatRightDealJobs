/**
 * RentCast Listing Model
 * Handles RentCast listing data processing and storage
 */

const supabaseUtils = require('../utils/supabase');

/**
 * Find a listing by rentcast_id
 * @param {string} rentcastId - RentCast listing ID
 * @returns {Promise<Object|null>} Listing record or null if not found
 */
async function findByRentcastId(rentcastId) {
  // We're using the same table as properties since listings are essentially properties with additional data
  const supabase = supabaseUtils.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('rentcast_properties')
    .select('*')
    .eq('rentcast_id', rentcastId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding listing: ${error.message}`);
  return data;
}

/**
 * Insert a new RentCast listing record
 * @param {Object} listingData - Listing data
 * @returns {Promise<Object>} Inserted listing record
 */
async function insert(listingData) {
  return supabaseUtils.insertRecord('rentcast_properties', listingData);
}

/**
 * Update an existing RentCast listing record
 * @param {string} rentcastId - RentCast listing ID
 * @param {Object} listingData - Updated listing data
 * @returns {Promise<Object>} Updated listing record
 */
async function update(rentcastId, listingData) {
  return supabaseUtils.updateRecords('rentcast_properties', { rentcast_id: rentcastId }, listingData);
}

/**
 * Process RentCast API listing data and insert or update records
 * @param {Object} apiData - RentCast API response
 * @returns {Promise<Object>} Processing results
 */
async function processAndUpsertFromRentCast(apiData) {
  const result = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    skipped: 0
  };
  
  try {
    // Transform API data to our schema
    const listingData = transformRentCastListingData(apiData);
    
    // Skip if no rentcast_id
    if (!listingData.rentcast_id) {
      console.warn('Listing missing rentcast_id, skipping');
      result.skipped++;
      return result;
    }
    
    // Check if listing exists
    const existingListing = await findByRentcastId(listingData.rentcast_id);
    
    if (existingListing) {
      // Check if data has changed
      if (hasListingDataChanged(existingListing, listingData)) {
        console.log(`Updating listing with rentcast_id: ${listingData.rentcast_id} - data has changed`);
        await update(existingListing.rentcast_id, listingData);
        result.updated++;
      } else {
        // Record is unchanged
        result.unchanged++;
      }
    } else {
      // Insert new listing
      console.log(`Inserting new listing with rentcast_id: ${listingData.rentcast_id}`);
      await insert(listingData);
      result.inserted++;
    }
  } catch (error) {
    console.error(`Error processing listing:`, error.message);
    console.error('Error details:', error);
    result.errors++;
  }
  
  return result;
}

// Helper functions
function transformRentCastListingData(apiData) {
  // Transform RentCast API listing data to our schema
  return {
    rentcast_id: apiData.id,
    formatted_address: apiData.formattedAddress,
    city: apiData.city,
    state: apiData.state,
    zip_code: apiData.zipCode,
    latitude: apiData.latitude,
    longitude: apiData.longitude,
    property_type: apiData.propertyType,
    bedrooms: apiData.bedrooms,
    bathrooms: apiData.bathrooms,
    square_footage: apiData.squareFootage,
    lot_size: apiData.lotSize,
    year_built: apiData.yearBuilt,
    hoa_fee: apiData.hoa?.fee,
    status: apiData.status,
    price: apiData.price,
    listing_type: apiData.listingType,
    listed_date: apiData.listedDate,
    removed_date: apiData.removedDate,
    last_seen_date: apiData.lastSeenDate,
    days_on_market: apiData.daysOnMarket,
    mls_name: apiData.mlsName,
    mls_number: apiData.mlsNumber
  };
}

function hasListingDataChanged(existingListing, newListingData) {
  // Compare essential fields
  const fieldsToCompare = [
    'formatted_address',
    'city',
    'state',
    'zip_code',
    'latitude',
    'longitude',
    'property_type',
    'bedrooms',
    'bathrooms',
    'square_footage',
    'lot_size',
    'year_built',
    'hoa_fee',
    'status',
    'price',
    'listing_type',
    'listed_date',
    'removed_date',
    'last_seen_date',
    'days_on_market',
    'mls_name',
    'mls_number'
  ];
  
  // Date fields that need special comparison
  const dateFields = [
    'listed_date',
    'removed_date',
    'last_seen_date'
  ];
  
  for (const field of fieldsToCompare) {
    // Special handling for null/undefined comparison
    const existingValue = existingListing[field];
    const newValue = newListingData[field];
    
    // Treat null and undefined as equivalent
    if ((existingValue === null && newValue === undefined) || 
        (existingValue === undefined && newValue === null)) {
      continue;
    }
    
    // Special handling for date fields
    if (dateFields.includes(field) && existingValue && newValue) {
      // Compare dates by their value rather than string representation
      const existingDate = new Date(existingValue).getTime();
      const newDate = new Date(newValue).getTime();
      
      if (existingDate !== newDate) {
        console.log(`Field ${field} changed: ${existingValue} -> ${newValue}`);
        return true;
      }
    }
    // Regular comparison for other fields
    else if (existingValue !== newValue) {
      console.log(`Field ${field} changed: ${existingValue} -> ${newValue}`);
      return true;
    }
  }
  
  return false;
}

module.exports = {
  findByRentcastId,
  insert,
  update,
  processAndUpsertFromRentCast
};
