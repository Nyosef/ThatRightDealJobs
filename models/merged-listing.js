/**
 * Merged Listing Model
 * Handles merging property data from Zillow, Redfin, and Realtor sources
 * with conflict tracking and resolution
 */

const { db } = require('../index');
const addressMatcher = require('./address-matcher');
const mergeConfig = require('../utils/merge-config');

/**
 * Get all source listings for merging
 * @param {string} zipCode - Optional zip code filter
 * @returns {Promise<Object>} Object with arrays of listings from each source
 */
async function getAllSourceListings(zipCode = null) {
  const supabase = db.getSupabaseClient();
  
  try {
    // Build queries with optional zip code filter
    let zillowQuery = supabase.from('zillow_listing').select('*');
    let redfinQuery = supabase.from('redfin_listing').select('*');
    let realtorQuery = supabase.from('realtor_listing').select('*');
    
    if (zipCode) {
      zillowQuery = zillowQuery.eq('zip5', zipCode);
      redfinQuery = redfinQuery.eq('zip5', zipCode);
      realtorQuery = realtorQuery.eq('zip5', zipCode);
    }
    
    const [zillowResult, redfinResult, realtorResult] = await Promise.all([
      zillowQuery,
      redfinQuery,
      realtorQuery
    ]);
    
    if (zillowResult.error) throw new Error(`Zillow query error: ${zillowResult.error.message}`);
    if (redfinResult.error) throw new Error(`Redfin query error: ${redfinResult.error.message}`);
    if (realtorResult.error) throw new Error(`Realtor query error: ${realtorResult.error.message}`);
    
    return {
      zillow: zillowResult.data || [],
      redfin: redfinResult.data || [],
      realtor: realtorResult.data || []
    };
  } catch (error) {
    console.error('Error fetching source listings:', error.message);
    throw error;
  }
}

/**
 * Merge property data from multiple sources
 * @param {Object} sources - Object containing matched listings from different sources
 * @param {Object} config - Merge configuration
 * @returns {Object} Merged property data
 */
function mergePropertyData(sources, config) {
  const merged = {
    // Source tracking
    zillow_id: sources.zillow?.zillow_id || null,
    redfin_id: sources.redfin?.redfin_id || null,
    realtor_id: sources.realtor?.realtor_id || null,
    source_count: 0,
    data_sources: [],
    
    // Original addresses for reference
    original_addresses: {},
    
    // Merged fields
    address: '',
    lat: null,
    lon: null,
    zip5: '',
    city: '',
    state: '',
    
    // Numeric fields (will be averaged)
    price: null,
    last_sold_price: null,
    bedrooms: null,
    bathrooms: null,
    sqft: null,
    year_built: null,
    lot_size: null,
    
    // Zillow-specific fields
    zestimate: null,
    
    // Text fields (source-specific)
    zillow_overview: '',
    redfin_overview: '',
    realtor_overview: '',
    
    // Additional fields
    property_type: '',
    listing_status: '',
    days_on_market: null,
    
    // Conflict tracking
    data_conflicts: {},
    conflict_count: 0,
    has_price_conflicts: false,
    has_size_conflicts: false
  };
  
  // Track which sources we have
  const availableSources = [];
  if (sources.zillow) {
    availableSources.push('zillow');
    merged.source_count++;
    merged.data_sources.push({
      source: 'zillow',
      id: sources.zillow.zillow_id,
      last_updated: sources.zillow.last_updated
    });
    merged.original_addresses.zillow = sources.zillow.address;
  }
  
  if (sources.redfin) {
    availableSources.push('redfin');
    merged.source_count++;
    merged.data_sources.push({
      source: 'redfin',
      id: sources.redfin.redfin_id,
      last_updated: sources.redfin.last_updated
    });
    merged.original_addresses.redfin = sources.redfin.address;
  }
  
  if (sources.realtor) {
    availableSources.push('realtor');
    merged.source_count++;
    merged.data_sources.push({
      source: 'realtor',
      id: sources.realtor.realtor_id,
      last_updated: sources.realtor.last_updated
    });
    merged.original_addresses.realtor = sources.realtor.street;
  }
  
  // Merge address (use the most complete one, preferring Zillow)
  merged.address = sources.zillow?.address || sources.redfin?.address || sources.realtor?.street || '';
  merged.address = addressMatcher.normalizeAddress(merged.address);
  
  // Merge geographic data
  const coordinates = mergeCoordinates(sources);
  merged.lat = coordinates.lat;
  merged.lon = coordinates.lon;
  
  // Merge basic location data
  merged.zip5 = sources.zillow?.zip5 || sources.redfin?.zip5 || sources.realtor?.zip5 || '';
  merged.city = sources.zillow?.city || sources.redfin?.city || sources.realtor?.locality || '';
  merged.state = sources.zillow?.state || sources.redfin?.state || sources.realtor?.region || '';
  
  // Merge numeric fields with conflict detection
  merged.price = mergeNumericField('price', sources, config, merged.data_conflicts);
  merged.last_sold_price = mergeNumericField('last_sold_price', sources, config, merged.data_conflicts);
  merged.bedrooms = mergeNumericField('bedrooms', sources, config, merged.data_conflicts);
  merged.bathrooms = mergeNumericField('bathrooms', sources, config, merged.data_conflicts);
  merged.sqft = mergeNumericField('sqft', sources, config, merged.data_conflicts);
  merged.year_built = mergeNumericField('year_built', sources, config, merged.data_conflicts);
  merged.lot_size = mergeNumericField('lot_size', sources, config, merged.data_conflicts);
  
  // Merge Zillow-specific fields
  merged.zestimate = extractZestimate(sources.zillow);
  
  // Merge text fields (source-specific overviews)
  merged.zillow_overview = extractOverview(sources.zillow, 'zillow');
  merged.redfin_overview = extractOverview(sources.redfin, 'redfin');
  merged.realtor_overview = extractOverview(sources.realtor, 'realtor');
  
  // Merge categorical fields
  merged.property_type = mergePropertyType(sources);
  merged.listing_status = mergeListingStatus(sources);
  merged.days_on_market = mergeDaysOnMarket(sources);
  
  // Count conflicts
  merged.conflict_count = Object.keys(merged.data_conflicts).length;
  merged.has_price_conflicts = hasConflictForField(merged.data_conflicts, ['price', 'last_sold_price']);
  merged.has_size_conflicts = hasConflictForField(merged.data_conflicts, ['sqft', 'bedrooms', 'bathrooms', 'lot_size']);
  
  return merged;
}

