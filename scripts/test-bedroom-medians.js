/**
 * Test Script for Bedroom-Specific Median Calculations
 * Simple test to verify the new system is working
 */

const zipMediansByBedrooms = require('../models/zip-medians-by-bedrooms');

async function runTest() {
  try {
    console.log('='.repeat(60));
    console.log('TESTING BEDROOM-SPECIFIC MEDIAN CALCULATIONS');
    console.log('='.repeat(60));
    
    // Test 1: Get zip codes with data
    console.log('Test 1: Fetching zip codes with Zillow data...');
    const zipCodes = await zipMediansByBedrooms.getZipCodesWithZillowData();
    console.log(`Found ${zipCodes.length} zip codes:`, zipCodes);
    
    if (zipCodes.length === 0) {
      console.log('No zip codes found. Exiting test.');
      return;
    }
    
    // Test 2: Process one zip code
    const testZip = zipCodes[0];
    console.log(`\nTest 2: Processing zip code ${testZip}...`);
    
    const result = await zipMediansByBedrooms.processZipCodeBedroomMedians(testZip);
    
    if (result.success) {
      console.log('✅ SUCCESS! Bedroom-specific medians calculated successfully');
      console.log(`Total listings processed: ${result.totalListingsCount}`);
      console.log('Bedroom breakdown:', result.bedroomBreakdown);
      
      // Show sample medians
      Object.keys(result.bedroomBreakdown).forEach(bedroomType => {
        const count = result.bedroomBreakdown[bedroomType];
        if (count > 0) {
          const medianData = result.medians[bedroomType];
          console.log(`\n${bedroomType} (${count} listings):`);
          console.log(`  Zestimate: $${medianData.zestimate ? medianData.zestimate.toLocaleString() : 'N/A'}`);
          console.log(`  Market Rent: $${medianData.marketRent ? medianData.marketRent.toLocaleString() : 'N/A'}`);
          console.log(`  Sqft: ${medianData.sqft ? medianData.sqft.toLocaleString() : 'N/A'}`);
        }
      });
      
    } else {
      console.log('❌ FAILED:', result.error);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETED');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

runTest().then(() => {
  console.log('\nTest script finished. You can now run the full calculations.');
  process.exit(0);
}).catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});
