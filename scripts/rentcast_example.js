/**
 * RentCast API Example Script
 * Demonstrates how to use the RentCast API integration
 * 
 * Usage: node scripts/rentcast_example.js
 */

// Load environment variables
require('dotenv').config();

// Import API and models
const { rentCast } = require('../api');
const { 
  rentcastProperty, 
  rentcastAvmValue, 
  rentcastAvmRent,
  propertyLink
} = require('../models');

/**
 * Main function to demonstrate RentCast API usage
 */
async function main() {
  try {
    console.log('RentCast API Example Script');
    console.log('---------------------------');
    
    // Example 1: Search by address
    console.log('\n--- Example 1: Search by Address ---');
    const address = '123 Main St, San Francisco, CA 94105';
    console.log(`Searching for property: ${address}`);
    
    const addressSearchResult = await rentCast.getPropertyByAddress(address);
    console.log(`Found ${addressSearchResult.properties?.length || 0} properties by address`);
    
    // Example 2: Search by zip code
    console.log('\n--- Example 2: Search by Zip Code ---');
    const zipCode = '94105';
    console.log(`Searching for properties in zip code: ${zipCode}`);
    
    try {
      const zipSearchResult = await rentCast.getPropertiesByZipCode(zipCode, 5);
      console.log(`Found ${zipSearchResult.properties?.length || 0} properties in zip code ${zipCode} (limited to 5)`);
      
      // Example 3: Get all properties in a zip code
      console.log('\n--- Example 3: Get All Properties in Zip Code ---');
      console.log(`Getting all properties in zip code: ${zipCode}`);
      
      // For this example, we'll limit to just a few properties to avoid a long-running example
      const allProperties = await rentCast.getAllPropertiesInZipCode(zipCode, 5);
      console.log(`Found ${allProperties.length} total properties in zip code ${zipCode}`);
    } catch (error) {
      console.error(`Error searching by zip code: ${error.message}`);
      console.log('Continuing with address search results only...');
    }
    
    // Choose a property to work with for the rest of the example
    if (!addressSearchResult.properties || addressSearchResult.properties.length === 0) {
      if (!zipSearchResult.properties || zipSearchResult.properties.length === 0) {
        console.log('No properties found. Exiting.');
        return;
      }
      console.log('\nUsing a property from the zip code search results:');
      var property = zipSearchResult.properties[0];
    } else {
      console.log('\nUsing a property from the address search results:');
      var property = addressSearchResult.properties[0];
    }
    console.log(`\nSelected property: ${property.formattedAddress}`);
    console.log(`RentCast ID: ${property.id}`);
    console.log(`Property Type: ${property.propertyType}`);
    console.log(`Bedrooms: ${property.bedrooms}`);
    console.log(`Bathrooms: ${property.bathrooms}`);
    console.log(`Square Footage: ${property.squareFootage}`);
    console.log(`Latitude: ${property.latitude}`);
    console.log(`Longitude: ${property.longitude}`);
    
    // 2. Save the property data to the database
    console.log('\nSaving property data to database...');
    const propertyResult = await rentcastProperty.processAndUpsertFromRentCast(property);
    console.log(`Property data saved: ${JSON.stringify(propertyResult)}`);
    
    // 3. Get AVM (Automated Valuation Model) data for the property
    console.log('\nFetching AVM data...');
    const avmData = await rentCast.getPropertyAvm(property.id);
    console.log(`Price Estimate: $${avmData.price || avmData.priceEstimate}`);
    console.log(`Price Range: $${avmData.priceRangeLow || avmData.priceLow} - $${avmData.priceRangeHigh || avmData.priceHigh}`);
    
    // 4. Save the AVM data to the database
    console.log('\nSaving AVM data to database...');
    const avmResult = await rentcastAvmValue.processAndUpsertFromRentCast(property.id, avmData);
    console.log(`AVM data saved: ${JSON.stringify(avmResult)}`);
    
    // 5. Get rent estimate data for the property
    console.log('\nFetching rent estimate data...');
    const rentData = await rentCast.getPropertyRentEstimate(property.id);
    console.log(`Rent Estimate: $${rentData.rent || rentData.rentEstimate}/month`);
    console.log(`Rent Range: $${rentData.rentRangeLow || rentData.rentLow} - $${rentData.rentRangeHigh || rentData.rentHigh}/month`);
    
    // 6. Save the rent data to the database
    console.log('\nSaving rent data to database...');
    const rentResult = await rentcastAvmRent.processAndUpsertFromRentCast(property.id, rentData);
    console.log(`Rent data saved: ${JSON.stringify(rentResult)}`);
    
    // 7. Find matching ATTOM property
    console.log('\nFinding matching ATTOM property...');
    const match = await propertyLink.findBestAttomMatch(property);
    
    if (match) {
      console.log(`Found matching ATTOM property: ${match.attomId}`);
      console.log(`Match confidence: ${(match.confidence * 100).toFixed(2)}%`);
      console.log(`Match method: ${match.method}`);
      
      // 8. Link the properties
      console.log('\nLinking properties...');
      await propertyLink.linkProperties(
        match.attomId,
        property.id,
        match.confidence,
        match.method
      );
      console.log('Properties linked successfully');
    } else {
      console.log('No matching ATTOM property found');
    }
    
    console.log('\nExample completed successfully');
    
  } catch (error) {
    console.error('Error in RentCast example:', error.message);
    console.error(error);
  }
}

// Run the main function
main().catch(console.error);