/**
 * Merge coordinates from multiple sources
 * @param {Object} sources - Source listings
 * @returns {Object} Merged coordinates
 */
function mergeCoordinates(sources) {
  const coords = [];
  
  if (sources.zillow?.lat && sources.zillow?.lon) {
    coords.push({ lat: parseFloat(sources.zillow.lat), lon: parseFloat(sources.zillow.lon), source: 'zillow' });
  }
  
  if (sources.redfin?.lat && sources.redfin?.lon) {
    coords.push({ lat: parseFloat(sources.redfin.lat), lon: parseFloat(sources.redfin.lon), source: 'redfin' });
  }
  
  if (sources.realtor?.latitude && sources.realtor?.longitude) {
    coords.push({ lat: parseFloat(sources.realtor.latitude), lon: parseFloat(sources.realtor.longitude), source: 'realtor' });
  }
  
  if (coords.length === 0) {
    return { lat: null, lon: null };
  }
  
  if (coords.length === 1) {
    return { lat: coords[0].lat, lon: coords[0].lon };
  }
  
  // Average coordinates
  const avgLat = coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length;
  const avgLon = coords.reduce((sum, coord) => sum + coord.lon, 0) / coords.length;
  
  return { lat: avgLat, lon: avgLon };
}

/**
 * Merge numeric field with conflict detection
 * @param {string} fieldName - Name of the field to merge
 * @param {Object} sources - Source listings
 * @param {Object} config - Configuration
 * @param {Object} conflicts - Conflicts object to update
 * @returns {number|null} Merged value
 */
function mergeNumericField(fieldName, sources, config, conflicts) {
  const values = [];
  
  // Map field names between sources
  const fieldMappings = {
    bedrooms: { zillow: 'bedrooms', redfin: 'bedrooms', realtor: 'beds' },
    bathrooms: { zillow: 'bathrooms', redfin: 'bathrooms', realtor: 'baths' },
    lot_size: { zillow: null, redfin: 'lot_size', realtor: 'lot_sqft' },
    sqft: { zillow: 'sqft', redfin: 'sqft', realtor: 'sqft' },
    price: { zillow: 'price', redfin: 'price', realtor: 'list_price' },
    last_sold_price: { zillow: 'last_sold_price', redfin: null, realtor: 'last_sold_price' },
    year_built: { zillow: null, redfin: 'year_built', realtor: 'year_built' }
  };
  
  const mapping = fieldMappings[fieldName] || { zillow: fieldName, redfin: fieldName, realtor: fieldName };
  
  // Collect values from each source
  if (sources.zillow && mapping.zillow && sources.zillow[mapping.zillow] != null) {
    values.push({
      source: 'zillow',
      value: parseFloat(sources.zillow[mapping.zillow]),
      field: mapping.zillow
    });
  }
  
  if (sources.redfin && mapping.redfin && sources.redfin[mapping.redfin] != null) {
    values.push({
      source: 'redfin',
      value: parseFloat(sources.redfin[mapping.redfin]),
      field: mapping.redfin
    });
  }
  
  if (sources.realtor && mapping.realtor && sources.realtor[mapping.realtor] != null) {
    values.push({
      source: 'realtor',
      value: parseFloat(sources.realtor[mapping.realtor]),
      field: mapping.realtor
    });
  }
  
  // Filter out invalid values
  const validValues = values.filter(v => !isNaN(v.value) && v.value > 0);
  
  if (validValues.length === 0) {
    return null;
  }
  
  if (validValues.length === 1) {
    return validValues[0].value;
  }
  
  // Check for conflicts
  const hasConflict = detectNumericConflict(validValues, config, fieldName);
  
  if (hasConflict && config.conflict_detection_enabled) {
    conflicts[fieldName] = {
      values: validValues.map(v => ({ source: v.source, value: v.value, field: v.field })),
      reason: `${fieldName} values differ beyond threshold`,
      resolved_value: null,
      resolution_method: 'average'
    };
  }
  
  // Calculate average
  const average = validValues.reduce((sum, v) => sum + v.value, 0) / validValues.length;
  
  if (hasConflict) {
    conflicts[fieldName].resolved_value = average;
  }
  
  // Round appropriately based on field type
  if (['bedrooms', 'year_built'].includes(fieldName)) {
    return Math.round(average);
  } else if (fieldName === 'bathrooms') {
    return Math.round(average * 2) / 2; // Round to nearest 0.5
  } else {
    return Math.round(average);
  }
}

