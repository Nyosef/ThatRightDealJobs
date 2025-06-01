/**
 * Bedroom-Specific Median Calculations Script
 * Calculates median values for Zillow listing data grouped by bedroom count
 */

const zipMediansByBedrooms = require('../models/zip-medians-by-bedrooms');

/**
 * Process bedroom-specific median calculations for all zip codes
 * @returns {Promise<Object>} Processing results summary
 */
async function processAllZipCodeBedroomMedians() {
  console.log('Starting bedroom-specific median calculations for all zip codes...');
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
    zipCodeResults: []
  };
  
  try {
    // Get all zip codes that have Zillow listing data with bedroom information
    console.log('Fetching zip codes with Zillow listing data...');
    const zipCodes = await zipMediansByBedrooms.getZipCodesWithZillowData();
    
    console.log(`Found ${zipCodes.length} zip codes with Zillow listing data`);
    console.log('Zip codes to process:', zipCodes.join(', '));
    console.log('='.repeat(80));
    
    // Process each zip code
    for (const zipCode of zipCodes) {
      console.log(`\nProcessing zip code ${zipCode} (${results.processed + 1}/${zipCodes.length})...`);
      
      try {
        const result = await zipMediansByBedrooms.processZipCodeBedroomMedians(zipCode);
        
        if (result.success) {
          results.successful++;
          console.log(`✅ Successfully processed zip code ${zipCode}`);
          console.log(`   Total listings: ${result.totalListingsCount}`);
          console.log(`   Bedroom breakdown:`, result.bedroomBreakdown);
        } else {
          results.failed++;
          results.errors.push({
            zipCode,
            error: result.error
          });
          console.log(`❌ Failed to process zip code ${zipCode}: ${result.error}`);
        }
        
        results.zipCodeResults.push(result);
        results.processed++;
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          zipCode,
          error: error.message
        });
        console.error(`❌ Error processing zip code ${zipCode}:`, error.message);
        results.processed++;
      }
      
      // Add a small delay to avoid overwhelming the database
      if (results.processed < zipCodes.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
  } catch (error) {
    console.error('Fatal error during processing:', error.message);
    throw error;
  }
  
  // Calculate processing time
  const endTime = Date.now();
  const processingTimeMs = endTime - startTime;
  const processingTimeSeconds = (processingTimeMs / 1000).toFixed(2);
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('BEDROOM-SPECIFIC MEDIAN CALCULATIONS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total zip codes processed: ${results.processed}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Processing time: ${processingTimeSeconds} seconds`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors encountered:');
    results.errors.forEach(({ zipCode, error }) => {
      console.log(`  - ${zipCode}: ${error}`);
    });
  }
  
  // Print detailed results for successful zip codes
  if (results.successful > 0) {
    console.log('\nDetailed results for successful zip codes:');
    results.zipCodeResults
      .filter(result => result.success)
      .forEach(result => {
        console.log(`\n${result.zipCode}:`);
        console.log(`  Total listings: ${result.totalListingsCount}`);
        
        Object.keys(result.bedroomBreakdown).forEach(bedroomType => {
          const count = result.bedroomBreakdown[bedroomType];
          if (count > 0) {
            const medianData = result.medians[bedroomType];
            console.log(`  ${bedroomType} (${count} listings):`);
            console.log(`    Zestimate: $${medianData.zestimate ? medianData.zestimate.toLocaleString() : 'N/A'}`);
            console.log(`    Market Rent: $${medianData.marketRent ? medianData.marketRent.toLocaleString() : 'N/A'}`);
            console.log(`    Sqft: ${medianData.sqft ? medianData.sqft.toLocaleString() : 'N/A'}`);
          }
        });
      });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Bedroom-specific median calculations completed!');
  
  return results;
}

/**
 * Process bedroom-specific median calculations for a specific zip code
 * @param {string} zipCode - 5-digit ZIP code
 * @returns {Promise<Object>} Processing result
 */
async function processSingleZipCodeBedroomMedians(zipCode) {
  console.log(`Processing bedroom-specific medians for zip code: ${zipCode}`);
  console.log('='.repeat(60));
  
  try {
    const result = await zipMediansByBedrooms.processZipCodeBedroomMedians(zipCode);
    
    if (result.success) {
      console.log(`✅ Successfully processed zip code ${zipCode}`);
      console.log(`Total listings: ${result.totalListingsCount}`);
      console.log('Bedroom breakdown:', result.bedroomBreakdown);
      
      // Print detailed medians
      Object.keys(result.bedroomBreakdown).forEach(bedroomType => {
        const count = result.bedroomBreakdown[bedroomType];
        if (count > 0) {
          const medianData = result.medians[bedroomType];
          console.log(`\n${bedroomType} (${count} listings):`);
          console.log(`  Zestimate: $${medianData.zestimate ? medianData.zestimate.toLocaleString() : 'N/A'}`);
          console.log(`  Last Sold Price: $${medianData.lastSoldPrice ? medianData.lastSoldPrice.toLocaleString() : 'N/A'}`);
          console.log(`  Market Rent: $${medianData.marketRent ? medianData.marketRent.toLocaleString() : 'N/A'}`);
          console.log(`  Bathrooms: ${medianData.bathrooms || 'N/A'}`);
          console.log(`  Square Feet: ${medianData.sqft ? medianData.sqft.toLocaleString() : 'N/A'}`);
        }
      });
    } else {
      console.log(`❌ Failed to process zip code ${zipCode}: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error processing zip code ${zipCode}:`, error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Check if a specific zip code was provided as command line argument
    const zipCodeArg = process.argv[2];
    
    if (zipCodeArg) {
      // Process single zip code
      await processSingleZipCodeBedroomMedians(zipCodeArg);
    } else {
      // Process all zip codes
      await processAllZipCodeBedroomMedians();
    }
    
    console.log('\nScript completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nScript failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Export functions for use in other scripts
module.exports = {
  processAllZipCodeBedroomMedians,
  processSingleZipCodeBedroomMedians
};

// Run main function if this script is executed directly
if (require.main === module) {
  main();
}
