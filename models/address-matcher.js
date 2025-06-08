/**
 * Address Matching Utilities
 * Handles address normalization, fuzzy matching, and coordinate-based matching
 */

/**
 * Normalize address for consistent matching
 * @param {string} address - Raw address string
 * @returns {string} Normalized address
 */
function normalizeAddress(address) {
  if (!address || typeof address !== 'string') {
    return '';
  }
  
  let normalized = address.trim().toLowerCase();
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Standardize common abbreviations
  const abbreviations = {
    'street': 'st',
    'avenue': 'ave',
    'boulevard': 'blvd',
    'drive': 'dr',
    'road': 'rd',
    'lane': 'ln',
    'court': 'ct',
    'circle': 'cir',
    'place': 'pl',
    'terrace': 'ter',
    'parkway': 'pkwy',
    'highway': 'hwy',
    'north': 'n',
    'south': 's',
    'east': 'e',
    'west': 'w',
    'northeast': 'ne',
    'northwest': 'nw',
    'southeast': 'se',
    'southwest': 'sw',
    'apartment': 'apt',
    'unit': 'unit',
    'suite': 'ste'
  };
  
  // Apply abbreviations (both directions)
  for (const [full, abbrev] of Object.entries(abbreviations)) {
    // Replace full word with abbreviation
    normalized = normalized.replace(new RegExp(`\\b${full}\\b`, 'g'), abbrev);
    // Also handle the reverse (abbreviation to full word)
    normalized = normalized.replace(new RegExp(`\\b${abbrev}\\.?\\b`, 'g'), abbrev);
  }
  
  // Remove common punctuation
  normalized = normalized.replace(/[.,#]/g, '');
  
  // Standardize apartment/unit notation
  normalized = normalized.replace(/\b(apt|apartment|unit|ste|suite)\s*#?\s*(\w+)/g, 'unit $2');
  
  // Remove extra spaces again
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  if (!str1 || !str2) return Math.max(str1?.length || 0, str2?.length || 0);
  
  const matrix = [];
  
  // Initialize first row and column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two addresses
 * @param {string} address1 - First address
 * @param {string} address2 - Second address
 * @returns {number} Similarity score (0.0 to 1.0)
 */
function calculateAddressSimilarity(address1, address2) {
  if (!address1 || !address2) return 0;
  
  const norm1 = normalizeAddress(address1);
  const norm2 = normalizeAddress(address2);
  
  if (norm1 === norm2) return 1.0;
  
  const maxLength = Math.max(norm1.length, norm2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(norm1, norm2);
  return 1 - (distance / maxLength);
}

/**
 * Calculate Haversine distance between two coordinates
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Find matching properties using comprehensive evaluation
 * @param {Object} targetProperty - Property to match
 * @param {Array} candidateProperties - Array of potential matches
 * @param {Object} config - Matching configuration
 * @returns {Array} Array of matches with scores
 */
function findMatches(targetProperty, candidateProperties, config) {
  const matches = [];
  
  const targetAddress = normalizeAddress(targetProperty.address);
  const targetLat = parseFloat(targetProperty.lat);
  const targetLon = parseFloat(targetProperty.lon);
  
  // Validate target coordinates
  const hasTargetCoords = validateCoordinates(targetLat, targetLon);
  
  for (const candidate of candidateProperties) {
    const candidateAddress = normalizeAddress(candidate.address);
    const candidateLat = parseFloat(candidate.lat);
    const candidateLon = parseFloat(candidate.lon);
    
    // Validate candidate coordinates
    const hasCandidateCoords = validateCoordinates(candidateLat, candidateLon);
    
    // Skip if no address AND no coordinates
    if (!candidateAddress && !hasCandidateCoords) {
      continue;
    }
    
    const match = {
      candidate,
      scores: {},
      overall_score: 0,
      matching_method: 'none',
      confidence: 0,
      distance_meters: null
    };
    
    // ALWAYS evaluate both address and coordinates for comprehensive matching
    
    // 1. Address evaluation
    let addressScore = 0;
    let addressMethod = 'none';
    
    if (targetAddress && candidateAddress) {
      // Exact address match
      if (targetAddress === candidateAddress) {
        addressScore = 1.0;
        addressMethod = 'exact';
        match.scores.address_exact = 1.0;
      }
      // Fuzzy address match
      else if (config.enable_fuzzy_matching) {
        const similarity = calculateAddressSimilarity(targetAddress, candidateAddress);
        match.scores.address_similarity = similarity;
        if (similarity >= config.address_fuzzy_threshold) {
          addressScore = similarity;
          addressMethod = 'fuzzy';
        }
      }
    }
    
    // 2. Coordinate evaluation
    let coordinateScore = 0;
    let distance = Infinity;
    
    if (hasTargetCoords && hasCandidateCoords) {
      distance = calculateDistance(targetLat, targetLon, candidateLat, candidateLon);
      match.distance_meters = distance;
      match.scores.coordinate_distance = distance;
      
      // Calculate coordinate similarity score
      if (distance <= config.max_coordinate_distance) {
        coordinateScore = Math.max(0, 1 - (distance / config.max_coordinate_distance));
        match.scores.coordinate_similarity = coordinateScore;
      }
    }
    
    // 3. Comprehensive matching decision with multiple tiers
    let shouldMatch = false;
    let matchingMethod = 'none';
    let confidence = 0;
    
    // Tier 1: Very close coordinates (override any address differences)
    if (distance <= 10) {
      shouldMatch = true;
      matchingMethod = 'coordinates_exact';
      confidence = 0.95;
      match.overall_score = 0.95;
    }
    // Tier 2: Close coordinates with any address similarity
    else if (distance <= config.coordinate_tolerance_meters && addressScore > 0) {
      shouldMatch = true;
      matchingMethod = 'hybrid';
      confidence = Math.max(addressScore, coordinateScore);
      match.overall_score = (addressScore * 0.6) + (coordinateScore * 0.4);
    }
    // Tier 3: Exact address match with coordinate validation
    else if (addressScore >= 1.0) {
      if (distance <= 200 || !hasTargetCoords || !hasCandidateCoords) {
        shouldMatch = true;
        matchingMethod = 'address_exact';
        confidence = addressScore;
        match.overall_score = addressScore;
      } else {
        // Exact address but coordinates too far - suspicious, lower confidence
        shouldMatch = true;
        matchingMethod = 'address_exact_suspicious';
        confidence = 0.7;
        match.overall_score = 0.7;
      }
    }
    // Tier 4: Good fuzzy address match with reasonable coordinates
    else if (addressScore >= config.address_fuzzy_threshold) {
      if (distance <= 200 || !hasTargetCoords || !hasCandidateCoords) {
        shouldMatch = true;
        matchingMethod = 'address_fuzzy';
        confidence = addressScore;
        match.overall_score = addressScore;
      }
    }
    // Tier 5: Close coordinates only (no good address match)
    else if (distance <= config.coordinate_tolerance_meters && coordinateScore >= 0.8) {
      shouldMatch = true;
      matchingMethod = 'coordinates';
      confidence = coordinateScore;
      match.overall_score = coordinateScore;
    }
    
    // Apply minimum confidence threshold
    if (shouldMatch && match.overall_score >= config.min_confidence_score) {
      match.matching_method = matchingMethod;
      match.confidence = confidence;
      matches.push(match);
    }
  }
  
  // Sort by overall score (best matches first)
  matches.sort((a, b) => b.overall_score - a.overall_score);
  
  return matches;
}

/**
 * Find the best match for a property
 * @param {Object} targetProperty - Property to match
 * @param {Array} candidateProperties - Array of potential matches
 * @param {Object} config - Matching configuration
 * @returns {Object|null} Best match or null if no good match found
 */
function findBestMatch(targetProperty, candidateProperties, config) {
  const matches = findMatches(targetProperty, candidateProperties, config);
  
  if (matches.length === 0) {
    return null;
  }
  
  const bestMatch = matches[0];
  
  // Additional validation for best match
  if (bestMatch.overall_score < config.min_confidence_score) {
    return null;
  }
  
  return bestMatch;
}

/**
 * Extract address components for better matching
 * @param {string} address - Full address
 * @returns {Object} Address components
 */
function extractAddressComponents(address) {
  if (!address) return {};
  
  const normalized = normalizeAddress(address);
  const parts = normalized.split(' ');
  
  const components = {
    full: normalized,
    street_number: '',
    street_name: '',
    unit: ''
  };
  
  // Try to extract street number (first numeric part)
  const numberMatch = normalized.match(/^(\d+[a-z]?)\s+/);
  if (numberMatch) {
    components.street_number = numberMatch[1];
  }
  
  // Extract unit information
  const unitMatch = normalized.match(/\bunit\s+(\w+)/);
  if (unitMatch) {
    components.unit = unitMatch[1];
  }
  
  // Extract street name (everything between number and unit/end)
  let streetName = normalized;
  if (components.street_number) {
    streetName = streetName.replace(new RegExp(`^${components.street_number}\\s+`), '');
  }
  if (components.unit) {
    streetName = streetName.replace(new RegExp(`\\s+unit\\s+${components.unit}.*$`), '');
  }
  components.street_name = streetName.trim();
  
  return components;
}

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if coordinates are valid
 */
function validateCoordinates(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  
  return !isNaN(latitude) && !isNaN(longitude) &&
         latitude >= -90 && latitude <= 90 &&
         longitude >= -180 && longitude <= 180;
}

/**
 * Generate matching report for debugging
 * @param {Object} targetProperty - Property that was matched
 * @param {Array} matches - All matches found
 * @param {Object} config - Configuration used
 * @returns {Object} Detailed matching report
 */
function generateMatchingReport(targetProperty, matches, config) {
  return {
    target: {
      address: targetProperty.address,
      normalized_address: normalizeAddress(targetProperty.address),
      coordinates: {
        lat: targetProperty.lat,
        lon: targetProperty.lon,
        valid: validateCoordinates(targetProperty.lat, targetProperty.lon)
      }
    },
    config_used: config,
    total_candidates: matches.length,
    matches: matches.map(match => ({
      candidate_id: match.candidate.id || match.candidate.zillow_id || match.candidate.redfin_id || match.candidate.realtor_id,
      candidate_address: match.candidate.address,
      matching_method: match.matching_method,
      confidence: match.confidence,
      overall_score: match.overall_score,
      scores: match.scores
    })),
    best_match: matches.length > 0 ? {
      candidate_id: matches[0].candidate.id || matches[0].candidate.zillow_id || matches[0].candidate.redfin_id || matches[0].candidate.realtor_id,
      confidence: matches[0].confidence,
      method: matches[0].matching_method
    } : null
  };
}

module.exports = {
  normalizeAddress,
  calculateAddressSimilarity,
  calculateDistance,
  findMatches,
  findBestMatch,
  extractAddressComponents,
  validateCoordinates,
  generateMatchingReport,
  levenshteinDistance
};
