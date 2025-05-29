/**
 * Final Median Calculations Script
 * Calculates median values for Zillow listing data by zip code and updates the zip table
 * This script runs as the final step in the daily workflow
 */

// Load environment variables
require('dotenv').config();

// Import modules
const { db } = require('../index');
const zipMedians = require('../models/zip-medians');

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
    
    console.log('Attempting to connect to Supabase...');
    
    const supabase = db.getSupabaseClient();
    const { data, error } = await supabase.from('zip').select('zip5').limit(1);
    
    if (error) {
      console.log('Error connecting to Supabase:', error.message);
      throw error;
    } else {
      console.log('Successfully connected to Supabase!');
    }
    
    console.log('--- End of Supabase Connection Test ---\n');
  } catch (error) {
    console.error('Error in Supabase connection test:', error.message);
    throw error;
  }
}

/**
 * Main function to calculate medians for all zip codes
 * @param {string|string[]} zipCodes - Single zip code or array of zip codes to process (optional)
 */
async function runMedianCalculations(zipCodes = null) {
  try {
    console.log('\n=== Starting Final Median Calculations ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    // First test the Supabase connection
    await testSupabaseConnection();
    
    // Determine which zip codes to process
    let targetZipCodes;
    
    if (zipCodes) {
      // Parse zip codes from input
      targetZipCodes = Array.isArray(zipCodes) 
        ? zipCodes 
        : zipCodes.split(',').map(zip => zip.trim()).filter(Boolean);
      console.log(`Processing specified zip codes: ${targetZipCodes.join(', ')}`);
    } else {
      // Get all zip codes that have Zillow listing data
      console.log('Getting all zip codes with Zillow listing data...');
      targetZipCodes = await zipMedians.getZipCodesWithZillowData();
      console.log(`Found ${targetZipCodes.length} zip codes with Zillow data: ${targetZipCodes.join(', ')}`);
    }
    
    if (targetZipCodes.length === 0) {
      console.log('No zip codes found to process. Exiting.');
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        results: []
      };
    }
    
    console.log(`\n--- Processing ${targetZipCodes.length} zip codes for median calculations ---`);
    
    // Process each zip code
    const results = [];
    let successful = 0;
    let failed = 0;
    
    for (const zipCode of targetZipCodes) {
      console.log(`\n--- Processing zip code: ${zipCode} ---`);
      
      try {
        const result = await zipMedians.processZipCodeMedians(zipCode);
        results.push(result);
        
        if (result.success) {
          successful++;
          console.log(`✓ Successfully processed zip code ${zipCode} (${result.listingsCount} listings)`);
        } else {
          failed++;
          console.log(`✗ Failed to process zip code ${zipCode}: ${result.error}`);
        }
      } catch (error) {
        failed++;
        const errorResult = {
          zipCode,
          success: false,
          error: error.message,
          listingsCount: 0,
          medians: null
        };
        results.push(errorResult);
        console.log(`✗ Failed to process zip code ${zipCode}: ${error.message}`);
      }
    }
    
    // Log final summary
    console.log('\n=== Final Median Calculations Summary ===');
    console.log(`Total zip codes processed: ${targetZipCodes.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    
    // Log detailed results for successful calculations
    console.log('\n--- Detailed Results ---');
    for (const result of results) {
      if (result.success) {
        console.log(`Zip ${result.zipCode} (${result.listingsCount} listings):`);
        if (result.medians.zestimate) {
          console.log(`  Median Zestimate: $${result.medians.zestimate.toLocaleString()}`);
        }
        if (result.medians.lastSoldPrice) {
          console.log(`  Median Last Sold Price: $${result.medians.lastSoldPrice.toLocaleString()}`);
        }
        if (result.medians.marketRent) {
          console.log(`  Median Market Rent: $${result.medians.marketRent.toLocaleString()}`);
        }
        if (result.medians.bedrooms) {
          console.log(`  Median Bedrooms: ${result.medians.bedrooms}`);
        }
        if (result.medians.bathrooms) {
          console.log(`  Median Bathrooms: ${result.medians.bathrooms}`);
        }
        if (result.medians.sqft) {
          console.log(`  Median Square Feet: ${result.medians.sqft.toLocaleString()}`);
        }
      } else {
        console.log(`Zip ${result.zipCode}: ERROR - ${result.error}`);
      }
    }
    
    return {
      processed: targetZipCodes.length,
      successful,
      failed,
      results
    };
  } catch (error) {
    console.error('Error in median calculations:', error);
    throw error;
  }
}

/**
 * Get median calculation statistics
 * @param {string|string[]} zipCodes - Single zip code or array of zip codes to analyze (optional)
 */
async function getMedianStats(zipCodes = null) {
  try {
    console.log('\n--- Getting Median Statistics ---');
    
    // Determine which zip codes to analyze
    let targetZipCodes;
    
    if (zipCodes) {
      targetZipCodes = Array.isArray(zipCodes) 
        ? zipCodes 
        : zipCodes.split(',').map(zip => zip.trim()).filter(Boolean);
    } else {
      targetZipCodes = await zipMedians.getAllZipCodes();
    }
    
    console.log(`Analyzing ${targetZipCodes.length} zip codes...`);
    
    const supabase = db.getSupabaseClient();
    
    for (const zipCode of targetZipCodes) {
      const { data, error } = await supabase
        .from('zip')
        .select('zip5, median_zestimate, median_last_sold_price, median_market_rent, median_bedrooms, median_bathrooms, median_sqft, medians_updated_at')
        .eq('zip5', zipCode)
        .single();
      
      if (error) {
        console.log(`Error fetching data for zip ${zipCode}: ${error.message}`);
        continue;
      }
      
      console.log(`\nZip Code ${zipCode}:`);
      console.log(`  Median Zestimate: $${data.median_zestimate ? data.median_zestimate.toLocaleString() : 'N/A'}`);
      console.log(`  Median Last Sold Price: $${data.median_last_sold_price ? data.median_last_sold_price.toLocaleString() : 'N/A'}`);
      console.log(`  Median Market Rent: $${data.median_market_rent ? data.median_market_rent.toLocaleString() : 'N/A'}`);
      console.log(`  Median Bedrooms: ${data.median_bedrooms || 'N/A'}`);
      console.log(`  Median Bathrooms: ${data.median_bathrooms || 'N/A'}`);
      console.log(`  Median Square Feet: ${data.median_sqft ? data.median_sqft.toLocaleString() : 'N/A'}`);
      console.log(`  Last Updated: ${data.medians_updated_at ? new Date(data.medians_updated_at).toLocaleString() : 'Never'}`);
    }
    
    return targetZipCodes.length;
  } catch (error) {
    console.error('Error getting median statistics:', error.message);
    return 0;
  }
}

// Execute the script if run directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const zipCodesArg = args.find(arg => arg.startsWith('--zip='));
  const statsArg = args.find(arg => arg === '--stats');
  const zipCodes = zipCodesArg ? zipCodesArg.replace('--zip=', '') : null;
  
  if (statsArg) {
    // Show median statistics
    console.log('Getting median statistics...');
    getMedianStats(zipCodes)
      .then((count) => {
        console.log(`\nStatistics complete for ${count} zip codes!`);
        process.exit(0);
      })
      .catch(error => {
        console.error('Error getting statistics:', error);
        process.exit(1);
      });
  } else {
    // Run the median calculations
    runMedianCalculations(zipCodes)
      .then((summary) => {
        console.log('\nMedian calculations completed successfully!');
        if (summary.failed > 0) {
          console.log(`Warning: ${summary.failed} zip codes failed to process.`);
          process.exit(1);
        } else {
          process.exit(0);
        }
      })
      .catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
      });
  }
} else {
  // Script is being imported as a module
  module.exports = {
    runMedianCalculations,
    getMedianStats
  };
}
