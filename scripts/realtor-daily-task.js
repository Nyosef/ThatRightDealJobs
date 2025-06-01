/**
 * Realtor daily task script that fetches property listings from Realtor.com
 * using the Apify Realtor scraper and stores the results in Supabase
 */

// Load environment variables
require('dotenv').config();

// Import modules
const { db } = require('../index');
const { realtor } = require('../api');
const models = require('../models');
const { getZipGeoIdMapping } = require('../utils/config');

// Configuration for zip codes
const ZIP_GEOID_MAPPING = getZipGeoIdMapping();

/**
 * Test Supabase connection
 */
async function testSupabaseConnection() {
  try {
    console.log('\n--- Testing Supabase Connection ---');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.log('Supabase is not configured. Skipping connection test.');
      return;
    }
    
    console.log('Attempting to fetch data from _test_connection table...');
    
    const supabase = db.getSupabaseClient();
    const { data, error } = await supabase.from('_test_connection').select('*');
    
    if (error) {
      if (error.code === '42P01') {
        console.log('The _test_connection table does not exist. This is expected if you haven\'t created it yet.');
      } else {
        console.log('Error fetching from _test_connection:', error.message);
      }
    } else {
      console.log('Successfully connected to Supabase!');
    }
    
    console.log('--- End of Supabase Connection Test ---\n');
  } catch (error) {
    console.error('Error in Supabase connection test:', error.message);
  }
}

/**
 * Main function to run the Realtor daily task for one or more zip codes
 * @param {string|string[]} zipCodes - Single zip code or array of zip codes to process
 */
