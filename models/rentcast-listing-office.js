/**
 * RentCast Listing Office Model
 * Handles RentCast listing office data processing and storage
 */

const supabaseUtils = require('../utils/supabase');

/**
 * Find a listing office by rentcast_id
 * @param {string} rentcastId - RentCast property ID
 * @returns {Promise<Object|null>} Listing office record or null if not found
 */
async function findByRentcastId(rentcastId) {
  const supabase = supabaseUtils.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('rentcast_listing_office')
    .select('*')
    .eq('rentcast_id', rentcastId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding listing office: ${error.message}`);
  return data;
}

/**
 * Insert a new RentCast listing office record
 * @param {Object} officeData - Listing office data
 * @returns {Promise<Object>} Inserted listing office record
 */
async function insert(officeData) {
  return supabaseUtils.insertRecord('rentcast_listing_office', officeData);
}

/**
 * Update an existing RentCast listing office record
 * @param {string} rentcastId - RentCast property ID
 * @param {Object} officeData - Updated listing office data
 * @returns {Promise<Object>} Updated listing office record
 */
async function update(rentcastId, officeData) {
  return supabaseUtils.updateRecords('rentcast_listing_office', { rentcast_id: rentcastId }, officeData);
}

/**
 * Process RentCast API listing office data and insert or update records
 * @param {string} rentcastId - RentCast property ID
 * @param {Object} apiData - RentCast API response (listingOffice section)
 * @returns {Promise<Object>} Processing results
 */
async function processAndUpsertFromRentCast(rentcastId, apiData) {
  const result = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0
  };
  
  try {
    // Skip if no office data
    if (!apiData || !rentcastId) {
      return result;
    }
    
    // Transform API data to our schema
    const officeData = transformRentCastOfficeData(rentcastId, apiData);
    
    // Check if office exists for this property
    const existingOffice = await findByRentcastId(rentcastId);
    
    if (existingOffice) {
      // Check if data has changed
      if (hasOfficeDataChanged(existingOffice, officeData)) {
        console.log(`Updating listing office for rentcast_id: ${rentcastId} - data has changed`);
        await update(rentcastId, officeData);
        result.updated++;
      } else {
        // Record is unchanged
        result.unchanged++;
      }
    } else {
      // Insert new office
      console.log(`Inserting new listing office for rentcast_id: ${rentcastId}`);
      await insert(officeData);
      result.inserted++;
    }
  } catch (error) {
    console.error(`Error processing listing office:`, error.message);
    console.error('Error details:', error);
    result.errors++;
  }
  
  return result;
}

// Helper functions
function transformRentCastOfficeData(rentcastId, apiData) {
  // Transform RentCast API office data to our schema
  return {
    rentcast_id: rentcastId,
    name: apiData.name,
    phone: apiData.phone,
    email: apiData.email,
    website: apiData.website
  };
}

function hasOfficeDataChanged(existingOffice, newOfficeData) {
  // Compare essential fields
  const fieldsToCompare = [
    'name',
    'phone',
    'email',
    'website'
  ];
  
  for (const field of fieldsToCompare) {
    if (existingOffice[field] !== newOfficeData[field]) {
      console.log(`Field ${field} changed: ${existingOffice[field]} -> ${newOfficeData[field]}`);
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
