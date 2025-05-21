/**
 * Property Linking Task Script
 * Links properties between ATTOM and RentCast data sources
 * Designed to run after both ATTOM and RentCast data is updated
 */

// Load environment variables
require('dotenv').config();

// Import modules
const supabaseUtils = require('../utils/supabase');
const models = require('../models');

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
 * Main function to run the property linking task
 * @param {Object} options - Options for the task
 * @param {number} options.batchSize - Number of properties to process in each batch
 * @param {number} options.confidenceThreshold - Minimum confidence score for a match (0-1)
 * @param {number} options.maxDistance - Maximum distance in meters for a match
 */
async function runPropertyLinkingTask(options = {}) {
  try {
    // Default options
    const {
      batchSize = 100,
      confidenceThreshold = 0.7,
      maxDistance = 50 // meters
    } = options;
    
    // First test the Supabase connection
    await testSupabaseConnection();
    
    console.log(`\n--- Starting Property Linking Task ---`);
    console.log(`Batch size: ${batchSize}`);
    console.log(`Confidence threshold: ${confidenceThreshold}`);
    console.log(`Maximum distance: ${maxDistance} meters`);
    
    // STEP 1: Get all RentCast properties without links
    console.log(`\n--- Getting RentCast properties without links ---`);
    const unlinkedProperties = await getUnlinkedRentCastProperties();
    console.log(`Found ${unlinkedProperties.length} RentCast properties without links`);
    
    if (unlinkedProperties.length === 0) {
      console.log('No properties to link. Exiting.');
      return { linked: 0, skipped: 0, errors: 0 };
    }
    
    // STEP 2: Process properties in batches
    console.log(`\n--- Processing properties in batches of ${batchSize} ---`);
    
    const results = {
      linked: 0,
      skipped: 0,
      errors: 0
    };
    
    for (let i = 0; i < unlinkedProperties.length; i += batchSize) {
      const batch = unlinkedProperties.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(unlinkedProperties.length / batchSize)}`);
      
      const batchResults = await processPropertyBatch(batch, { confidenceThreshold, maxDistance });
      
      results.linked += batchResults.linked;
      results.skipped += batchResults.skipped;
      results.errors += batchResults.errors;
      
      console.log(`Batch results: ${batchResults.linked} linked, ${batchResults.skipped} skipped, ${batchResults.errors} errors`);
    }
    
    console.log(`\n--- Property Linking Task Complete ---`);
    console.log(`Total results: ${results.linked} linked, ${results.skipped} skipped, ${results.errors} errors`);
    
    return results;
  } catch (error) {
    console.error('Error in property linking task:', error);
    process.exit(1);
  }
}

/**
 * Get all RentCast properties that don't have links to ATTOM properties
 * @returns {Promise<Array>} Array of RentCast properties
 */
async function getUnlinkedRentCastProperties() {
  const supabase = supabaseUtils.getSupabaseClient();
  
  // Get all RentCast properties
  const { data: allProperties, error: allError } = await supabase
    .from('rentcast_properties')
    .select('*');
  
  if (allError) {
    throw new Error(`Error getting RentCast properties: ${allError.message}`);
  }
  
  if (!allProperties || allProperties.length === 0) {
    return [];
  }
  
  // Get all linked RentCast property IDs
  const { data: linkedIds, error: linkedError } = await supabase
    .from('property_link')
    .select('rentcast_id');
  
  if (linkedError) {
    throw new Error(`Error getting linked property IDs: ${linkedError.message}`);
  }
  
  // Create a set of linked IDs for faster lookup
  const linkedIdSet = new Set((linkedIds || []).map(link => link.rentcast_id));
  
  // Filter out properties that already have links
  const unlinkedProperties = allProperties.filter(property => !linkedIdSet.has(property.rentcast_id));
  
  return unlinkedProperties;
}

/**
 * Process a batch of properties
 * @param {Array} properties - Array of RentCast properties
 * @param {Object} options - Options for processing
 * @param {number} options.confidenceThreshold - Minimum confidence score for a match (0-1)
 * @param {number} options.maxDistance - Maximum distance in meters for a match
 * @returns {Promise<Object>} Processing results
 */
async function processPropertyBatch(properties, options) {
  const results = {
    linked: 0,
    skipped: 0,
    errors: 0
  };
  
  // Process each property
  for (const property of properties) {
    try {
      // Skip properties without coordinates
      if (!property.latitude || !property.longitude) {
        console.warn(`Property ${property.rentcast_id} has no coordinates. Skipping.`);
        results.skipped++;
        continue;
      }
      
      // Find the best matching ATTOM property
      const match = await models.propertyLink.findBestAttomMatch(property);
      
      if (!match) {
        console.log(`No matching ATTOM property found for RentCast property ${property.rentcast_id}. Skipping.`);
        results.skipped++;
        continue;
      }
      
      // Check if the match meets the confidence threshold
      if (match.confidence < options.confidenceThreshold) {
        console.log(`Match confidence (${match.confidence.toFixed(2)}) below threshold (${options.confidenceThreshold}) for RentCast property ${property.rentcast_id}. Skipping.`);
        results.skipped++;
        continue;
      }
      
      // Link the properties
      await models.propertyLink.linkProperties(
        match.attomId,
        property.rentcast_id,
        match.confidence,
        match.method
      );
      
      console.log(`Linked RentCast property ${property.rentcast_id} to ATTOM property ${match.attomId} with confidence ${match.confidence.toFixed(2)}`);
      results.linked++;
    } catch (error) {
      console.error(`Error processing property ${property.rentcast_id}:`, error.message);
      results.errors++;
    }
  }
  
  return results;
}

/**
 * Check the quality of existing property links
 * @returns {Promise<Object>} Link quality statistics
 */
async function checkLinkQuality() {
  try {
    console.log('\n--- Checking Property Link Quality ---');
    
    const supabase = supabaseUtils.getSupabaseClient();
    
    // Get all property links
    const { data: links, error } = await supabase
      .from('property_link')
      .select('*');
    
    if (error) {
      throw new Error(`Error getting property links: ${error.message}`);
    }
    
    if (!links || links.length === 0) {
      console.log('No property links found.');
      return { total: 0 };
    }
    
    console.log(`Found ${links.length} property links`);
    
    // Calculate statistics
    const stats = {
      total: links.length,
      byMethod: {},
      byConfidence: {
        high: 0,    // 0.8 - 1.0
        medium: 0,  // 0.5 - 0.8
        low: 0      // 0.0 - 0.5
      }
    };
    
    // Count by method
    for (const link of links) {
      // Count by method
      if (!stats.byMethod[link.match_method]) {
        stats.byMethod[link.match_method] = 0;
      }
      stats.byMethod[link.match_method]++;
      
      // Count by confidence
      const confidence = link.match_confidence;
      if (confidence >= 0.8) {
        stats.byConfidence.high++;
      } else if (confidence >= 0.5) {
        stats.byConfidence.medium++;
      } else {
        stats.byConfidence.low++;
      }
    }
    
    // Log statistics
    console.log(`Total links: ${stats.total}`);
    console.log('Links by method:');
    for (const [method, count] of Object.entries(stats.byMethod)) {
      console.log(`  ${method}: ${count} (${(count / stats.total * 100).toFixed(1)}%)`);
    }
    
    console.log('Links by confidence:');
    console.log(`  High (0.8-1.0): ${stats.byConfidence.high} (${(stats.byConfidence.high / stats.total * 100).toFixed(1)}%)`);
    console.log(`  Medium (0.5-0.8): ${stats.byConfidence.medium} (${(stats.byConfidence.medium / stats.total * 100).toFixed(1)}%)`);
    console.log(`  Low (0.0-0.5): ${stats.byConfidence.low} (${(stats.byConfidence.low / stats.total * 100).toFixed(1)}%)`);
    
    console.log('--- End of Property Link Quality Check ---\n');
    
    return stats;
  } catch (error) {
    console.error('Error checking link quality:', error.message);
    return { error: error.message };
  }
}

// Execute the script if run directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Check for quality check flag
  if (args.includes('--check-quality')) {
    checkLinkQuality().catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
    return;
  }
  
  // Parse options
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  const confidenceArg = args.find(arg => arg.startsWith('--confidence='));
  const distanceArg = args.find(arg => arg.startsWith('--distance='));
  
  const options = {
    batchSize: batchSizeArg ? parseInt(batchSizeArg.replace('--batch-size=', '')) : 100,
    confidenceThreshold: confidenceArg ? parseFloat(confidenceArg.replace('--confidence=', '')) : 0.7,
    maxDistance: distanceArg ? parseInt(distanceArg.replace('--distance=', '')) : 50
  };
  
  // Run the property linking task
  runPropertyLinkingTask(options).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} else {
  // Script is being imported as a module
  module.exports = {
    runPropertyLinkingTask,
    checkLinkQuality
  };
}
