/**
 * Zip Medians by Bedrooms Model
 * Handles median calculation for Zillow listing data by zip code and bedroom count
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
 * Get bedroom category for grouping (2, 3, 4, 5, 6+)
 * @param {number} bedrooms - Number of bedrooms
 * @returns {string} Bedroom category
 */
function getBedroomCategory(bedrooms) {
  if (bedrooms === null || bedrooms === undefined) {
    return null;
  }
  
  const bedroomCount = parseInt(bedrooms);
  
  if (bedroomCount >= 6) {
    return '6plus';
  } else if (bedroomCount >= 2 && bedroomCount <= 5) {
    return bedroomCount.toString();
  } else {
    // Skip properties with 0, 1 bedrooms or invalid values
    return null;
  }
}

/**
 * Get Zillow listing data for a specific zip code grouped by bedroom count
 * @param {string} zipCode - 5-digit ZIP code
 * @returns {Promise<Object>} Object with listings grouped by bedroom category
 */
async function getZillowListingDataByBedroomsForZip(zipCode) {
  const supabase = db.getSupabaseClient();
  
  const { data, error } = await supabase
    .from('zillow_listing')
    .select('zestimate, last_sold_price, market_rent, bedrooms, bathrooms, sqft')
    .eq('zip5', zipCode)
    .not('bedrooms', 'is', null);
  
  if (error) {
    throw new Error(`Error fetching Zillow listing data for zip ${zipCode}: ${error.message}`);
  }
  
  // Group listings by bedroom category
  const groupedListings = {
    '2': [],
    '3': [],
    '4': [],
    '5': [],
    '6plus': []
  };
  
  (data || []).forEach(listing => {
    const category = getBedroomCategory(listing.bedrooms);
    if (category && groupedListings[category]) {
      groupedListings[category].push(listing);
    }
  });
  
  return groupedListings;
}

/**
 * Calculate medians for a specific bedroom category
 * @param {Array} listings - Array of listings for this bedroom category
 * @param {string} category - Bedroom category (2, 3, 4, 5, 6plus)
 * @returns {Object} Object containing calculated medians for this category
 */
function calculateMediansForBedroomCategory(listings, category) {
  if (listings.length === 0) {
    return {
      [`median_zestimate_${category}br`]: null,
      [`median_last_sold_price_${category}br`]: null,
      [`median_market_rent_${category}br`]: null,
      [`median_bedrooms_${category}br`]: null,
      [`median_bathrooms_${category}br`]: null,
      [`median_sqft_${category}br`]: null,
      [`listings_count_${category}br`]: 0
    };
  }
  
  // Extract values for each column
  const zestimates = listings.map(l => l.zestimate);
  const lastSoldPrices = listings.map(l => l.last_sold_price);
  const marketRents = listings.map(l => l.market_rent);
  const bedrooms = listings.map(l => l.bedrooms);
  const bathrooms = listings.map(l => l.bathrooms);
  const sqfts = listings.map(l => l.sqft);
  
  // Calculate medians for each column
  const suffix = category === '6plus' ? '_6plus_br' : `_${category}br`;
  
  return {
    [`median_zestimate${suffix}`]: calculateMedian(zestimates),
    [`median_last_sold_price${suffix}`]: calculateMedian(lastSoldPrices),
    [`median_market_rent${suffix}`]: calculateMedian(marketRents),
    [`median_bedrooms${suffix}`]: calculateMedian(bedrooms),
    [`median_bathrooms${suffix}`]: calculateMedian(bathrooms),
    [`median_sqft${suffix}`]: calculateMedian(sqfts),
    [`listings_count${suffix}`]: listings.length
  };
}

/**
 * Calculate medians for all bedroom categories for a specific zip code
 * @param {string} zipCode - 5-digit ZIP code
 * @returns {Promise<Object>} Object containing calculated medians for all bedroom categories
 */
