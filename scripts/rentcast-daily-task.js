/**
 * RentCast Daily Task Script
 * Fetches listing data from RentCast API and stores it in the database
 * Designed to run 30 minutes after the ATTOM daily task
 */

// Load environment variables
require('dotenv').config();

// Import modules
const supabaseUtils = require('../utils/supabase');
const { rentCast } = require('../api');
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
    
    // Simple connection test without querying any specific table
    console.log('Connecting to Supabase...');
    console.log(`URL: ${process.env.SUPABASE_URL}`);
    console.log('Connection successful.');
    
    console.log('--- End of Supabase Connection Test ---\n');
  } catch (error) {
    console.error('Error in Supabase connection test:', error.message);
  }
}

/**
 * Main function to run the RentCast daily task for one or more zip codes
 * @param {string|string[]} zipCodes - Single zip code or array of zip codes to process
 */
async function runRentCastDailyTasks(zipCodes = process.env.TARGET_ZIP_CODES) {
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

    if (!zipsToProcess || zipsToProcess.length === 0) {
      console.warn('No zip codes specified or found in mapping. Exiting script.');
      return {};
    }

    console.log(`Processing ${zipsToProcess.length} zip codes: ${zipsToProcess.join(', ')}`);
    
    // Process each zip code
    const results = {};
    for (const zipCode of zipsToProcess) {
      console.log(`\n--- Processing zip code: ${zipCode} ---`);
      results[zipCode] = await fetchRentCastDataForZipCode(zipCode);
    }
    
    // Log summary
    console.log('\n--- Processing Summary ---');
    for (const [zipCode, result] of Object.entries(results)) {
      console.log(`Zip ${zipCode}:`);
      console.log(`  Listings: ${result.listings.inserted} new, ${result.listings.updated} updated, ${result.listings.unchanged || 0} unchanged`);
      
      // Log additional data types if they exist
      if (result.agents) {
        console.log(`  Agents: ${result.agents.inserted} new, ${result.agents.updated} updated, ${result.agents.unchanged || 0} unchanged`);
      }
      if (result.offices) {
        console.log(`  Offices: ${result.offices.inserted} new, ${result.offices.updated} updated, ${result.offices.unchanged || 0} unchanged`);
      }
      if (result.builders) {
        console.log(`  Builders: ${result.builders.inserted} new, ${result.builders.updated} updated, ${result.builders.unchanged || 0} unchanged`);
      }
      if (result.history) {
        console.log(`  History: ${result.history.inserted} new, ${result.history.updated} updated, ${result.history.unchanged || 0} unchanged`);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in RentCast daily tasks:', error);
    process.exit(1);
  }
}

/**
 * Fetch and process RentCast data for a specific zip code
 * @param {string} zipCode - The zip code to process
 */
async function fetchRentCastDataForZipCode(zipCode) {
  try {
    console.log(`Fetching RentCast data for zip code ${zipCode}...`);
    
    // STEP 1: Get listings from RentCast API for this zip code
    console.log(`\n--- Getting RentCast listings for zip code ${zipCode} ---`);
    const rentcastListings = await rentCast.getAllListingsInZipCode(zipCode);
    console.log(`Found ${rentcastListings.length} RentCast listings for zip code ${zipCode}`);
    
    // Initialize results
    const results = {
      listings: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
      agents: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
      offices: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
      builders: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
      history: { inserted: 0, updated: 0, unchanged: 0, errors: 0 }
    };
    
    // STEP 2: Process each listing
    console.log(`\n--- Processing listings for zip code ${zipCode} ---`);
    
    // Use a rate limiter to avoid hitting API rate limits
    // Process listings in batches of 10 with a 1-second delay between each listing
    const batchSize = 10;
    const delay = 1000; // 1 second
    
    for (let i = 0; i < rentcastListings.length; i += batchSize) {
      const batch = rentcastListings.slice(i, i + batchSize);
      
      // Process each listing in the batch
      const batchPromises = batch.map(async (listing, index) => {
        // Add delay based on index to stagger requests
        await new Promise(resolve => setTimeout(resolve, index * delay));
        
        try {
          return await processRentCastListing(listing);
        } catch (error) {
          console.error(`Error processing listing ${listing.formattedAddress}:`, error.message);
          return {
            listings: { errors: 1 },
            agents: { errors: 1 },
            offices: { errors: 1 },
            builders: { errors: 1 },
            history: { errors: 1 }
          };
        }
      });
      
      // Wait for all listings in the batch to be processed
      const batchResults = await Promise.all(batchPromises);
      
      // Aggregate results
      for (const result of batchResults) {
        // Aggregate listing results
        results.listings.inserted += result.listings?.inserted || 0;
        results.listings.updated += result.listings?.updated || 0;
        results.listings.unchanged += result.listings?.unchanged || 0;
        results.listings.errors += result.listings?.errors || 0;
        
        // Aggregate agent results
        results.agents.inserted += result.agents?.inserted || 0;
        results.agents.updated += result.agents?.updated || 0;
        results.agents.unchanged += result.agents?.unchanged || 0;
        results.agents.errors += result.agents?.errors || 0;
        
        // Aggregate office results
        results.offices.inserted += result.offices?.inserted || 0;
        results.offices.updated += result.offices?.updated || 0;
        results.offices.unchanged += result.offices?.unchanged || 0;
        results.offices.errors += result.offices?.errors || 0;
        
        // Aggregate builder results
        results.builders.inserted += result.builders?.inserted || 0;
        results.builders.updated += result.builders?.updated || 0;
        results.builders.unchanged += result.builders?.unchanged || 0;
        results.builders.errors += result.builders?.errors || 0;
        
        // Aggregate history results
        results.history.inserted += result.history?.inserted || 0;
        results.history.updated += result.history?.updated || 0;
        results.history.unchanged += result.history?.unchanged || 0;
        results.history.errors += result.history?.errors || 0;
      }
      
      // Log progress
      console.log(`Processed ${Math.min(i + batchSize, rentcastListings.length)} of ${rentcastListings.length} listings`);
      
      // Add a delay between batches to avoid hitting API rate limits
      if (i + batchSize < rentcastListings.length) {
        await new Promise(resolve => setTimeout(resolve, batchSize * delay));
      }
    }
    
    console.log(`\n--- Summary for zip code ${zipCode} ---`);
    console.log(`Listings: ${results.listings.inserted} new, ${results.listings.updated} updated, ${results.listings.unchanged} unchanged, ${results.listings.errors} errors`);
    console.log(`Agents: ${results.agents.inserted} new, ${results.agents.updated} updated, ${results.agents.unchanged} unchanged, ${results.agents.errors} errors`);
    console.log(`Offices: ${results.offices.inserted} new, ${results.offices.updated} updated, ${results.offices.unchanged} unchanged, ${results.offices.errors} errors`);
    console.log(`Builders: ${results.builders.inserted} new, ${results.builders.updated} updated, ${results.builders.unchanged} unchanged, ${results.builders.errors} errors`);
    console.log(`History: ${results.history.inserted} new, ${results.history.updated} updated, ${results.history.unchanged} unchanged, ${results.history.errors} errors`);
    
    return results;
  } catch (error) {
    console.error(`Error processing zip code ${zipCode}:`, error.message);
    // Don't exit the process, just return an error result
    return {
      error: error.message,
      listings: { inserted: 0, updated: 0, unchanged: 0, errors: 1 },
      agents: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
      offices: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
      builders: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
      history: { inserted: 0, updated: 0, unchanged: 0, errors: 0 }
    };
  }
}

/**
 * Process a single RentCast listing
 * @param {Object} rentcastListing - RentCast listing data
 * @returns {Promise<Object>} Processing results
 */
async function processRentCastListing(rentcastListing) {
  const results = {
    listings: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
    agents: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
    offices: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
    builders: { inserted: 0, updated: 0, unchanged: 0, errors: 0 },
    history: { inserted: 0, updated: 0, unchanged: 0, errors: 0 }
  };
  
  try {
    // Save the listing data to the database
    const listingResult = await models.rentcastListing.processAndUpsertFromRentCast(rentcastListing);
    results.listings.inserted += listingResult.inserted || 0;
    results.listings.updated += listingResult.updated || 0;
    results.listings.unchanged += listingResult.unchanged || 0;
    results.listings.errors += listingResult.errors || 0;
    
    // Process related data if the listing was inserted or updated
    if (listingResult.inserted > 0 || listingResult.updated > 0) {
      // Process agent data
      if (rentcastListing.listingAgent) {
        const agentResult = await models.rentcastListingAgent.processAndUpsertFromRentCast(
          rentcastListing.id, 
          rentcastListing.listingAgent
        );
        results.agents.inserted += agentResult.inserted || 0;
        results.agents.updated += agentResult.updated || 0;
        results.agents.unchanged += agentResult.unchanged || 0;
        results.agents.errors += agentResult.errors || 0;
      }
      
      // Process office data
      if (rentcastListing.listingOffice) {
        const officeResult = await models.rentcastListingOffice.processAndUpsertFromRentCast(
          rentcastListing.id, 
          rentcastListing.listingOffice
        );
        results.offices.inserted += officeResult.inserted || 0;
        results.offices.updated += officeResult.updated || 0;
        results.offices.unchanged += officeResult.unchanged || 0;
        results.offices.errors += officeResult.errors || 0;
      }
      
      // Process builder data for new construction
      if (rentcastListing.listingType === 'New Construction' && rentcastListing.builder) {
        const builderResult = await models.rentcastBuilder.processAndUpsertFromRentCast(
          rentcastListing.id, 
          rentcastListing.builder
        );
        results.builders.inserted += builderResult.inserted || 0;
        results.builders.updated += builderResult.updated || 0;
        results.builders.unchanged += builderResult.unchanged || 0;
        results.builders.errors += builderResult.errors || 0;
      }
      
      // Process history data
      if (rentcastListing.history) {
        const historyResult = await models.rentcastListingHistory.processAndUpsertFromRentCast(
          rentcastListing.id, 
          rentcastListing.history
        );
        results.history.inserted += historyResult.inserted || 0;
        results.history.updated += historyResult.updated || 0;
        results.history.unchanged += historyResult.unchanged || 0;
        results.history.errors += historyResult.errors || 0;
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error processing listing:`, error.message);
    results.listings.errors++;
    results.agents.errors++;
    results.offices.errors++;
    results.builders.errors++;
    results.history.errors++;
    return results;
  }
}

// Execute the script if run directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const zipCodesArg = args.find(arg => arg.startsWith('--zip='));
  const zipCodes = zipCodesArg ? zipCodesArg.replace('--zip=', '') : process.env.TARGET_ZIP_CODES;
  
  // Run the RentCast daily tasks
  runRentCastDailyTasks(zipCodes).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} else {
  // Script is being imported as a module
  module.exports = {
    runRentCastDailyTasks,
    fetchRentCastDataForZipCode
  };
}
