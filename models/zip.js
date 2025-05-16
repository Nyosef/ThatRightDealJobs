/**
 * Zip Model
 * Handles zip code data processing and storage
 */

const { db } = require('../index');

/**
 * Find a zip code by zip5
 * @param {string} zip5 - 5-digit ZIP code
 * @returns {Promise<Object|null>} Zip record or null if not found
 */
async function findByZip5(zip5) {
  const supabase = db.getSupabaseClient();
  const { data, error } = await supabase
    .from('zip')
    .select('*')
    .eq('zip5', zip5)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding zip code: ${error.message}`);
  return data;
}

/**
 * Insert a new zip code record
 * @param {Object} zipData - Zip code data
 * @returns {Promise<Object>} Inserted zip record
 */
async function insert(zipData) {
  return db.insertRecord('zip', zipData);
}

/**
 * Ensure a zip code exists in the database
 * If it doesn't exist, create it with the provided data
 * @param {string} zip5 - 5-digit ZIP code
 * @param {string} geoIdV4 - Geographic ID for the zip code
 * @returns {Promise<Object>} Zip record
 */
async function ensureZipExists(zip5, geoIdV4) {
  try {
    // Check if zip code already exists
    const existingZip = await findByZip5(zip5);
    
    if (existingZip) {
      console.log(`Zip code ${zip5} already exists in the database`);
      return existingZip;
    }
    
    // Create new zip code record
    console.log(`Creating new zip code record for ${zip5}`);
    
    const zipData = {
      zip5: zip5,
      geo_id_v4: geoIdV4,
      // Add default values for other required fields
      city: 'Unknown', // Default city name
      state: 'Unknown', // Default state
      land_sq_mi: 0, // Default land area
      water_sq_mi: 0, // Default water area
      created_at: new Date().toISOString()
    };
    
    const result = await insert(zipData);
    console.log(`Created zip code ${zip5} successfully`);
    return result;
  } catch (error) {
    console.error(`Error ensuring zip code ${zip5} exists:`, error.message);
    throw error;
  }
}

/**
 * Process and ensure all zip codes from the configuration exist in the database
 * @param {Object} zipGeoIdMapping - Mapping of ZIP codes to geoIdV4 values
 * @returns {Promise<Object>} Processing results
 */
async function processZipCodes(zipGeoIdMapping) {
  const result = {
    inserted: 0,
    existing: 0,
    errors: 0
  };
  
  console.log(`Processing ${Object.keys(zipGeoIdMapping).length} zip codes`);
  
  for (const [zip5, geoIdV4] of Object.entries(zipGeoIdMapping)) {
    try {
      const existingZip = await findByZip5(zip5);
      
      if (existingZip) {
        console.log(`Zip code ${zip5} already exists`);
        result.existing++;
      } else {
        await ensureZipExists(zip5, geoIdV4);
        result.inserted++;
      }
    } catch (error) {
      console.error(`Error processing zip code ${zip5}:`, error.message);
      result.errors++;
    }
  }
  
  return result;
}

module.exports = {
  findByZip5,
  insert,
  ensureZipExists,
  processZipCodes
};
