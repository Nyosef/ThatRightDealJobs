/**
 * Zip Medians Model
 * Handles median calculation for Zillow listing data by zip code
 */

const { db } = require('../index');

/**
 * Calculate median value from an array of numbers
 * @param {Array} values - Array of numeric values
 * @returns {number|null} Median value or null if no valid values
 */
function calculateMedian(values) {
  // Filter out null, undefined, and non-numeric values
  const validValues = values
    .filter(val => val !== null && val !== undefined && val !== '')
    .map(val => parseFloat(val))
    .filter(val => !isNaN(val));
  
  if (validValues.length === 0) {
    return null;
  }
  
  // Sort values in ascending order
  validValues.sort((a, b) => a - b);
  
  const length = validValues.length;
  const middle = Math.floor(length / 2);
  
  if (length % 2 === 0) {
    // Even number of values - return average of two middle values
    return (validValues[middle - 1] + validValues[middle]) / 2;
  } else {
    // Odd number of values - return middle value
    return validValues[middle];
  }
}

/**
 * Get Zillow listing data for a specific zip code
 * @param {string} zipCode - 5-digit ZIP code
 * @returns {Promise<Array>} Array of listing records
 */
async function getZillowListingDataForZip(zipCode) {
  const supabase = db.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('zillow_listing')
    .select('zestimate, last_sold_price, market_rent, bedrooms, bathrooms, sqft')
    .eq('zip5', zipCode);
  
  if (error) {
    throw new Error(`Error fetching Zillow listing data for zip ${zipCode}: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Calculate medians for all target columns for a specific zip code
 * @param {string} zipCode - 5-digit ZIP code
 * @returns {Promise<Object>} Object containing calculated medians
 */
async function calculateMediansForZipCode(zipCode) {
  try {
    console.log(`Calculating medians for zip code ${zipCode}...`);
    
    // Get all Zillow listing data for this zip code
    const listings = await getZillowListingDataForZip(zipCode);
    
    if (listings.length === 0) {
      console.log(`No Zillow listings found for zip code ${zipCode}`);
      return {
        median_zestimate: null,
        median_last_sold_price: null,
        median_market_rent: null,
        median_bedrooms: null,
        median_bathrooms: null,
        median_sqft: null,
        listings_count: 0
      };
    }
    
    console.log(`Processing ${listings.length} listings for zip code ${zipCode}`);
    
    // Extract values for each column
    const zestimates = listings.map(l => l.zestimate);
    const lastSoldPrices = listings.map(l => l.last_sold_price);
    const marketRents = listings.map(l => l.market_rent);
    const bedrooms = listings.map(l => l.bedrooms);
    const bathrooms = listings.map(l => l.bathrooms);
    const sqfts = listings.map(l => l.sqft);
    
    // Calculate medians for each column
    const medians = {
      median_zestimate: calculateMedian(zestimates),
      median_last_sold_price: calculateMedian(lastSoldPrices),
      median_market_rent: calculateMedian(marketRents),
      median_bedrooms: calculateMedian(bedrooms),
      median_bathrooms: calculateMedian(bathrooms),
      median_sqft: calculateMedian(sqfts),
      listings_count: listings.length
    };
    
    // Log the results
    console.log(`Medians calculated for zip code ${zipCode}:`);
    console.log(`  - Zestimate: $${medians.median_zestimate ? medians.median_zestimate.toLocaleString() : 'N/A'}`);
    console.log(`  - Last Sold Price: $${medians.median_last_sold_price ? medians.median_last_sold_price.toLocaleString() : 'N/A'}`);
    console.log(`  - Market Rent: $${medians.median_market_rent ? medians.median_market_rent.toLocaleString() : 'N/A'}`);
    console.log(`  - Bedrooms: ${medians.median_bedrooms || 'N/A'}`);
    console.log(`  - Bathrooms: ${medians.median_bathrooms || 'N/A'}`);
    console.log(`  - Square Feet: ${medians.median_sqft ? medians.median_sqft.toLocaleString() : 'N/A'}`);
    console.log(`  - Based on ${medians.listings_count} listings`);
    
    return medians;
  } catch (error) {
    console.error(`Error calculating medians for zip code ${zipCode}:`, error.message);
    throw error;
  }
}

/**
 * Update zip table with calculated median values
 * @param {string} zipCode - 5-digit ZIP code
 * @param {Object} medians - Object containing median values
 * @returns {Promise<Object>} Updated zip record
 */
async function updateZipMedians(zipCode, medians) {
  try {
    const supabase = db.getSupabaseClient();
    
    const updateData = {
      median_zestimate: medians.median_zestimate,
      median_last_sold_price: medians.median_last_sold_price,
      median_market_rent: medians.median_market_rent,
      median_bedrooms: medians.median_bedrooms,
      median_bathrooms: medians.median_bathrooms,
      median_sqft: medians.median_sqft,
      medians_updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('zip')
      .update(updateData)
      .eq('zip5', zipCode)
      .select();
    
    if (error) {
      throw new Error(`Error updating zip medians for ${zipCode}: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error(`No zip record found for zip code ${zipCode}`);
    }
    
    console.log(`Successfully updated medians for zip code ${zipCode}`);
    return data[0];
  } catch (error) {
    console.error(`Error updating zip medians for ${zipCode}:`, error.message);
    throw error;
  }
}

/**
 * Process median calculations for a single zip code
 * @param {string} zipCode - 5-digit ZIP code
 * @returns {Promise<Object>} Processing result
 */
async function processZipCodeMedians(zipCode) {
  try {
    // Calculate medians
    const medians = await calculateMediansForZipCode(zipCode);
    
    // Update zip table
    await updateZipMedians(zipCode, medians);
    
    return {
      zipCode,
      success: true,
      listingsCount: medians.listings_count,
      medians: {
        zestimate: medians.median_zestimate,
        lastSoldPrice: medians.median_last_sold_price,
        marketRent: medians.median_market_rent,
        bedrooms: medians.median_bedrooms,
        bathrooms: medians.median_bathrooms,
        sqft: medians.median_sqft
      }
    };
  } catch (error) {
    console.error(`Failed to process medians for zip code ${zipCode}:`, error.message);
    return {
      zipCode,
      success: false,
      error: error.message,
      listingsCount: 0,
      medians: null
    };
  }
}

/**
 * Get all zip codes that have Zillow listing data
 * @returns {Promise<Array>} Array of zip codes
 */
async function getZipCodesWithZillowData() {
  const supabase = db.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('zillow_listing')
    .select('zip5')
    .not('zip5', 'is', null);
  
  if (error) {
    throw new Error(`Error fetching zip codes with Zillow data: ${error.message}`);
  }
  
  // Get unique zip codes
  const uniqueZipCodes = [...new Set(data.map(record => record.zip5))];
  return uniqueZipCodes.filter(zip => zip && zip.length === 5);
}

/**
 * Get all zip codes from the zip table
 * @returns {Promise<Array>} Array of zip codes
 */
async function getAllZipCodes() {
  const supabase = db.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('zip')
    .select('zip5')
    .not('zip5', 'is', null);
  
  if (error) {
    throw new Error(`Error fetching all zip codes: ${error.message}`);
  }
  
  return data.map(record => record.zip5).filter(zip => zip && zip.length === 5);
}

module.exports = {
  calculateMedian,
  getZillowListingDataForZip,
  calculateMediansForZipCode,
  updateZipMedians,
  processZipCodeMedians,
  getZipCodesWithZillowData,
  getAllZipCodes
};