async function calculateBedroomMediansForZipCode(zipCode) {
  try {
    console.log(`Calculating bedroom-specific medians for zip code ${zipCode}...`);
    
    // Get all Zillow listing data grouped by bedrooms for this zip code
    const groupedListings = await getZillowListingDataByBedroomsForZip(zipCode);
    
    // Calculate total listings count
    const totalListings = Object.values(groupedListings).reduce((sum, listings) => sum + listings.length, 0);
    
    if (totalListings === 0) {
      console.log(`No Zillow listings found for zip code ${zipCode}`);
      return {
        median_zestimate_2br: null,
        median_last_sold_price_2br: null,
        median_market_rent_2br: null,
        median_bedrooms_2br: null,
        median_bathrooms_2br: null,
        median_sqft_2br: null,
        median_zestimate_3br: null,
        median_last_sold_price_3br: null,
        median_market_rent_3br: null,
        median_bedrooms_3br: null,
        median_bathrooms_3br: null,
        median_sqft_3br: null,
        median_zestimate_4br: null,
        median_last_sold_price_4br: null,
        median_market_rent_4br: null,
        median_bedrooms_4br: null,
        median_bathrooms_4br: null,
        median_sqft_4br: null,
        median_zestimate_5br: null,
        median_last_sold_price_5br: null,
        median_market_rent_5br: null,
        median_bedrooms_5br: null,
        median_bathrooms_5br: null,
        median_sqft_5br: null,
        median_zestimate_6plus_br: null,
        median_last_sold_price_6plus_br: null,
        median_market_rent_6plus_br: null,
        median_bedrooms_6plus_br: null,
        median_bathrooms_6plus_br: null,
        median_sqft_6plus_br: null,
        total_listings_count: 0
      };
    }
    
    console.log(`Processing ${totalListings} listings for zip code ${zipCode}:`);
    Object.keys(groupedListings).forEach(category => {
      const count = groupedListings[category].length;
      if (count > 0) {
        console.log(`  - ${category === '6plus' ? '6+' : category} bedrooms: ${count} listings`);
      }
    });
    
    // Calculate medians for each bedroom category
    const allMedians = {};
    
    ['2', '3', '4', '5', '6plus'].forEach(category => {
      const categoryMedians = calculateMediansForBedroomCategory(groupedListings[category], category);
      Object.assign(allMedians, categoryMedians);
    });
    
    // Add total count
    allMedians.total_listings_count = totalListings;
    
    // Log the results
    console.log(`Bedroom-specific medians calculated for zip code ${zipCode}:`);
    ['2', '3', '4', '5', '6plus'].forEach(category => {
      const suffix = category === '6plus' ? '_6plus_br' : `_${category}br`;
      const count = allMedians[`listings_count${suffix}`];
      if (count > 0) {
        console.log(`  ${category === '6plus' ? '6+' : category} bedrooms (${count} listings):`);
        console.log(`    - Zestimate: $${allMedians[`median_zestimate${suffix}`] ? allMedians[`median_zestimate${suffix}`].toLocaleString() : 'N/A'}`);
        console.log(`    - Last Sold Price: $${allMedians[`median_last_sold_price${suffix}`] ? allMedians[`median_last_sold_price${suffix}`].toLocaleString() : 'N/A'}`);
        console.log(`    - Market Rent: $${allMedians[`median_market_rent${suffix}`] ? allMedians[`median_market_rent${suffix}`].toLocaleString() : 'N/A'}`);
        console.log(`    - Bathrooms: ${allMedians[`median_bathrooms${suffix}`] || 'N/A'}`);
        console.log(`    - Square Feet: ${allMedians[`median_sqft${suffix}`] ? allMedians[`median_sqft${suffix}`].toLocaleString() : 'N/A'}`);
      }
    });
    
    return allMedians;
  } catch (error) {
    console.error(`Error calculating bedroom medians for zip code ${zipCode}:`, error.message);
    throw error;
  }
}

/**
 * Update zip table with calculated bedroom-specific median values
 * @param {string} zipCode - 5-digit ZIP code
 * @param {Object} medians - Object containing median values
 * @returns {Promise<Object>} Updated zip record
 */
