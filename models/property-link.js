/**
 * Property Link Model
 * Handles linking between ATTOM and RentCast properties
 */

const supabaseUtils = require('../utils/supabase');

/**
 * Find property link by attom_id
 * @param {number} attomId - ATTOM property ID
 * @returns {Promise<Object|null>} Property link record or null if not found
 */
async function findByAttomId(attomId) {
  const supabase = supabaseUtils.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('property_link')
    .select('*')
    .eq('attom_id', attomId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding property link: ${error.message}`);
  return data;
}

/**
 * Find property link by rentcast_id
 * @param {string} rentcastId - RentCast property ID
 * @returns {Promise<Object|null>} Property link record or null if not found
 */
async function findByRentcastId(rentcastId) {
  const supabase = supabaseUtils.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('property_link')
    .select('*')
    .eq('rentcast_id', rentcastId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding property link: ${error.message}`);
  return data;
}

/**
 * Insert a new property link record
 * @param {Object} linkData - Property link data
 * @returns {Promise<Object>} Inserted property link record
 */
async function insert(linkData) {
  return supabaseUtils.insertRecord('property_link', linkData);
}

/**
 * Update an existing property link record
 * @param {number} id - Property link ID
 * @param {Object} linkData - Updated property link data
 * @returns {Promise<Object>} Updated property link record
 */
async function update(id, linkData) {
  return supabaseUtils.updateRecords('property_link', { id }, linkData);
}

/**
 * Find properties in ATTOM that match a RentCast property by geographic proximity
 * @param {number} latitude - Property latitude
 * @param {number} longitude - Property longitude
 * @param {number} radiusMeters - Search radius in meters (default: 50)
 * @returns {Promise<Array>} Matching ATTOM properties
 */
async function findAttomPropertiesByLocation(latitude, longitude, radiusMeters = 50) {
  const supabase = supabaseUtils.getSupabaseClient();
  
  // Use a SQL query to find properties within the specified radius
  // This is a simplified version that calculates distance using the Haversine formula
  const { data, error } = await supabase.rpc('find_properties_by_location', {
    lat: latitude,
    lon: longitude,
    radius_meters: radiusMeters
  });
  
  if (error) {
    console.error(`Error finding properties by location: ${error.message}`);
    
    // Fallback to a simpler query if the RPC function is not available
    // This is less accurate but will work without the PostGIS extension
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('property')
      .select('*')
      .gte('lat', latitude - 0.001) // Approximately 100 meters in latitude
      .lte('lat', latitude + 0.001)
      .gte('lon', longitude - 0.001) // Approximately 100 meters in longitude at most latitudes
      .lte('lon', longitude + 0.001);
      
    if (fallbackError) {
      throw new Error(`Error in fallback query: ${fallbackError.message}`);
    }
    
    // Calculate distance for each property
    return (fallbackData || []).map(property => ({
      ...property,
      distance: calculateHaversineDistance(
        latitude, longitude,
        property.lat, property.lon
      )
    })).filter(property => property.distance <= radiusMeters);
  }
  
  // Map the results to use the standard property field names
  return (data || []).map(item => ({
    attom_id: item.attom_id,
    address_line1: item.address_line1,
    lat: item.property_lat,
    lon: item.property_lon,
    distance: item.distance
  }));
}

/**
 * Link a RentCast property to an ATTOM property
 * @param {number} attomId - ATTOM property ID
 * @param {string} rentcastId - RentCast property ID
 * @param {number} confidence - Match confidence score (0-1)
 * @param {string} method - Matching method used (geo, address, manual)
 * @returns {Promise<Object>} Property link record
 */
async function linkProperties(attomId, rentcastId, confidence, method) {
  // Check if link already exists
  const existingLink = await findByAttomId(attomId);
  
  if (existingLink) {
    // Update existing link
    return update(existingLink.id, {
      rentcast_id: rentcastId,
      match_confidence: confidence,
      match_method: method,
      updated_at: new Date().toISOString()
    });
  } else {
    // Create new link
    return insert({
      attom_id: attomId,
      rentcast_id: rentcastId,
      match_confidence: confidence,
      match_method: method
    });
  }
}

/**
 * Find the best matching ATTOM property for a RentCast property
 * @param {Object} rentcastProperty - RentCast property data
 * @returns {Promise<Object|null>} Best matching ATTOM property or null if no match found
 */
async function findBestAttomMatch(rentcastProperty) {
  // Try geographic matching first
  const geoMatches = await findAttomPropertiesByLocation(
    rentcastProperty.latitude,
    rentcastProperty.longitude
  );
  
  if (geoMatches.length > 0) {
    // Sort by distance (closest first)
    geoMatches.sort((a, b) => a.distance - b.distance);
    
    // Calculate confidence based on distance
    // 0 meters = 1.0 confidence, 50 meters = 0.5 confidence
    const confidence = Math.max(0, 1 - (geoMatches[0].distance / 100));
    
    return {
      attomId: geoMatches[0].attom_id,
      confidence,
      method: 'geo'
    };
  }
  
  // If no geographic matches, could implement address matching here
  
  // No match found
  return null;
}

/**
 * Calculate the Haversine distance between two points in meters
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

module.exports = {
  findByAttomId,
  findByRentcastId,
  insert,
  update,
  findAttomPropertiesByLocation,
  linkProperties,
  findBestAttomMatch
};