async function runRealtorDailyTasks(zipCodes = process.env.TARGET_ZIP_CODES) {
  try {
    // First test the Supabase connection
    await testSupabaseConnection();
    
    // Parse zip codes from input
    const targetZipCodes = Array.isArray(zipCodes) 
      ? zipCodes 
      : (zipCodes || '').split(',').map(zip => zip.trim()).filter(Boolean);
    
    // If no zip codes specified and we have a mapping, use all configured zip codes
    const zipsToProcess = targetZipCodes.length > 0 
      ? targetZipCodes 
      : Object.keys(ZIP_GEOID_MAPPING);
    
    console.log(`Processing ${zipsToProcess.length} zip codes for Realtor listings: ${zipsToProcess.join(', ')}`);
    
    // STEP 1: Pre-process all zip codes to ensure they exist in the database
    console.log('\n--- Pre-processing all zip codes ---');
    const filteredZips = {};
    for (const zipCode of zipsToProcess) {
      if (!ZIP_GEOID_MAPPING[zipCode]) {
        console.warn(`Warning: No geoIdV4 mapping found for zip code ${zipCode}. Skipping.`);
        continue;
      }
      filteredZips[zipCode] = ZIP_GEOID_MAPPING[zipCode];
    }
    
    // Process all zip codes at once
    const zipResult = await models.zip.processZipCodes(filteredZips);
    console.log(`Zip codes processed: ${zipResult.inserted} inserted, ${zipResult.existing} existing, ${zipResult.errors} errors`);
    
    // STEP 2: Process each zip code for Realtor listings
    const results = {};
    for (const zipCode of Object.keys(filteredZips)) {
      console.log(`\n--- Processing Realtor listings for zip code: ${zipCode} ---`);
      results[zipCode] = await fetchRealtorDataForZipCode(zipCode);
    }
    
    // Log summary
    console.log('\n--- Realtor Processing Summary ---');
    for (const [zipCode, result] of Object.entries(results)) {
      if (result.error) {
        console.log(`Zip ${zipCode}: ERROR - ${result.error}`);
      } else {
        console.log(`Zip ${zipCode}:`);
        console.log(`  Listings: ${result.listings.inserted} new, ${result.listings.updated} updated, ${result.listings.unchanged || 0} unchanged`);
        console.log(`  Total processed: ${result.totalProcessed}, Valid: ${result.validListings}`);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in Realtor daily tasks:', error);
    process.exit(1);
  }
}

/**
 * Fetch and process Realtor data for a specific zip code
 * @param {string} zipCode - The zip code to process
 */
async function fetchRealtorDataForZipCode(zipCode) {
  try {
    console.log(`Fetching Realtor listings for zip code ${zipCode}...`);
    
    // STEP 1: Ensure the zip code exists in the database
    const geoIdV4 = ZIP_GEOID_MAPPING[zipCode];
    console.log(`\n--- Ensuring zip code ${zipCode} exists in the database ---`);
    await models.zip.ensureZipExists(zipCode, geoIdV4);
    
    // STEP 2: Search for Realtor listings
    console.log(`\n--- Searching Realtor listings for zip code ${zipCode} ---`);
    const searchResults = await realtor.searchListingsByZipCode(zipCode);
    
    // Store raw API response
    await models.apiData.storeRawApiData({
      runId: searchResults.runId,
      totalItems: searchResults.totalItems,
      validListings: searchResults.validListings,
      listings: searchResults.listings
    }, 'realtor', zipCode);
    
    // STEP 3: Process and store/update listing data
    console.log(`\n--- Processing Realtor listings for zip code ${zipCode} ---`);
    const listingResult = await models.realtorListing.processAndUpsertFromRealtor(searchResults, zipCode);
    
    console.log(`\n--- Summary for zip code ${zipCode} ---`);
    console.log(`Listings: ${listingResult.inserted} new, ${listingResult.updated} updated, ${listingResult.unchanged || 0} unchanged, ${listingResult.skipped || 0} skipped, ${listingResult.errors} errors`);
    console.log(`Total processed: ${searchResults.totalItems}, Valid listings: ${searchResults.validListings}`);
    
    return {
      listings: listingResult,
      totalProcessed: searchResults.totalItems,
      validListings: searchResults.validListings,
      runId: searchResults.runId
    };
  } catch (error) {
    console.error(`Error processing Realtor data for zip code ${zipCode}:`, error.message);
    // Don't exit the process, just return an error result
    return {
      error: error.message,
      listings: { inserted: 0, updated: 0, errors: 0 },
      totalProcessed: 0,
      validListings: 0
    };
  }
}

/**
 * Get Realtor listing statistics for a zip code
 * @param {string} zipCode - Zip code to analyze
 */
async function getRealtorStatsForZipCode(zipCode) {
  try {
    console.log(`\n--- Getting Realtor statistics for zip code ${zipCode} ---`);
    
    const stats = await models.realtorListing.getListingStatsByZipCode(zipCode);
    
    console.log(`Realtor Statistics for ${zipCode}:`);
    console.log(`  Total listings: ${stats.count}`);
    console.log(`  Average list price: $${stats.avgListPrice ? stats.avgListPrice.toLocaleString() : 'N/A'}`);
    console.log(`  Average sold price: $${stats.avgSoldPrice ? stats.avgSoldPrice.toLocaleString() : 'N/A'}`);
    console.log(`  Median sold price: $${stats.medianSoldPrice ? stats.medianSoldPrice.toLocaleString() : 'N/A'}`);
    console.log(`  Average price per sqft: $${stats.avgPricePerSqft || 'N/A'}`);
    console.log(`  Average tax: $${stats.avgTax ? stats.avgTax.toLocaleString() : 'N/A'}`);
    console.log(`  Average flood score: ${stats.avgFloodScore || 'N/A'} (1-10, 1=minimal)`);
    console.log(`  Average fire score: ${stats.avgFireScore || 'N/A'} (1-10, 1=minimal)`);
    console.log(`  Average noise score: ${stats.avgNoiseScore || 'N/A'} (higher=noisier)`);
    
    return stats;
  } catch (error) {
    console.error(`Error getting Realtor stats for zip code ${zipCode}:`, error.message);
    return null;
  }
}

// Execute the script if run directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const zipCodesArg = args.find(arg => arg.startsWith('--zip='));
  const statsArg = args.find(arg => arg === '--stats');
  const zipCodes = zipCodesArg ? zipCodesArg.replace('--zip=', '') : process.env.TARGET_ZIP_CODES;
  
  if (statsArg) {
    // Show statistics for zip codes
    const targetZipCodes = Array.isArray(zipCodes) 
      ? zipCodes 
      : (zipCodes || '').split(',').map(zip => zip.trim()).filter(Boolean);
    
    const zipsToAnalyze = targetZipCodes.length > 0 
      ? targetZipCodes 
      : Object.keys(ZIP_GEOID_MAPPING);
    
    console.log('Getting Realtor statistics...');
    Promise.all(zipsToAnalyze.map(zip => getRealtorStatsForZipCode(zip)))
      .then(() => {
        console.log('\nStatistics complete!');
        process.exit(0);
      })
      .catch(error => {
        console.error('Error getting statistics:', error);
        process.exit(1);
      });
  } else {
    // Run the daily tasks
    runRealtorDailyTasks(zipCodes).catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
  }
} else {
  // Script is being imported as a module
  module.exports = {
    runRealtorDailyTasks,
    fetchRealtorDataForZipCode,
    getRealtorStatsForZipCode
  };
}