async function updateZipBedroomMedians(zipCode, medians) {
  try {
    const supabase = db.getSupabaseClient();
    
    // Prepare update data (exclude count fields)
    const updateData = {
      median_zestimate_2br: medians.median_zestimate_2br,
      median_last_sold_price_2br: medians.median_last_sold_price_2br,
      median_market_rent_2br: medians.median_market_rent_2br,
      median_bedrooms_2br: medians.median_bedrooms_2br,
      median_bathrooms_2br: medians.median_bathrooms_2br,
      median_sqft_2br: medians.median_sqft_2br,
      median_zestimate_3br: medians.median_zestimate_3br,
      median_last_sold_price_3br: medians.median_last_sold_price_3br,
      median_market_rent_3br: medians.median_market_rent_3br,
      median_bedrooms_3br: medians.median_bedrooms_3br,
      median_bathrooms_3br: medians.median_bathrooms_3br,
      median_sqft_3br: medians.median_sqft_3br,
      median_zestimate_4br: medians.median_zestimate_4br,
      median_last_sold_price_4br: medians.median_last_sold_price_4br,
      median_market_rent_4br: medians.median_market_rent_4br,
      median_bedrooms_4br: medians.median_bedrooms_4br,
      median_bathrooms_4br: medians.median_bathrooms_4br,
      median_sqft_4br: medians.median_sqft_4br,
      median_zestimate_5br: medians.median_zestimate_5br,
      median_last_sold_price_5br: medians.median_last_sold_price_5br,
      median_market_rent_5br: medians.median_market_rent_5br,
      median_bedrooms_5br: medians.median_bedrooms_5br,
      median_bathrooms_5br: medians.median_bathrooms_5br,
      median_sqft_5br: medians.median_sqft_5br,
      median_zestimate_6plus_br: medians.median_zestimate_6plus_br,
      median_last_sold_price_6plus_br: medians.median_last_sold_price_6plus_br,
      median_market_rent_6plus_br: medians.median_market_rent_6plus_br,
      median_bedrooms_6plus_br: medians.median_bedrooms_6plus_br,
      median_bathrooms_6plus_br: medians.median_bathrooms_6plus_br,
      median_sqft_6plus_br: medians.median_sqft_6plus_br,
      medians_updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('zip')
      .update(updateData)
      .eq('zip5', zipCode)
      .select();
    
    if (error) {
      throw new Error(`Error updating zip bedroom medians for ${zipCode}: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error(`No zip record found for zip code ${zipCode}`);
    }
    
    console.log(`Successfully updated bedroom-specific medians for zip code ${zipCode}`);
    return data[0];
  } catch (error) {
    console.error(`Error updating zip bedroom medians for ${zipCode}:`, error.message);
    throw error;
  }
}

/**
 * Process bedroom-specific median calculations for a single zip code
 * @param {string} zipCode - 5-digit ZIP code
 * @returns {Promise<Object>} Processing result
 */
async function processZipCodeBedroomMedians(zipCode) {
  try {
    // Calculate bedroom-specific medians
    const medians = await calculateBedroomMediansForZipCode(zipCode);
    
    // Update zip table
    await updateZipBedroomMedians(zipCode, medians);
    
    return {
      zipCode,
      success: true,
      totalListingsCount: medians.total_listings_count,
      bedroomBreakdown: {
        '2br': medians.listings_count_2br || 0,
        '3br': medians.listings_count_3br || 0,
        '4br': medians.listings_count_4br || 0,
        '5br': medians.listings_count_5br || 0,
        '6plus_br': medians.listings_count_6plus_br || 0
      },
      medians: {
        '2br': {
          zestimate: medians.median_zestimate_2br,
          lastSoldPrice: medians.median_last_sold_price_2br,
          marketRent: medians.median_market_rent_2br,
          bathrooms: medians.median_bathrooms_2br,
          sqft: medians.median_sqft_2br
        },
        '3br': {
          zestimate: medians.median_zestimate_3br,
          lastSoldPrice: medians.median_last_sold_price_3br,
          marketRent: medians.median_market_rent_3br,
          bathrooms: medians.median_bathrooms_3br,
          sqft: medians.median_sqft_3br
        },
        '4br': {
          zestimate: medians.median_zestimate_4br,
          lastSoldPrice: medians.median_last_sold_price_4br,
          marketRent: medians.median_market_rent_4br,
          bathrooms: medians.median_bathrooms_4br,
          sqft: medians.median_sqft_4br
        },
        '5br': {
          zestimate: medians.median_zestimate_5br,
          lastSoldPrice: medians.median_last_sold_price_5br,
          marketRent: medians.median_market_rent_5br,
          bathrooms: medians.median_bathrooms_5br,
          sqft: medians.median_sqft_5br
        },
        '6plus_br': {
          zestimate: medians.median_zestimate_6plus_br,
          lastSoldPrice: medians.median_last_sold_price_6plus_br,
          marketRent: medians.median_market_rent_6plus_br,
          bathrooms: medians.median_bathrooms_6plus_br,
          sqft: medians.median_sqft_6plus_br
        }
      }
    };
  } catch (error) {
    console.error(`Failed to process bedroom medians for zip code ${zipCode}:`, error.message);
    return {
      zipCode,
      success: false,
      error: error.message,
      totalListingsCount: 0,
      bedroomBreakdown: null,
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
    .not('zip5', 'is', null)
    .not('bedrooms', 'is', null);
  
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
  getBedroomCategory,
  getZillowListingDataByBedroomsForZip,
  calculateMediansForBedroomCategory,
  calculateBedroomMediansForZipCode,
  updateZipBedroomMedians,
  processZipCodeBedroomMedians,
  getZipCodesWithZillowData,
  getAllZipCodes
};
