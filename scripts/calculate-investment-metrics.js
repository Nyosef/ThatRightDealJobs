/**
 * Calculate Investment Metrics for Merged Listings
 * Based on Zillow Scraper POC Section 4 formulas
 * 
 * This script calculates investment metrics for all merged listings using:
 * 1. Data from merged_listing table (price, zestimate, bedrooms, zip5)
 * 2. Fallback to zip median data by bedroom count when listing data is missing
 * 3. POC formulas for all 9 investment metrics
 */

const { db } = require('../index');

/**
 * Get bedroom category for zip median lookup
 * @param {number} bedrooms - Number of bedrooms
 * @returns {string|null} Bedroom category (2br, 3br, 4br, 5br, 6plus_br) or null
 */
function getBedroomCategory(bedrooms) {
  if (bedrooms === null || bedrooms === undefined) {
    return null;
  }
  
  const bedroomCount = parseInt(bedrooms);
  
  if (bedroomCount >= 6) {
    return '6plus_br';
  } else if (bedroomCount >= 2 && bedroomCount <= 5) {
    return `${bedroomCount}br`;
  } else {
    // Skip properties with 0, 1 bedrooms or invalid values
    return null;
  }
}

/**
 * Get zip median data for a specific zip code and bedroom category
 * @param {string} zipCode - 5-digit ZIP code
 * @param {string} bedroomCategory - Bedroom category (2br, 3br, etc.)
 * @returns {Promise<Object|null>} Zip median data or null if not found
 */
