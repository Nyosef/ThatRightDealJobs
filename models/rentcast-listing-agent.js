/**
 * RentCast Listing Agent Model
 * Handles RentCast listing agent data processing and storage
 */

const supabaseUtils = require('../utils/supabase');

/**
 * Find a listing agent by rentcast_id
 * @param {string} rentcastId - RentCast property ID
 * @returns {Promise<Object|null>} Listing agent record or null if not found
 */
async function findByRentcastId(rentcastId) {
  const supabase = supabaseUtils.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('rentcast_listing_agent')
    .select('*')
    .eq('rentcast_id', rentcastId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding listing agent: ${error.message}`);
  return data;
}

/**
 * Insert a new RentCast listing agent record
 * @param {Object} agentData - Listing agent data
 * @returns {Promise<Object>} Inserted listing agent record
 */
async function insert(agentData) {
  return supabaseUtils.insertRecord('rentcast_listing_agent', agentData);
}

/**
 * Update an existing RentCast listing agent record
 * @param {string} rentcastId - RentCast property ID
 * @param {Object} agentData - Updated listing agent data
 * @returns {Promise<Object>} Updated listing agent record
 */
async function update(rentcastId, agentData) {
  return supabaseUtils.updateRecords('rentcast_listing_agent', { rentcast_id: rentcastId }, agentData);
}

/**
 * Process RentCast API listing agent data and insert or update records
 * @param {string} rentcastId - RentCast property ID
 * @param {Object} apiData - RentCast API response (listingAgent section)
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
    // Skip if no agent data
    if (!apiData || !rentcastId) {
      return result;
    }
    
    // Transform API data to our schema
    const agentData = transformRentCastAgentData(rentcastId, apiData);
    
    // Check if agent exists for this property
    const existingAgent = await findByRentcastId(rentcastId);
    
    if (existingAgent) {
      // Check if data has changed
      if (hasAgentDataChanged(existingAgent, agentData)) {
        console.log(`Updating listing agent for rentcast_id: ${rentcastId} - data has changed`);
        await update(rentcastId, agentData);
        result.updated++;
      } else {
        // Record is unchanged
        result.unchanged++;
      }
    } else {
      // Insert new agent
      console.log(`Inserting new listing agent for rentcast_id: ${rentcastId}`);
      await insert(agentData);
      result.inserted++;
    }
  } catch (error) {
    console.error(`Error processing listing agent:`, error.message);
    console.error('Error details:', error);
    result.errors++;
  }
  
  return result;
}

// Helper functions
function transformRentCastAgentData(rentcastId, apiData) {
  // Transform RentCast API agent data to our schema
  return {
    rentcast_id: rentcastId,
    name: apiData.name,
    phone: apiData.phone,
    email: apiData.email,
    website: apiData.website
  };
}

function hasAgentDataChanged(existingAgent, newAgentData) {
  // Compare essential fields
  const fieldsToCompare = [
    'name',
    'phone',
    'email',
    'website'
  ];
  
  for (const field of fieldsToCompare) {
    if (existingAgent[field] !== newAgentData[field]) {
      console.log(`Field ${field} changed: ${existingAgent[field]} -> ${newAgentData[field]}`);
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
