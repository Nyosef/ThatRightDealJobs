/**
 * Daily task script that fetches property data from ATTOM API
 * and stores the results in Supabase
 */

// Load environment variables
require('dotenv').config();

// Import modules
const { db } = require('../index');
const { attom } = require('../api');
const models = require('../models');
const { formatDate, getDateMonthsAgo } = require('../utils/date');
const { getZipGeoIdMapping } = require('../utils/config');

// Configuration for zip codes and their geoIdV4 values
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
        console.log('Creating _test_connection table for testing purposes...');
        
        // Create the test table
        const { error: createError } = await supabase.rpc('create_test_connection_table');
        
        if (createError) {
          console.log('Could not create test table using RPC. Attempting direct SQL...');
          // If RPC doesn't exist, try to create the table directly
          const { error: sqlError } = await supabase.from('_test_connection').insert([
            { test_id: 1, message: 'Test connection successful', created_at: new Date().toISOString() }
          ]);
          
          if (sqlError && sqlError.code === '42P01') {
            console.log('Could not create table. You may need to create it manually in the Supabase dashboard.');
            console.log('SQL to create table: CREATE TABLE _test_connection (test_id SERIAL PRIMARY KEY, message TEXT, created_at TIMESTAMPTZ);');
          } else if (sqlError) {
            console.log('Error creating test data:', sqlError.message);
          } else {
            console.log('Test table created successfully!');
          }
        } else {
          console.log('Test table created successfully using RPC!');
        }
        
        // Try to fetch again
        const { data: newData, error: newError } = await supabase.from('_test_connection').select('*');
        
        if (newError) {
          console.log('Still could not fetch data after table creation:', newError.message);
        } else {
          console.log('Successfully fetched data from newly created _test_connection table:');
          console.log(JSON.stringify(newData, null, 2));
        }
      } else {
        console.log('Error fetching from _test_connection:', error.message);
      }
    } else {
      console.log('Successfully fetched data from _test_connection table:');
      console.log(JSON.stringify(data, null, 2));
    }
    
    console.log('--- End of Supabase Connection Test ---\n');
  } catch (error) {
    console.error('Error in Supabase connection test:', error.message);
  }
}

/**
 * Main function to run the daily task for one or more zip codes
 * @param {string|string[]} zipCodes - Single zip code or array of zip codes to process
 */
async function runDailyTasks(zipCodes = process.env.TARGET_ZIP_CODES) {
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
    
    console.log(`Processing ${zipsToProcess.length} zip codes: ${zipsToProcess.join(', ')}`);
    
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
    
    // STEP 2: Process each zip code for properties and sales
    const results = {};
    for (const zipCode of Object.keys(filteredZips)) {
      console.log(`\n--- Processing zip code: ${zipCode} ---`);
      results[zipCode] = await fetchDataForZipCode(zipCode);
    }
    
    // Log summary
    console.log('\n--- Processing Summary ---');
    for (const [zipCode, result] of Object.entries(results)) {
      console.log(`Zip ${zipCode}:`);
      console.log(`  Properties: ${result.properties.inserted} new, ${result.properties.updated} updated, ${result.properties.unchanged || 0} unchanged`);
      console.log(`  Sales: ${result.sales.inserted} new, ${result.sales.updated} updated, ${result.sales.unchanged || 0} unchanged`);
    }
    
    return results;
  } catch (error) {
    console.error('Error in daily tasks:', error);
    process.exit(1);
  }
}

/**
 * Fetch and process data for a specific zip code
 * @param {string} zipCode - The zip code to process
 */
async function fetchDataForZipCode(zipCode) {
  try {
    console.log(`Fetching data for zip code ${zipCode}...`);
    
    const geoIdV4 = ZIP_GEOID_MAPPING[zipCode];
    
    // STEP 1: Ensure the zip code exists in the database
    console.log(`\n--- Ensuring zip code ${zipCode} exists in the database ---`);
    await models.zip.ensureZipExists(zipCode, geoIdV4);
    
    // Calculate the date range (one month back from today)
    const endDate = new Date();
    const startDate = getDateMonthsAgo(endDate, 1);
    
    // Format dates for the API call
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    console.log(`Fetching sales data for zip ${zipCode} from ${formattedStartDate} to ${formattedEndDate}`);
    
    // Fetch data from ATTOM API for this specific zip code
    const data = await attom.getSaleSnapshot(geoIdV4, formattedStartDate, formattedEndDate);
    
    // Store raw API response
    await models.apiData.storeRawApiData(data, 'attom', zipCode);
    
    // STEP 2: Process and store/update property data
    console.log(`\n--- Processing properties for zip code ${zipCode} ---`);
    const propertyResult = await models.property.processAndUpsertFromAttom(data, zipCode);
    
    // STEP 3: Process and store/update sale data
    console.log(`\n--- Processing sales for zip code ${zipCode} ---`);
    const saleResult = await models.sale.processAndUpsertFromAttom(data, zipCode);
    
    console.log(`\n--- Summary for zip code ${zipCode} ---`);
    console.log(`Properties: ${propertyResult.inserted} new, ${propertyResult.updated} updated, ${propertyResult.unchanged || 0} unchanged, ${propertyResult.skipped || 0} skipped, ${propertyResult.errors} errors`);
    console.log(`Sales: ${saleResult.inserted} new, ${saleResult.updated} updated, ${saleResult.unchanged || 0} unchanged, ${saleResult.skipped || 0} skipped, ${saleResult.errors} errors`);
    
    return {
      sales: saleResult,
      properties: propertyResult
    };
  } catch (error) {
    console.error(`Error processing zip code ${zipCode}:`, error.message);
    // Don't exit the process, just return an error result
    return {
      error: error.message,
      sales: { inserted: 0, updated: 0, errors: 0 },
      properties: { inserted: 0, updated: 0, errors: 0 }
    };
  }
}

// Execute the script if run directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const zipCodesArg = args.find(arg => arg.startsWith('--zip='));
  const zipCodes = zipCodesArg ? zipCodesArg.replace('--zip=', '') : process.env.TARGET_ZIP_CODES;
  
  // Run the daily tasks
  runDailyTasks(zipCodes).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} else {
  // Script is being imported as a module
  module.exports = {
    runDailyTasks,
    fetchDataForZipCode
  };
}
