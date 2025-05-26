/**
 * Debug Zillow Response
 * Check what data we're actually getting from the scraper
 */

// Load environment variables
require('dotenv').config();

// Import modules
const { zillow } = require('../api');

async function debugZillowResponse() {
  try {
    console.log('--- Debugging Zillow Response ---\n');
    
    // Search for listings using zipcode 16146
    const results = await zillow.searchListingsByZipCode('16146');
    
    console.log('=== SEARCH RESULTS SUMMARY ===');
    console.log(`Run ID: ${results.runId}`);
    console.log(`Total items: ${results.totalItems}`);
    console.log(`Valid listings: ${results.validListings}`);
    console.log(`Listings array length: ${results.listings ? results.listings.length : 0}`);
    
    if (results.listings && results.listings.length > 0) {
      console.log('\n=== FIRST LISTING DATA ===');
      console.log(JSON.stringify(results.listings[0], null, 2));
    } else {
      console.log('\n=== NO LISTINGS FOUND ===');
      console.log('This could mean:');
      console.log('1. The scraper returned data but transformation failed');
      console.log('2. No listings exist for this zip code');
      console.log('3. The data structure has changed');
    }
    
    // Let's also check the raw items from the scraper
    console.log('\n=== CHECKING RAW SCRAPER DATA ===');
    const client = new (require('../api/zillow/client'))();
    const rawResults = await client.searchByZipCode('16146');
    
    console.log(`Raw items count: ${rawResults.items ? rawResults.items.length : 0}`);
    
    if (rawResults.items && rawResults.items.length > 0) {
      console.log('\n=== FIRST RAW ITEM ===');
      console.log(JSON.stringify(rawResults.items[0], null, 2));
    }
    
  } catch (error) {
    console.error('Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugZillowResponse();
