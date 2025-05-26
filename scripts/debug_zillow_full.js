/**
 * Full Zillow Debug Script
 * Outputs complete results object to terminal for analysis
 */

// Load environment variables
require('dotenv').config();

// Import modules
const { zillow } = require('../api');

async function debugZillowFull() {
  try {
    console.log('=== FULL ZILLOW DEBUG SESSION ===\n');
    
    const testZipCode = '10005'; // Manhattan, NY
    console.log(`Testing with zip code: ${testZipCode}`);
    console.log('This will output the complete results object...\n');
    
    // Search for listings
    const results = await zillow.searchListingsByZipCode(testZipCode, {
      maxItems: 5 // Small number for debugging
    });
    
    console.log('\n=== COMPLETE RESULTS OBJECT ===');
    console.log(JSON.stringify(results, null, 2));
    
    console.log('\n=== RESULTS SUMMARY ===');
    console.log(`Zip Code: ${results.zipCode}`);
    console.log(`Run ID: ${results.runId}`);
    console.log(`Total Items: ${results.totalItems}`);
    console.log(`Valid Listings: ${results.validListings}`);
    console.log(`Listings Array Length: ${results.listings ? results.listings.length : 0}`);
    
    if (results.listings && results.listings.length > 0) {
      console.log('\n=== FIRST PROCESSED LISTING ===');
      console.log(JSON.stringify(results.listings[0], null, 2));
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('\n=== ERROR OCCURRED ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// Run the debug
debugZillowFull();
