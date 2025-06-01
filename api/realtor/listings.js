/**
 * Realtor.com Listings API
 * Handles listing search and data processing operations
 */

const RealtorApiClient = require('./client');

class RealtorListingsApi {
  constructor() {
    this.client = new RealtorApiClient();
  }
  
  /**
   * Search for listings by zip code
   * @param {string} zipCode - Zip code to search
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Processed search results
   */
  async searchListingsByZipCode(zipCode, options = {}) {
    try {
      console.log(`Searching Realtor listings for zip code: ${zipCode}`);
      
      // Call the Apify scraper
      const rawResults = await this.client.searchByZipCode(zipCode, options);
      
      // Process and validate the results
      const processedResults = this.processSearchResults(rawResults, zipCode);
      
      console.log(`Processed ${processedResults.validListings} valid listings out of ${processedResults.totalItems} total items`);
      
      return processedResults;
    } catch (error) {
      console.error(`Error searching Realtor listings for zip code ${zipCode}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Process raw search results from Apify
   * @param {Object} rawResults - Raw results from Apify scraper
   * @param {string} zipCode - Zip code being processed
   * @returns {Object} Processed results
   */
  processSearchResults(rawResults, zipCode) {
    const { items, runId, status, itemCount } = rawResults;
    
    const processedListings = [];
    let validListings = 0;
    let skippedListings = 0;
    
    for (const item of items) {
      try {
        // Validate that this is a valid listing
        if (!this.isValidListing(item)) {
          console.warn(`Skipping invalid listing:`, JSON.stringify(item, null, 2));
          skippedListings++;
          continue;
        }
        
        // Process the listing data
        const processedListing = this.processListingData(item, zipCode);
        processedListings.push(processedListing);
        validListings++;
        
      } catch (error) {
        console.error(`Error processing listing:`, error.message);
        console.error(`Problematic listing data:`, JSON.stringify(item, null, 2));
        skippedListings++;
      }
    }
    
    return {
      runId,
      status,
      totalItems: itemCount,
      validListings,
      skippedListings,
      listings: processedListings
    };
  }
  
  /**
   * Validate if an item is a valid listing
   * @param {Object} item - Raw listing item
   * @returns {boolean} True if valid listing
   */
  isValidListing(item) {
    // Must have an ID
    if (!item.id) {
      return false;
    }
    
    // Must have basic property information
    if (!item.address && !item.url) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Process individual listing data
   * @param {Object} listing - Raw listing data
   * @param {string} zipCode - Zip code being processed
   * @returns {Object} Processed listing data
   */
  processListingData(listing, zipCode) {
    // Extract basic information
    const processedListing = {
      realtor_id: listing.id,
      url: listing.url,
      status: listing.status,
      zip5: zipCode,
      
      // Pricing information
      list_price: listing.listPrice,
      last_sold_price: listing.lastSoldPrice,
      
      // Property details
      beds: listing.beds,
      baths: listing.baths,
      baths_full: listing.baths_full,
      baths_half: listing.baths_half,
      baths_3qtr: listing.baths_3qtr,
      baths_total: listing.baths_total,
      baths_max: listing.baths_max,
      baths_min: listing.baths_min,
      baths_full_calc: listing.baths_full_calc,
      baths_partial_calc: listing.baths_partial_calc,
      beds_max: listing.beds_max,
      beds_min: listing.beds_min,
      sqft: listing.sqft,
      sqft_max: listing.sqft_max,
      sqft_min: listing.sqft_min,
      lot_sqft: listing.lot_sqft,
      year_built: listing.year_built,
      year_renovated: listing.year_renovated,
      stories: listing.stories,
      rooms: listing.rooms,
      units: listing.units,
      property_type: listing.type,
      sub_type: listing.sub_type,
      
      // Property features
      construction: listing.construction,
      cooling: listing.cooling,
      exterior: listing.exterior,
      fireplace: listing.fireplace,
      garage: listing.garage,
      garage_max: listing.garage_max,
      garage_min: listing.garage_min,
      garage_type: listing.garage_type,
      heating: listing.heating,
      logo: listing.logo,
      pool: listing.pool,
      roofing: listing.roofing,
      styles: listing.styles,
      zoning: listing.zoning,
      name: listing.name,
      text: listing.text,
      
      // Dates
      sold_on: listing.soldOn ? new Date(listing.soldOn).toISOString().split('T')[0] : null,
      last_updated: new Date().toISOString().split('T')[0],
      
      // Location
      latitude: listing.coordinates?.latitude,
      longitude: listing.coordinates?.longitude,
      street: listing.address?.street,
      locality: listing.address?.locality,
      region: listing.address?.region,
      postal_code: listing.address?.postalCode,
      neighborhood: listing.neighborhood,
      
      // Complex data as JSONB
      coordinates: listing.coordinates,
      address_full: listing.address,
      nearby_schools: listing.nearbySchools,
      local_risk_data: listing.local,
      price_history: listing.history,
      tax_history: listing.taxHistory,
      floorplans: listing.floorplans,
      photos: listing.photos,
      
      // Media
      has_photos: listing.photos && listing.photos.length > 0,
      realtor_url: listing.url
    };
    
    // Calculate price per sqft if we have both values
    if (processedListing.last_sold_price && processedListing.sqft && processedListing.sqft > 0) {
      processedListing.price_per_sqft = Math.round((processedListing.last_sold_price / processedListing.sqft) * 100) / 100;
    }
    
    // Extract risk assessment data
    if (listing.local) {
      // Flood risk
      if (listing.local.flood) {
        processedListing.flood_factor_score = listing.local.flood.flood_factor_score;
        processedListing.flood_factor_severity = listing.local.flood.flood_factor_severity;
        processedListing.flood_environmental_risk = listing.local.flood.environmental_risk;
        processedListing.flood_trend_direction = listing.local.flood.trend_direction;
        processedListing.flood_insurance_requirement = listing.local.flood.insurance_requirement;
      }
      
      // Fire risk
      if (listing.local.wildfire) {
        processedListing.fire_factor_score = listing.local.wildfire.fire_factor_score;
        processedListing.fire_factor_severity = listing.local.wildfire.fire_factor_severity;
        processedListing.fire_cumulative_30 = listing.local.wildfire.fire_cumulative_30;
      }
      
      // Noise
      if (listing.local.noise) {
        processedListing.noise_score = listing.local.noise.score;
      }
    }
    
    // Extract latest tax information
    if (listing.taxHistory && listing.taxHistory.length > 0) {
      // Sort by year descending to get the latest
      const sortedTaxHistory = listing.taxHistory.sort((a, b) => b.year - a.year);
      const latestTax = sortedTaxHistory[0];
      
      processedListing.latest_tax_year = latestTax.year;
      processedListing.latest_tax_amount = latestTax.tax;
      
      if (latestTax.assessment) {
        processedListing.latest_assessed_total = latestTax.assessment.total;
        processedListing.latest_assessed_building = latestTax.assessment.building;
        processedListing.latest_assessed_land = latestTax.assessment.land;
      }
      
      if (latestTax.market) {
        processedListing.latest_market_total = latestTax.market.total;
        processedListing.latest_market_building = latestTax.market.building;
        processedListing.latest_market_land = latestTax.market.land;
      }
    }
    
    // Extract school information
    if (listing.nearbySchools && listing.nearbySchools.schools) {
      const schools = listing.nearbySchools.schools;
      
      // Find nearest schools by education level
      const elementary = schools.filter(s => s.education_levels.includes('elementary')).sort((a, b) => a.distance_in_miles - b.distance_in_miles)[0];
      const middle = schools.filter(s => s.education_levels.includes('middle')).sort((a, b) => a.distance_in_miles - b.distance_in_miles)[0];
      const high = schools.filter(s => s.education_levels.includes('high')).sort((a, b) => a.distance_in_miles - b.distance_in_miles)[0];
      
      if (elementary) {
        processedListing.nearest_elementary_rating = elementary.rating;
        processedListing.nearest_elementary_distance = elementary.distance_in_miles;
      }
      
      if (middle) {
        processedListing.nearest_middle_rating = middle.rating;
        processedListing.nearest_middle_distance = middle.distance_in_miles;
      }
      
      if (high) {
        processedListing.nearest_high_rating = high.rating;
        processedListing.nearest_high_distance = high.distance_in_miles;
      }
    }
    
    return processedListing;
  }
}

module.exports = RealtorListingsApi;