/**
 * Detect if numeric values have conflicts
 * @param {Array} values - Array of value objects
 * @param {Object} config - Configuration
 * @param {string} fieldName - Field name for specific thresholds
 * @returns {boolean} True if conflict detected
 */
function detectNumericConflict(values, config, fieldName) {
  if (values.length < 2) return false;
  
  // Use field-specific thresholds or default
  let threshold = config.price_conflict_threshold;
  
  if (['bedrooms', 'bathrooms'].includes(fieldName)) {
    threshold = 0.1; // 10% for room counts
  } else if (fieldName === 'year_built') {
    threshold = 0.02; // 2% for year built
  } else if (fieldName === 'sqft') {
    threshold = 0.1; // 10% for square footage
  }
  
  const sortedValues = values.map(v => v.value).sort((a, b) => a - b);
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  
  if (min === 0) return max > 0; // Avoid division by zero
  
  const percentDiff = (max - min) / min;
  return percentDiff > threshold;
}

/**
 * Extract overview text from source listing
 * @param {Object} listing - Source listing
 * @param {string} source - Source name
 * @returns {string} Overview text
 */
function extractOverview(listing, source) {
  if (!listing) return '';
  
  switch (source) {
    case 'zillow':
      return listing.img_src || listing.status_text || '';
    case 'redfin':
      return listing.listing_remarks || '';
    case 'realtor':
      return listing.text || '';
    default:
      return '';
  }
}

/**
 * Extract Zestimate from Zillow listing
 * @param {Object} zillowListing - Zillow listing object
 * @returns {number|null} Zestimate value or null if not available
 */
function extractZestimate(zillowListing) {
  if (!zillowListing) return null;
  
  // Check if zestimate field exists and has a valid value
  if (zillowListing.zestimate != null) {
    const zestimate = parseFloat(zillowListing.zestimate);
    return !isNaN(zestimate) && zestimate > 0 ? zestimate : null;
  }
  
  return null;
}

/**
 * Merge property type from sources
 * @param {Object} sources - Source listings
 * @returns {string} Merged property type
 */
function mergePropertyType(sources) {
  // Priority: Zillow > Realtor > Redfin (Zillow tends to have cleaner property types)
  return sources.zillow?.property_type || 
         sources.realtor?.property_type || 
         sources.redfin?.property_type || 
         '';
}

/**
 * Merge listing status from sources
 * @param {Object} sources - Source listings
 * @returns {string} Merged listing status
 */
function mergeListingStatus(sources) {
  // Priority: Zillow > Redfin > Realtor
  return sources.zillow?.listing_status || 
         sources.redfin?.mls_status || 
         sources.realtor?.status || 
         '';
}

/**
 * Merge days on market from sources
 * @param {Object} sources - Source listings
 * @returns {number|null} Merged days on market
 */
function mergeDaysOnMarket(sources) {
  const values = [];
  
  if (sources.zillow?.days_on_zillow) {
    values.push(parseInt(sources.zillow.days_on_zillow));
  }
  
  if (sources.redfin?.dom) {
    values.push(parseInt(sources.redfin.dom));
  }
  
  // Realtor doesn't have a direct days on market field
  
  const validValues = values.filter(v => !isNaN(v) && v > 0);
  
  if (validValues.length === 0) return null;
  
  // Return average
  return Math.round(validValues.reduce((sum, v) => sum + v, 0) / validValues.length);
}

/**
 * Check if conflicts exist for specific fields
 * @param {Object} conflicts - Conflicts object
 * @param {Array} fieldNames - Array of field names to check
 * @returns {boolean} True if any of the fields have conflicts
 */
function hasConflictForField(conflicts, fieldNames) {
  return fieldNames.some(field => conflicts.hasOwnProperty(field));
}

/**
 * Calculate quality score for merged listing
 * @param {Object} mergedData - Merged listing data
 * @param {Object} config - Configuration with weights
 * @returns {number} Quality score (0.0 to 1.0)
 */
