/**
 * Configuration utilities
 */

// Configuration for zip codes and their geoIdV4 values
const DEFAULT_ZIP_GEOID_MAPPING = {
  '16146': '9910140a4987c800f1399e10ccabb2d0',
  // Add more zip codes and their geoIdV4 values as needed
};

/**
 * Get the mapping of ZIP codes to geoIdV4 values
 * Allows for environment variable override
 * @returns {Object} Mapping of ZIP codes to geoIdV4 values
 */
function getZipGeoIdMapping() {
  // Check if there's a custom mapping in environment variables
  if (process.env.ZIP_GEOID_MAPPING) {
    try {
      return JSON.parse(process.env.ZIP_GEOID_MAPPING);
    } catch (error) {
      console.warn('Invalid ZIP_GEOID_MAPPING environment variable. Using default mapping.');
    }
  }
  
  return DEFAULT_ZIP_GEOID_MAPPING;
}

module.exports = {
  getZipGeoIdMapping
};
