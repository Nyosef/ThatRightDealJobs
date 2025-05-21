/**
 * RentCast Builder Model
 * Handles RentCast builder data processing and storage
 */

const supabaseUtils = require('../utils/supabase');

/**
 * Find a builder by rentcast_id
 * @param {string} rentcastId - RentCast property ID
 * @returns {Promise<Object|null>} Builder record or null if not found
 */
async function findByRentcastId(rentcastId) {
  const supabase = supabaseUtils.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('rentcast_builder')
    .select('*')
    .eq('rentcast_id', rentcastId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding builder: ${error.message}`);
  return data;
}

/**
 * Insert a new RentCast builder record
 * @param {Object} builderData - Builder data
 * @returns {Promise<Object>} Inserted builder record
 */
async function insert(builderData) {
  return supabaseUtils.insertRecord('rentcast_builder', builderData);
}

/**
 * Update an existing RentCast builder record
 * @param {string} rentcastId - RentCast property ID
 * @param {Object} builderData - Updated builder data
 * @returns {Promise<Object>} Updated builder record
 */
async function update(rentcastId, builderData) {
  return supabaseUtils.updateRecords('rentcast_builder', { rentcast_id: rentcastId }, builderData);
}

/**
 * Process RentCast API builder data and insert or update records
 * @param {string} rentcastId - RentCast property ID
 * @param {Object} apiData - RentCast API response (builder section)
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
    // Skip if no builder data
    if (!apiData || !rentcastId) {
      return result;
    }
    
    // Transform API data to our schema
    const builderData = transformRentCastBuilderData(rentcastId, apiData);
    
    // Check if builder exists for this property
    const existingBuilder = await findByRentcastId(rentcastId);
    
    if (existingBuilder) {
      // Check if data has changed
      if (hasBuilderDataChanged(existingBuilder, builderData)) {
        console.log(`Updating builder for rentcast_id: ${rentcastId} - data has changed`);
        await update(rentcastId, builderData);
        result.updated++;
      } else {
        // Record is unchanged
        result.unchanged++;
      }
    } else {
      // Insert new builder
      console.log(`Inserting new builder for rentcast_id: ${rentcastId}`);
      await insert(builderData);
      result.inserted++;
    }
  } catch (error) {
    console.error(`Error processing builder:`, error.message);
    console.error('Error details:', error);
    result.errors++;
  }
  
  return result;
}

// Helper functions
function transformRentCastBuilderData(rentcastId, apiData) {
  // Transform RentCast API builder data to our schema
  return {
    rentcast_id: rentcastId,
    name: apiData.name,
    development: apiData.development,
    phone: apiData.phone,
    website: apiData.website
  };
}

function hasBuilderDataChanged(existingBuilder, newBuilderData) {
  // Compare essential fields
  const fieldsToCompare = [
    'name',
    'development',
    'phone',
    'website'
  ];
  
  for (const field of fieldsToCompare) {
    if (existingBuilder[field] !== newBuilderData[field]) {
      console.log(`Field ${field} changed: ${existingBuilder[field]} -> ${newBuilderData[field]}`);
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
