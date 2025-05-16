/**
 * Property Model
 * Handles property data processing and storage
 */

const { db } = require('../index');

/**
 * Find a property by attom_id
 * @param {number} attomId - ATTOM property ID (int8)
 * @returns {Promise<Object|null>} Property record or null if not found
 */
async function findByAttomId(attomId) {
  const supabase = db.getSupabaseClient();
  
  // Ensure attomId is a number
  const numericAttomId = typeof attomId === 'string' ? parseInt(attomId) : attomId;
  
  if (isNaN(numericAttomId)) {
    throw new Error(`Invalid attom_id: ${attomId} is not a valid number`);
  }
  
  const { data, error } = await supabase
    .from('property')
    .select('*')
    .eq('attom_id', numericAttomId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding property: ${error.message}`);
  return data;
}

/**
 * Insert a new property record
 * @param {Object} propertyData - Property data
 * @returns {Promise<Object>} Inserted property record
 */
async function insert(propertyData) {
  return db.insertRecord('property', propertyData);
}

/**
 * Update an existing property record
 * @param {number} attomId - ATTOM property ID (int8)
 * @param {Object} propertyData - Updated property data
 * @returns {Promise<Object>} Updated property record
 */
async function update(attomId, propertyData) {
  // Ensure attomId is a number
  const numericAttomId = typeof attomId === 'string' ? parseInt(attomId) : attomId;
  
  if (isNaN(numericAttomId)) {
    throw new Error(`Invalid attom_id: ${attomId} is not a valid number`);
  }
  
  return db.updateRecords('property', { attom_id: numericAttomId }, propertyData);
}

/**
 * Process ATTOM API property data and insert or update records
 * @param {Object} apiData - ATTOM API response
 * @param {string} zipCode - Zip code being processed
 * @returns {Promise<Object>} Processing results
 */
async function processAndUpsertFromAttom(apiData, zipCode) {
  const result = {
    inserted: 0,
    updated: 0,
    errors: 0
  };
  
  // Extract properties from API response
  const properties = extractPropertiesFromAttomResponse(apiData);
  
  console.log(`Processing ${properties.length} properties for zip code ${zipCode}`);
  
  for (const property of properties) {
    try {
      // Transform API data to our schema
      const propertyData = transformAttomPropertyData(property, zipCode);
      
      // Debug the first property
      if (result.inserted === 0 && result.updated === 0 && result.errors === 0) {
        console.log('First property data:', JSON.stringify(propertyData, null, 2));
        console.log('Original property data structure:', JSON.stringify(property, null, 2));
      }
      
      // Skip if no attom_id
      if (!propertyData.attom_id) {
        console.warn('Property missing attom_id, skipping');
        continue;
      }
      
      // Check if property exists
      const existingProperty = await findByAttomId(propertyData.attom_id);
      
      if (existingProperty) {
        // Check if data has changed
        if (hasPropertyDataChanged(existingProperty, propertyData)) {
          await update(existingProperty.attom_id, propertyData);
          result.updated++;
        }
      } else {
        // Insert new property
        console.log(`Inserting new property with attom_id: ${propertyData.attom_id}`);
        await insert(propertyData);
        result.inserted++;
      }
    } catch (error) {
      console.error(`Error processing property:`, error.message);
      console.error('Error details:', error);
      result.errors++;
    }
  }
  
  return result;
}

// Helper functions
function extractPropertiesFromAttomResponse(apiData) {
  // Extract properties from the API response structure
  // The actual structure will depend on the ATTOM API response format
  return apiData.property || [];
}

function transformAttomPropertyData(property, zipCode) {
  // Transform ATTOM API property data to our schema
  // This mapping will need to be adjusted based on the actual ATTOM API response structure
  
  // Ensure attom_id is a number (int8) to match the database schema
  let attomId;
  if (property.identifier?.attomId && !isNaN(parseInt(property.identifier.attomId))) {
    attomId = parseInt(property.identifier.attomId);
  } else {
    // Generate a unique numeric ID if attomId is not available or not a number
    attomId = Date.now();
    console.warn(`Property missing valid attomId, generating: ${attomId}`);
  }
  
  return {
    attom_id: attomId,
    zip5: zipCode,
    apn: property.identifier?.apn,
    address_line1: property.address?.line1, // Changed from address_line to address_line1 to match DB schema
    address_full: `${property.address?.line1}, ${property.address?.line2}`,
    lat: property.location?.latitude,
    lon: property.location?.longitude,
    property_type: property.summary?.propType,
    year_built: property.summary?.yearBuilt,
    livable_sqft: property.building?.size?.livingSize,
    lot_size_acre: property.lot?.lotSize1,
    last_updated: new Date().toISOString().split('T')[0]
  };
}

function hasPropertyDataChanged(existingProperty, newPropertyData) {
  // Compare relevant fields
  return (
    existingProperty.address_line1 !== newPropertyData.address_line1 || // Changed from address_line to address_line1
    existingProperty.address_full !== newPropertyData.address_full ||
    existingProperty.lat !== newPropertyData.lat ||
    existingProperty.lon !== newPropertyData.lon ||
    existingProperty.property_type !== newPropertyData.property_type ||
    existingProperty.year_built !== newPropertyData.year_built ||
    existingProperty.livable_sqft !== newPropertyData.livable_sqft ||
    existingProperty.lot_size_acre !== newPropertyData.lot_size_acre
  );
}

module.exports = {
  findByAttomId,
  insert,
  update,
  processAndUpsertFromAttom
};
