/**
 * Zillow Example Script
 * Test script to verify Zillow integration is working
 */

// Load environment variables
require('dotenv').config();

// Import modules
const { zillow } = require('../api');
const models = require('../models');

/**
 * Test Zillow API integration
 */
async function testZillowIntegration() {
  try {
    console.log('--- Testing Zillow Integration ---\n');
    
    // Check if API token is configured
    if (!process.env.APIFY_API_TOKEN) {
      console.error('ERROR: APIFY_API_TOKEN is not configured in .env file');
      console.log('Please add your Apify API token to the .env file:');
      console.log('APIFY_API_TOKEN=your_apify_api_token_here');
      process.exit(1);
    }
    
    console.log('✓ Apify API token is configured');
    
    // Test with a sample zip code (you can change this)
    const testZipCode = '10005'; // Manhattan, NY - should have plenty of listings
    
    console.log(`\nTesting Zillow search for zip code: ${testZipCode}`);
    console.log('This may take 1-2 minutes as the scraper runs...\n');
    
    // Search for listings
    const searchResults = await zillow.searchListingsByZipCode(testZipCode, {
      maxItems: 10 // Limit to 10 for testing
    });
    
    console.log('--- Search Results ---');
    console.log(`Run ID: ${searchResults.runId}`);
    console.log(`Total items found: ${searchResults.totalItems}`);
    console.log(`Valid listings: ${searchResults.validListings}`);
    
    if (searchResults.listings.length > 0) {
      console.log('\n--- Sample Listing ---');
      const sampleListing = searchResults.listings[0];
      console.log(`Zillow ID: ${sampleListing.zillow_id}`);
      console.log(`Address: ${sampleListing.address}`);
      console.log(`Price: $${sampleListing.price ? sampleListing.price.toLocaleString() : 'N/A'}`);
      console.log(`Zestimate: $${sampleListing.zestimate ? sampleListing.zestimate.toLocaleString() : 'N/A'}`);
      console.log(`Market Rent: $${sampleListing.market_rent ? sampleListing.market_rent.toLocaleString() : 'N/A'}`);
      console.log(`Bedrooms: ${sampleListing.bedrooms || 'N/A'}`);
      console.log(`Bathrooms: ${sampleListing.bathrooms || 'N/A'}`);
      console.log(`Sqft: ${sampleListing.sqft ? sampleListing.sqft.toLocaleString() : 'N/A'}`);
      console.log(`Property Type: ${sampleListing.property_type || 'N/A'}`);
      console.log(`Status: ${sampleListing.listing_status || 'N/A'}`);
      console.log(`Days on Zillow: ${sampleListing.days_on_zillow || 'N/A'}`);
      console.log(`Broker: ${sampleListing.broker_name || 'N/A'}`);
      console.log(`URL: ${sampleListing.zillow_url || 'N/A'}`);
    } else {
      console.log('No valid listings found. This could be due to:');
      console.log('- No active listings in this zip code');
      console.log('- Scraper configuration issues');
      console.log('- Rate limiting or other API issues');
    }
    
    console.log('\n--- Integration Test Complete ---');
    console.log('✓ Zillow API integration is working!');
    console.log('\nNext steps:');
    console.log('1. Run the database creation script: scripts/create_zillow_tables.sql');
    console.log('2. Test the full daily task: npm run zillow-daily-task --zip=10005');
    console.log('3. Add your target zip codes to the configuration');
    
  } catch (error) {
    console.error('\n--- Integration Test Failed ---');
    console.error('Error:', error.message);
    
    if (error.message.includes('API token')) {
      console.log('\nTroubleshooting:');
      console.log('1. Make sure you have a valid Apify API token');
      console.log('2. Check that the token is correctly set in your .env file');
      console.log('3. Verify the token has access to the Zillow scraper actor');
    } else if (error.message.includes('actor')) {
      console.log('\nTroubleshooting:');
      console.log('1. The Zillow scraper actor might be temporarily unavailable');
      console.log('2. Check the Apify platform status');
      console.log('3. Verify the actor ID is correct: maxcopell/zillow-scraper');
    } else {
      console.log('\nTroubleshooting:');
      console.log('1. Check your internet connection');
      console.log('2. Verify all dependencies are installed: npm install');
      console.log('3. Check the error details above for more information');
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testZillowIntegration();
}

module.exports = {
  testZillowIntegration
};