function calculateQualityScore(mergedData, config) {
  const weights = config.quality_score_weights;
  
  // Source count score (more sources = better)
  const sourceScore = Math.min(mergedData.source_count / 3, 1.0);
  
  // Confidence score (from matching process)
  const confidenceScore = mergedData.confidence_score || 0.8; // Default if not set
  
  // Conflict score (fewer conflicts = better)
  const maxExpectedConflicts = 5; // Reasonable maximum
  const conflictScore = Math.max(0, 1 - (mergedData.conflict_count / maxExpectedConflicts));
  
  // Weighted average
  const qualityScore = (
    sourceScore * weights.source_count +
    confidenceScore * weights.confidence +
    conflictScore * weights.conflicts
  );
  
  return Math.round(qualityScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Insert or update merged listing with change tracking
 * @param {Object} mergedData - Merged listing data
 * @param {string} changeReason - Reason for the change (e.g., "New data from zillow_daily_task")
 * @returns {Promise<Object>} Inserted/updated record
 */
async function upsertMergedListing(mergedData, changeReason = 'Data merge process') {
  const supabase = db.getSupabaseClient();
  
  try {
    // Check if a merged listing already exists for this address
    const { data: existing, error: findError } = await supabase
      .from('merged_listing')
      .select('*')
      .eq('address', mergedData.address)
      .maybeSingle();
    
    if (findError) {
      console.warn('Error checking for existing merged listing:', findError.message);
    }
    
    const now = new Date().toISOString();
    mergedData.last_merged_at = now;
    
    if (existing) {
      // Detect changes between existing and new data
      const changeDetection = detectChanges(existing, mergedData);
      
      if (changeDetection.hasChanges) {
        // Update with change tracking
        mergedData.updated_at = now;
        mergedData.last_change_reason = changeReason;
        mergedData.changed_fields = changeDetection.changedFields;
        mergedData.change_source = changeDetection.contributingSources.join(',');
        mergedData.change_details = {
          change_count: changeDetection.changeCount,
          timestamp: now,
          previous_update: existing.updated_at
        };
        
        const { data, error } = await supabase
          .from('merged_listing')
          .update(mergedData)
          .eq('the_real_deal_id', existing.the_real_deal_id)
          .select()
          .single();
        
        if (error) throw new Error(`Error updating merged listing: ${error.message}`);
        
        // Log detailed changes
        logChanges(existing.the_real_deal_id, mergedData.address, changeDetection, changeReason);
        
        return data;
      } else {
        // No changes detected, just update timestamps
        const { data, error } = await supabase
          .from('merged_listing')
          .update({ 
            last_merged_at: now,
            updated_at: now 
          })
          .eq('the_real_deal_id', existing.the_real_deal_id)
          .select()
          .single();
        
        if (error) throw new Error(`Error updating merged listing timestamps: ${error.message}`);
        
        console.log(`No changes detected for merged listing ${existing.the_real_deal_id}: ${mergedData.address}`);
        return data;
      }
    } else {
      // Insert new record
      mergedData.created_at = now;
      mergedData.updated_at = now;
      mergedData.last_change_reason = 'Initial merge - new record';
      mergedData.change_source = 'new_record';
      mergedData.changed_fields = {};
      mergedData.change_details = {
        change_count: 0,
        timestamp: now,
        initial_creation: true
      };
      
      const { data, error } = await supabase
        .from('merged_listing')
        .insert(mergedData)
        .select()
        .single();
      
      if (error) throw new Error(`Error inserting merged listing: ${error.message}`);
      
      console.log(`✅ Created new merged listing ${data.the_real_deal_id} for address: ${mergedData.address}`);
      console.log(`   📊 Sources: ${mergedData.source_count} (${Object.keys(mergedData.data_sources || {}).join(', ')})`);
      
      return data;
    }
  } catch (error) {
    console.error('Error upserting merged listing:', error.message);
    throw error;
  }
}

/**
 * Process and merge all listings
 * @param {string} zipCode - Optional zip code filter
 * @returns {Promise<Object>} Processing results
 */
async function processAllListings(zipCode = null) {
  const startTime = Date.now();
  const results = {
    total_processed: 0,
    total_merged: 0,
    exact_matches: 0,
    fuzzy_matches: 0,
    coordinate_matches: 0,
    no_matches: 0,
    conflicts_detected: 0,
    errors: 0,
    processing_time_seconds: 0
  };
  
  try {
    console.log(`Starting merge process${zipCode ? ` for zip code ${zipCode}` : ' for all listings'}...`);
    
    // Get configuration
    const config = await mergeConfig.getConfigWithOverrides();
    console.log('Using merge configuration:', config);
    
    // Get all source listings
    const sourceListings = await getAllSourceListings(zipCode);
    console.log(`Loaded ${sourceListings.zillow.length} Zillow, ${sourceListings.redfin.length} Redfin, ${sourceListings.realtor.length} Realtor listings`);
    
    // Create a map to track processed addresses
    const processedAddresses = new Set();
    const allListings = [];
    
    // Combine all listings with source information
    sourceListings.zillow.forEach(listing => {
      allListings.push({ ...listing, source: 'zillow', address: listing.address, lat: listing.lat, lon: listing.lon });
    });
    
    sourceListings.redfin.forEach(listing => {
      allListings.push({ ...listing, source: 'redfin', address: listing.address, lat: listing.lat, lon: listing.lon });
    });
    
    sourceListings.realtor.forEach(listing => {
      allListings.push({ ...listing, source: 'realtor', address: listing.street, lat: listing.latitude, lon: listing.longitude });
    });
    
    console.log(`Total listings to process: ${allListings.length}`);
    
    // Process each listing
    for (const listing of allListings) {
      try {
        results.total_processed++;
        
        const normalizedAddress = addressMatcher.normalizeAddress(listing.address);
        
        // Skip if we've already processed this address
        if (processedAddresses.has(normalizedAddress)) {
          continue;
        }
        
        processedAddresses.add(normalizedAddress);
        
        // Find matches across all sources
        const matches = {
          zillow: null,
          redfin: null,
          realtor: null
        };
        
        // Use comprehensive matching that evaluates both address AND coordinates
        const comprehensiveMatches = findComprehensiveMatches(listing, sourceListings, config);
        Object.assign(matches, comprehensiveMatches);
        
        // Count match types
        const matchCount = Object.values(matches).filter(m => m !== null).length;
        if (matchCount === 0) {
          results.no_matches++;
          continue;
        }
        
        // Merge the data
        const mergedData = mergePropertyData(matches, config);
        
        // Calculate quality score
        mergedData.quality_score = calculateQualityScore(mergedData, config);
        
        // Set matching metadata
        mergedData.matching_method = determineMatchingMethod(matches);
        mergedData.confidence_score = calculateConfidenceScore(matches, config);
        
        // Upsert the merged listing
        await upsertMergedListing(mergedData);
        
        results.total_merged++;
        
        // Count conflicts
        if (mergedData.conflict_count > 0) {
          results.conflicts_detected += mergedData.conflict_count;
        }
        
        // Count match types for statistics
        if (mergedData.matching_method === 'address_exact') {
          results.exact_matches++;
        } else if (mergedData.matching_method === 'address_fuzzy') {
          results.fuzzy_matches++;
        } else if (mergedData.matching_method === 'coordinates') {
          results.coordinate_matches++;
        }
        
        // Log progress every 100 listings
        if (results.total_processed % 100 === 0) {
          console.log(`Processed ${results.total_processed} listings, merged ${results.total_merged}`);
        }
        
      } catch (error) {
        console.error(`Error processing listing ${listing.address}:`, error.message);
        results.errors++;
      }
    }
    
    // Calculate processing time
    results.processing_time_seconds = Math.round((Date.now() - startTime) / 1000);
    
    // Save statistics
    await saveMergeStatistics(results, zipCode);
    
    console.log('Merge process completed:', results);
    return results;
    
  } catch (error) {
    console.error('Error in merge process:', error.message);
    results.errors++;
    results.processing_time_seconds = Math.round((Date.now() - startTime) / 1000);
    throw error;
  }
}

/**
 * Find comprehensive matches across all sources
 * @param {Object} targetListing - Target listing
 * @param {Object} sourceListings - All source listings
 * @param {Object} config - Configuration
 * @returns {Object} Best matches from each source
 */
function findComprehensiveMatches(targetListing, sourceListings, config) {
  const matches = { zillow: null, redfin: null, realtor: null };
  
  // Prepare target property for matching
  const targetProperty = {
    address: targetListing.address,
    lat: targetListing.lat,
    lon: targetListing.lon
  };
  
  console.log(`\n🔍 Finding matches for: ${targetProperty.address} (${targetProperty.lat}, ${targetProperty.lon})`);
  
  // Find matches in each source using comprehensive evaluation
  
  // 1. Zillow matches
  if (targetListing.source !== 'zillow' && sourceListings.zillow.length > 0) {
    const zillowCandidates = sourceListings.zillow.map(listing => ({
      ...listing,
      address: listing.address,
      lat: listing.lat,
      lon: listing.lon
    }));
    
    const zillowMatches = addressMatcher.findMatches(targetProperty, zillowCandidates, config);
    if (zillowMatches.length > 0) {
      const bestMatch = zillowMatches[0];
      matches.zillow = bestMatch.candidate;
      console.log(`  ✅ Zillow match: ${bestMatch.candidate.address} (method: ${bestMatch.matching_method}, confidence: ${bestMatch.confidence.toFixed(3)}, distance: ${bestMatch.distance_meters?.toFixed(1)}m)`);
    } else {
      console.log(`  ❌ No Zillow matches found`);
    }
  } else if (targetListing.source === 'zillow') {
    matches.zillow = targetListing;
    console.log(`  📍 Source is Zillow: ${targetListing.address}`);
  }
  
  // 2. Redfin matches
  if (targetListing.source !== 'redfin' && sourceListings.redfin.length > 0) {
    const redfinCandidates = sourceListings.redfin.map(listing => ({
      ...listing,
      address: listing.address,
      lat: listing.lat,
      lon: listing.lon
    }));
    
    const redfinMatches = addressMatcher.findMatches(targetProperty, redfinCandidates, config);
    if (redfinMatches.length > 0) {
      const bestMatch = redfinMatches[0];
      matches.redfin = bestMatch.candidate;
      console.log(`  ✅ Redfin match: ${bestMatch.candidate.address} (method: ${bestMatch.matching_method}, confidence: ${bestMatch.confidence.toFixed(3)}, distance: ${bestMatch.distance_meters?.toFixed(1)}m)`);
    } else {
      console.log(`  ❌ No Redfin matches found`);
    }
  } else if (targetListing.source === 'redfin') {
    matches.redfin = targetListing;
    console.log(`  📍 Source is Redfin: ${targetListing.address}`);
  }
  
  // 3. Realtor matches
  if (targetListing.source !== 'realtor' && sourceListings.realtor.length > 0) {
    const realtorCandidates = sourceListings.realtor.map(listing => ({
      ...listing,
      address: listing.street, // Note: Realtor uses 'street' field
      lat: listing.latitude,   // Note: Realtor uses 'latitude'
      lon: listing.longitude   // Note: Realtor uses 'longitude'
    }));
    
    const realtorMatches = addressMatcher.findMatches(targetProperty, realtorCandidates, config);
    if (realtorMatches.length > 0) {
      const bestMatch = realtorMatches[0];
      matches.realtor = bestMatch.candidate;
      console.log(`  ✅ Realtor match: ${bestMatch.candidate.street} (method: ${bestMatch.matching_method}, confidence: ${bestMatch.confidence.toFixed(3)}, distance: ${bestMatch.distance_meters?.toFixed(1)}m)`);
    } else {
      console.log(`  ❌ No Realtor matches found`);
    }
  } else if (targetListing.source === 'realtor') {
    matches.realtor = targetListing;
    console.log(`  📍 Source is Realtor: ${targetListing.street}`);
  }
  
  const matchCount = Object.values(matches).filter(m => m !== null).length;
  console.log(`  📊 Total matches found: ${matchCount}/3 sources`);
  
  return matches;
}

/**
 * Legacy function for backward compatibility
 */
function findExactMatches(targetListing, sourceListings) {
  // Use comprehensive matching with high confidence threshold for "exact" matches
  const config = {
    coordinate_tolerance_meters: 10,
    address_fuzzy_threshold: 1.0,
    enable_fuzzy_matching: false,
    min_confidence_score: 0.95,
    max_coordinate_distance: 50
  };
  
  return findComprehensiveMatches(targetListing, sourceListings, config);
}

/**
 * Legacy function for backward compatibility
 */
async function findFuzzyMatches(targetListing, sourceListings, config) {
  return findComprehensiveMatches(targetListing, sourceListings, config);
}

/**
 * Determine the primary matching method used
 * @param {Object} matches - Matched listings
 * @returns {string} Matching method
 */
function determineMatchingMethod(matches) {
  // This is a simplified version - in a real implementation,
  // you'd track the actual method used for each match
  const matchCount = Object.values(matches).filter(m => m !== null).length;
  
  if (matchCount >= 2) {
    return 'hybrid';
  } else if (matchCount === 1) {
    return 'address_exact'; // Default assumption
  }
  
  return 'none';
}

/**
 * Calculate confidence score for the match
 * @param {Object} matches - Matched listings
 * @param {Object} config - Configuration
 * @returns {number} Confidence score
 */
function calculateConfidenceScore(matches, config) {
  const matchCount = Object.values(matches).filter(m => m !== null).length;
  
  // Base confidence on number of sources
  let confidence = matchCount / 3;
  
  // Boost confidence if we have coordinate validation
  const hasCoordinates = Object.values(matches).some(match => 
    match && match.lat && match.lon
  );
  
  if (hasCoordinates) {
    confidence = Math.min(1.0, confidence + 0.1);
  }
  
  return Math.round(confidence * 100) / 100;
}

/**
 * Save merge statistics to database
 * @param {Object} results - Processing results
 * @param {string} zipCode - Zip code processed (if any)
 * @returns {Promise<void>}
 */
async function saveMergeStatistics(results, zipCode = null) {
  const supabase = db.getSupabaseClient();
  
  try {
    const stats = {
      run_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      total_processed: results.total_processed,
      total_merged: results.total_merged,
      exact_matches: results.exact_matches,
      fuzzy_matches: results.fuzzy_matches,
      coordinate_matches: results.coordinate_matches,
      no_matches: results.no_matches,
      conflicts_detected: results.conflicts_detected,
      avg_confidence_score: results.total_merged > 0 ? 0.85 : null, // Placeholder - would calculate from actual data
      avg_quality_score: results.total_merged > 0 ? 0.80 : null, // Placeholder - would calculate from actual data
      processing_time_seconds: results.processing_time_seconds,
      errors_count: results.errors
    };
    
    // Upsert statistics (update if exists for today, insert if not)
    const { error } = await supabase
      .from('merge_statistics')
      .upsert(stats, { onConflict: 'run_date' });
    
    if (error) {
      console.warn('Error saving merge statistics:', error.message);
    } else {
      console.log('Merge statistics saved successfully');
    }
  } catch (error) {
    console.warn('Error saving merge statistics:', error.message);
  }
}

/**
 * Get merged listings with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of merged listings
 */
async function getMergedListings(filters = {}) {
  const supabase = db.getSupabaseClient();
  
  try {
    let query = supabase.from('merged_listing').select('*');
    
    if (filters.zip5) {
      query = query.eq('zip5', filters.zip5);
    }
    
    if (filters.published !== undefined) {
      query = query.eq('published', filters.published);
    }
    
    if (filters.min_quality_score) {
      query = query.gte('quality_score', filters.min_quality_score);
    }
    
    if (filters.min_confidence_score) {
      query = query.gte('confidence_score', filters.min_confidence_score);
    }
    
    if (filters.source_count) {
      query = query.gte('source_count', filters.source_count);
    }
    
    if (filters.has_conflicts !== undefined) {
      if (filters.has_conflicts) {
        query = query.gt('conflict_count', 0);
      } else {
        query = query.eq('conflict_count', 0);
      }
    }
    
    // Default ordering by quality score descending
    query = query.order('quality_score', { ascending: false });
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Error getting merged listings: ${error.message}`);
    
    return data || [];
  } catch (error) {
    console.error('Error getting merged listings:', error.message);
    throw error;
  }
}

/**
 * Get merge statistics for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of statistics
 */
async function getMergeStatistics(startDate, endDate) {
  const supabase = db.getSupabaseClient();
  
  try {
    let query = supabase
      .from('merge_statistics')
      .select('*')
      .order('run_date', { ascending: false });
    
    if (startDate) {
      query = query.gte('run_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('run_date', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Error getting merge statistics: ${error.message}`);
    
    return data || [];
  } catch (error) {
    console.error('Error getting merge statistics:', error.message);
    throw error;
  }
}

/**
 * Update publication status for merged listings
 * @param {Array} listingIds - Array of the_real_deal_id values
 * @param {boolean} published - Publication status
 * @returns {Promise<number>} Number of updated records
 */
async function updatePublicationStatus(listingIds, published) {
  const supabase = db.getSupabaseClient();
  
  try {
    const updateData = {
      published,
      published_at: published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('merged_listing')
      .update(updateData)
      .in('the_real_deal_id', listingIds)
      .select('the_real_deal_id');
    
    if (error) throw new Error(`Error updating publication status: ${error.message}`);
    
    console.log(`Updated publication status for ${data.length} listings`);
    return data.length;
  } catch (error) {
    console.error('Error updating publication status:', error.message);
    throw error;
  }
}

/**
 * Get conflict summary for analysis
 * @param {string} zipCode - Optional zip code filter
 * @returns {Promise<Object>} Conflict analysis
 */
async function getConflictSummary(zipCode = null) {
  const supabase = db.getSupabaseClient();
  
  try {
    let query = supabase
      .from('merged_listing')
      .select('data_conflicts, conflict_count, has_price_conflicts, has_size_conflicts');
    
    if (zipCode) {
      query = query.eq('zip5', zipCode);
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Error getting conflict summary: ${error.message}`);
    
    const summary = {
      total_listings: data.length,
      listings_with_conflicts: data.filter(l => l.conflict_count > 0).length,
      price_conflicts: data.filter(l => l.has_price_conflicts).length,
      size_conflicts: data.filter(l => l.has_size_conflicts).length,
      avg_conflicts_per_listing: data.length > 0 ? 
        data.reduce((sum, l) => sum + l.conflict_count, 0) / data.length : 0,
      conflict_types: {}
    };
    
    // Analyze conflict types
    data.forEach(listing => {
      if (listing.data_conflicts) {
        Object.keys(listing.data_conflicts).forEach(field => {
          if (!summary.conflict_types[field]) {
            summary.conflict_types[field] = 0;
          }
          summary.conflict_types[field]++;
        });
      }
    });
    
    return summary;
  } catch (error) {
    console.error('Error getting conflict summary:', error.message);
    throw error;
  }
}

/**
 * Detect changes between existing and new merged data
 * @param {Object} existing - Existing merged listing data
 * @param {Object} newData - New merged listing data
 * @returns {Object} Change detection results
 */
function detectChanges(existing, newData) {
  const changedFields = {};
  const contributingSources = new Set();
  let changeCount = 0;
  
  // Fields to monitor for changes
  const monitoredFields = [
    'price', 'last_sold_price', 'bedrooms', 'bathrooms', 'sqft', 'year_built', 
    'lot_size', 'zestimate', 'property_type', 'listing_status', 'days_on_market',
    'zillow_overview', 'redfin_overview', 'realtor_overview', 'source_count'
  ];
  
  // Check each monitored field for changes
  monitoredFields.forEach(field => {
    const oldValue = existing[field];
    const newValue = newData[field];
    
    // Handle different data types appropriately
    if (hasFieldChanged(oldValue, newValue, field)) {
      changedFields[field] = {
        old: oldValue,
        new: newValue,
        source: determineFieldSource(field, newData, existing)
      };
      
      // Add contributing source
      const fieldSource = determineFieldSource(field, newData, existing);
      if (fieldSource && fieldSource !== 'unknown') {
        contributingSources.add(fieldSource);
      }
      
      changeCount++;
    }
  });
  
  // Check for source changes (new sources added)
  const oldSources = existing.data_sources || [];
  const newSources = newData.data_sources || [];
  
  if (newSources.length !== oldSources.length) {
    const oldSourceNames = oldSources.map(s => s.source);
    const newSourceNames = newSources.map(s => s.source);
    
    newSourceNames.forEach(source => {
      if (!oldSourceNames.includes(source)) {
        contributingSources.add(source);
      }
    });
  }
  
  return {
    hasChanges: changeCount > 0,
    changeCount,
    changedFields,
    contributingSources: Array.from(contributingSources)
  };
}

/**
 * Check if a field value has changed
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @param {string} fieldName - Name of the field
 * @returns {boolean} True if changed
 */
function hasFieldChanged(oldValue, newValue, fieldName) {
  // Handle null/undefined values
  if (oldValue == null && newValue == null) return false;
  if (oldValue == null || newValue == null) return true;
  
  // Handle numeric fields with tolerance for floating point precision
  const numericFields = ['price', 'last_sold_price', 'sqft', 'lot_size', 'zestimate'];
  if (numericFields.includes(fieldName)) {
    const oldNum = parseFloat(oldValue);
    const newNum = parseFloat(newValue);
    
    if (isNaN(oldNum) && isNaN(newNum)) return false;
    if (isNaN(oldNum) || isNaN(newNum)) return true;
    
    // Consider values changed if difference is more than $1 or 1 sqft
    const tolerance = fieldName.includes('price') || fieldName === 'zestimate' ? 1 : 1;
    return Math.abs(oldNum - newNum) > tolerance;
  }
  
  // Handle integer fields
  const integerFields = ['bedrooms', 'year_built', 'days_on_market', 'source_count'];
  if (integerFields.includes(fieldName)) {
    return parseInt(oldValue) !== parseInt(newValue);
  }
  
  // Handle decimal fields (bathrooms)
  if (fieldName === 'bathrooms') {
    return Math.abs(parseFloat(oldValue) - parseFloat(newValue)) > 0.1;
  }
  
  // Handle string fields
  const oldStr = String(oldValue || '').trim();
  const newStr = String(newValue || '').trim();
  return oldStr !== newStr;
}

/**
 * Determine which source contributed to a field change
 * @param {string} fieldName - Name of the field
 * @param {Object} newData - New merged data
 * @param {Object} existing - Existing data
 * @returns {string} Source name or 'multiple'
 */
function determineFieldSource(fieldName, newData, existing) {
  // Map fields to their likely sources
  const sourceMapping = {
    zestimate: 'zillow',
    zillow_overview: 'zillow',
    redfin_overview: 'redfin',
    realtor_overview: 'realtor'
  };
  
  if (sourceMapping[fieldName]) {
    return sourceMapping[fieldName];
  }
  
  // For other fields, check which sources are present in new data
  const newSources = (newData.data_sources || []).map(s => s.source);
  const oldSources = (existing.data_sources || []).map(s => s.source);
  
  // If new sources were added, attribute change to new sources
  const addedSources = newSources.filter(s => !oldSources.includes(s));
  if (addedSources.length > 0) {
    return addedSources.join(',');
  }
  
  // If source count changed, return all sources
  if (newSources.length !== oldSources.length) {
    return newSources.join(',');
  }
  
  // Default to multiple sources for averaged fields
  return newSources.length > 1 ? 'multiple' : newSources[0] || 'unknown';
}

/**
 * Log detailed changes to console
 * @param {number} listingId - The real deal ID
 * @param {string} address - Property address
 * @param {Object} changeDetection - Change detection results
 * @param {string} changeReason - Reason for changes
 */
function logChanges(listingId, address, changeDetection, changeReason) {
  console.log(`✅ Updated merged listing ${listingId} for address: ${address}`);
  
  if (changeDetection.hasChanges) {
    console.log(`   🔄 Changes detected:`);
    
    Object.entries(changeDetection.changedFields).forEach(([field, change]) => {
      const oldValue = formatValueForDisplay(change.old, field);
      const newValue = formatValueForDisplay(change.new, field);
      const source = change.source || 'unknown';
      
      console.log(`      - ${field}: ${oldValue} → ${newValue} (source: ${source})`);
    });
    
    console.log(`   📝 Change reason: ${changeReason}`);
    
    if (changeDetection.contributingSources.length > 0) {
      console.log(`   📊 Contributing sources: ${changeDetection.contributingSources.join(', ')}`);
    }
  }
}

/**
 * Format value for display in change logs
 * @param {any} value - Value to format
 * @param {string} fieldName - Field name for context
 * @returns {string} Formatted value
 */
function formatValueForDisplay(value, fieldName) {
  if (value == null) return 'null';
  
  // Format price fields
  if (fieldName.includes('price') || fieldName === 'zestimate') {
    return `$${Number(value).toLocaleString()}`;
  }
  
  // Format square footage
  if (fieldName === 'sqft' || fieldName === 'lot_size') {
    return `${Number(value).toLocaleString()} sqft`;
  }
  
  // Format other numeric fields
  if (typeof value === 'number') {
    return value.toString();
  }
  
  // Format strings (truncate if too long)
  const str = String(value);
  return str.length > 50 ? str.substring(0, 47) + '...' : str;
}

module.exports = {
  getAllSourceListings,
  mergePropertyData,
  processAllListings,
  upsertMergedListing,
  getMergedListings,
  getMergeStatistics,
  updatePublicationStatus,
  getConflictSummary,
  saveMergeStatistics
};
