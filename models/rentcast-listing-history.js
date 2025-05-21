/**
 * RentCast Listing History Model
 * Handles RentCast listing history data processing and storage
 */

const supabaseUtils = require('../utils/supabase');

/**
 * Find listing history entries by rentcast_id
 * @param {string} rentcastId - RentCast property ID
 * @returns {Promise<Array>} Array of listing history records
 */
async function findByRentcastId(rentcastId) {
  const supabase = supabaseUtils.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('rentcast_listing_history')
    .select('*')
    .eq('rentcast_id', rentcastId)
    .order('event_date', { ascending: false });
    
  if (error) throw new Error(`Error finding listing history: ${error.message}`);
  return data || [];
}

/**
 * Find a specific listing history entry by rentcast_id and event_date
 * @param {string} rentcastId - RentCast property ID
 * @param {string} eventDate - Event date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Listing history record or null if not found
 */
async function findByRentcastIdAndDate(rentcastId, eventDate) {
  const supabase = supabaseUtils.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('rentcast_listing_history')
    .select('*')
    .eq('rentcast_id', rentcastId)
    .eq('event_date', eventDate)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding listing history: ${error.message}`);
  return data;
}

/**
 * Insert a new RentCast listing history record
 * @param {Object} historyData - Listing history data
 * @returns {Promise<Object>} Inserted listing history record
 */
async function insert(historyData) {
  return supabaseUtils.insertRecord('rentcast_listing_history', historyData);
}

/**
 * Update an existing RentCast listing history record
 * @param {string} rentcastId - RentCast property ID
 * @param {string} eventDate - Event date in YYYY-MM-DD format
 * @param {Object} historyData - Updated listing history data
 * @returns {Promise<Object>} Updated listing history record
 */
async function update(rentcastId, eventDate, historyData) {
  return supabaseUtils.updateRecords(
    'rentcast_listing_history', 
    { rentcast_id: rentcastId, event_date: eventDate }, 
    historyData
  );
}

/**
 * Process RentCast API listing history data and insert or update records
 * @param {string} rentcastId - RentCast property ID
 * @param {Object} apiData - RentCast API response (history section)
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
    // Skip if no history data
    if (!apiData || !rentcastId) {
      return result;
    }
    
    // Process each history entry
    for (const [eventDate, eventData] of Object.entries(apiData)) {
      try {
        // Transform API data to our schema
        const historyData = transformRentCastHistoryData(rentcastId, eventDate, eventData);
        
        // Check if history entry exists for this property and date
        const existingHistory = await findByRentcastIdAndDate(rentcastId, eventDate);
        
        if (existingHistory) {
          // Check if data has changed
          if (hasHistoryDataChanged(existingHistory, historyData)) {
            console.log(`Updating listing history for rentcast_id: ${rentcastId}, date: ${eventDate} - data has changed`);
            await update(rentcastId, eventDate, historyData);
            result.updated++;
          } else {
            // Record is unchanged
            result.unchanged++;
          }
        } else {
          // Insert new history entry
          console.log(`Inserting new listing history for rentcast_id: ${rentcastId}, date: ${eventDate}`);
          await insert(historyData);
          result.inserted++;
        }
      } catch (error) {
        console.error(`Error processing history entry for date ${eventDate}:`, error.message);
        result.errors++;
      }
    }
  } catch (error) {
    console.error(`Error processing listing history:`, error.message);
    console.error('Error details:', error);
    result.errors++;
  }
  
  return result;
}

// Helper functions
function transformRentCastHistoryData(rentcastId, eventDate, apiData) {
  // Extract date part only from the event date (YYYY-MM-DD)
  const datePart = eventDate.split('T')[0];
  
  // Transform RentCast API history data to our schema
  return {
    rentcast_id: rentcastId,
    event_date: datePart,
    event: apiData.event,
    price: apiData.price,
    listing_type: apiData.listingType,
    listed_date: apiData.listedDate,
    removed_date: apiData.removedDate,
    days_on_market: apiData.daysOnMarket
  };
}

function hasHistoryDataChanged(existingHistory, newHistoryData) {
  // Compare essential fields
  const fieldsToCompare = [
    'event',
    'price',
    'listing_type',
    'listed_date',
    'removed_date',
    'days_on_market'
  ];
  
  for (const field of fieldsToCompare) {
    if (existingHistory[field] !== newHistoryData[field]) {
      console.log(`Field ${field} changed: ${existingHistory[field]} -> ${newHistoryData[field]}`);
      return true;
    }
  }
  
  return false;
}

module.exports = {
  findByRentcastId,
  findByRentcastIdAndDate,
  insert,
  update,
  processAndUpsertFromRentCast
};