async function getZipMedianData(zipCode, bedroomCategory) {
  const supabase = db.getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('zip')
      .select(`
        median_market_rent_${bedroomCategory},
        median_zestimate_${bedroomCategory},
        median_last_sold_price_${bedroomCategory}
      `)
      .eq('zip5', zipCode)
      .maybeSingle();
    
    if (error) {
      console.warn(`Error fetching zip median data for ${zipCode}:`, error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn(`Error fetching zip median data for ${zipCode}:`, error.message);
    return null;
  }
}

/**
 * Calculate investment metrics for a single merged listing
 * @param {Object} listing - Merged listing data
 * @returns {Promise<Object|null>} Calculated investment metrics or null if calculation not possible
 */
async function calculateInvestmentMetrics(listing) {
  try {
    // Get bedroom category
    const bedroomCategory = getBedroomCategory(listing.bedrooms);
    if (!bedroomCategory) {
      console.log(`Skipping listing ${listing.the_real_deal_id}: Invalid bedroom count (${listing.bedrooms})`);
      return null;
    }
    
    // Get zip median data
    const zipMedians = await getZipMedianData(listing.zip5, bedroomCategory);
    if (!zipMedians) {
      console.log(`Skipping listing ${listing.the_real_deal_id}: No zip median data for ${listing.zip5}`);
      return null;
    }
    
    // Resolve values with fallback logic
    const marketRent = zipMedians[`median_market_rent_${bedroomCategory}`];
    const listPrice = listing.price || zipMedians[`median_zestimate_${bedroomCategory}`];
    const medianSalePrice = zipMedians[`median_last_sold_price_${bedroomCategory}`];
    const zestimate = listing.zestimate || zipMedians[`median_zestimate_${bedroomCategory}`];
    
    // Validate required values
    if (!marketRent || marketRent <= 0) {
      console.log(`Skipping listing ${listing.the_real_deal_id}: No valid market rent data`);
      return null;
    }
    
    if (!listPrice || listPrice <= 0) {
      console.log(`Skipping listing ${listing.the_real_deal_id}: No valid list price data`);
      return null;
    }
    
    // Calculate investment metrics using POC formulas
    const grossIncome = marketRent * 12;
    const noi = grossIncome * 0.55; // (1 - 0.45 expense ratio)
    const capRate = noi / listPrice;
    const expectedCashFlowAnnual = noi; // Same as NOI for all-cash purchase
    const expectedCashFlowMonthly = noi / 12;
    const cashOnCashReturn = noi / listPrice; // Same as cap rate for all-cash
    const grm = listPrice / grossIncome;
    const instantEquityVsMedian = medianSalePrice ? (medianSalePrice - listPrice) : null;
    const equityVsZestimate = zestimate ? (zestimate - listPrice) : null;
    
    // Log calculation details for debugging
    console.log(`Calculated metrics for listing ${listing.the_real_deal_id} (${listing.address}):`);
    console.log(`  Market Rent: $${marketRent.toLocaleString()}/month`);
    console.log(`  List Price: $${listPrice.toLocaleString()}`);
    console.log(`  Gross Income: $${grossIncome.toLocaleString()}`);
    console.log(`  NOI: $${noi.toLocaleString()}`);
    console.log(`  Cap Rate: ${(capRate * 100).toFixed(2)}%`);
    console.log(`  GRM: ${grm.toFixed(2)}`);
    if (instantEquityVsMedian !== null) {
      console.log(`  Instant Equity vs Median: $${instantEquityVsMedian.toLocaleString()}`);
    }
    if (equityVsZestimate !== null) {
      console.log(`  Equity vs Zestimate: $${equityVsZestimate.toLocaleString()}`);
    }
    
    return {
      gross_income: Math.round(grossIncome),
      noi: Math.round(noi),
      cap_rate: Math.round(capRate * 10000) / 10000, // Round to 4 decimal places
      expected_cash_flow_annual: Math.round(expectedCashFlowAnnual),
      expected_cash_flow_monthly: Math.round(expectedCashFlowMonthly),
      cash_on_cash_return: Math.round(cashOnCashReturn * 10000) / 10000, // Round to 4 decimal places
      grm: Math.round(grm * 100) / 100, // Round to 2 decimal places
      instant_equity_vs_median: instantEquityVsMedian ? Math.round(instantEquityVsMedian) : null,
      equity_vs_zestimate: equityVsZestimate ? Math.round(equityVsZestimate) : null,
      investment_metrics_updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error calculating metrics for listing ${listing.the_real_deal_id}:`, error.message);
    return null;
  }
}

/**
 * Update merged listing with calculated investment metrics
 * @param {number} listingId - The real deal ID
 * @param {Object} metrics - Calculated investment metrics
 * @returns {Promise<boolean>} Success status
 */
async function updateListingMetrics(listingId, metrics) {
  const supabase = db.getSupabaseClient();
  
  try {
    const { error } = await supabase
      .from('merged_listing')
      .update(metrics)
      .eq('the_real_deal_id', listingId);
    
    if (error) {
      console.error(`Error updating metrics for listing ${listingId}:`, error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating metrics for listing ${listingId}:`, error.message);
    return false;
  }
}

/**
 * Get all merged listings that need investment metrics calculation
 * @returns {Promise<Array>} Array of merged listings
 */
async function getAllMergedListings() {
  const supabase = db.getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('merged_listing')
      .select('the_real_deal_id, address, price, zestimate, bedrooms, zip5')
      .not('bedrooms', 'is', null)
      .not('zip5', 'is', null);
    
    if (error) {
      throw new Error(`Error fetching merged listings: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching merged listings:', error.message);
    throw error;
  }
}

/**
 * Main function to calculate investment metrics for all merged listings
 */
async function calculateAllInvestmentMetrics() {
  const startTime = Date.now();
  const results = {
    total_processed: 0,
    successful_calculations: 0,
    skipped_invalid_bedrooms: 0,
    skipped_no_zip_data: 0,
    skipped_no_rent_data: 0,
    skipped_no_price_data: 0,
    update_errors: 0,
    processing_time_seconds: 0
  };
  
  try {
    console.log('Starting investment metrics calculation for all merged listings...');
    
    // Get all merged listings
    const listings = await getAllMergedListings();
    console.log(`Found ${listings.length} merged listings to process`);
    
    if (listings.length === 0) {
      console.log('No merged listings found. Exiting.');
      return results;
    }
    
    // Process each listing
    for (const listing of listings) {
      results.total_processed++;
      
      try {
        // Calculate investment metrics
        const metrics = await calculateInvestmentMetrics(listing);
        
        if (metrics) {
          // Update the listing with calculated metrics
          const updateSuccess = await updateListingMetrics(listing.the_real_deal_id, metrics);
          
          if (updateSuccess) {
            results.successful_calculations++;
            console.log(`✅ Updated metrics for listing ${listing.the_real_deal_id}`);
          } else {
            results.update_errors++;
            console.log(`❌ Failed to update metrics for listing ${listing.the_real_deal_id}`);
          }
        } else {
          // Metrics calculation was skipped - reason already logged in calculateInvestmentMetrics
          if (!getBedroomCategory(listing.bedrooms)) {
            results.skipped_invalid_bedrooms++;
          } else {
            // Could be no zip data, no rent data, or no price data
            results.skipped_no_zip_data++;
          }
        }
        
        // Log progress every 50 listings
        if (results.total_processed % 50 === 0) {
          console.log(`Progress: ${results.total_processed}/${listings.length} processed, ${results.successful_calculations} successful`);
        }
        
      } catch (error) {
        console.error(`Error processing listing ${listing.the_real_deal_id}:`, error.message);
        results.update_errors++;
      }
    }
    
    // Calculate processing time
    results.processing_time_seconds = Math.round((Date.now() - startTime) / 1000);
    
    // Log final results
    console.log('\n📊 Investment Metrics Calculation Results:');
    console.log(`Total Processed: ${results.total_processed}`);
    console.log(`Successful Calculations: ${results.successful_calculations}`);
    console.log(`Skipped (Invalid Bedrooms): ${results.skipped_invalid_bedrooms}`);
    console.log(`Skipped (No Zip Data): ${results.skipped_no_zip_data}`);
    console.log(`Update Errors: ${results.update_errors}`);
    console.log(`Processing Time: ${results.processing_time_seconds} seconds`);
    
    const successRate = results.total_processed > 0 ? 
      Math.round((results.successful_calculations / results.total_processed) * 100) : 0;
    console.log(`Success Rate: ${successRate}%`);
    
    return results;
    
  } catch (error) {
    console.error('Error in investment metrics calculation:', error.message);
    results.processing_time_seconds = Math.round((Date.now() - startTime) / 1000);
    throw error;
  }
}

// Run the calculation if this script is executed directly
if (require.main === module) {
  calculateAllInvestmentMetrics()
    .then((results) => {
      console.log('\n✅ Investment metrics calculation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Investment metrics calculation failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  calculateAllInvestmentMetrics,
  calculateInvestmentMetrics,
  getBedroomCategory,
  getZipMedianData
};
