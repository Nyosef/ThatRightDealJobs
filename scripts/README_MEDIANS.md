# Zip Code Median Calculations

This document describes the median calculation feature that computes median values for Zillow listing data by zip code.

## Overview

The median calculation system processes Zillow listing data and calculates median values for key property metrics, storing the results in the `zip` table. This runs as the final step in the daily workflow to ensure all data is fresh before calculating medians.

## Files Created/Modified

### New Files

- `scripts/final-median-calculations.js` - Main script for calculating medians
- `models/zip-medians.js` - Core logic for median calculations and database operations
- `scripts/add_median_columns_to_zip.sql` - Database migration to add median columns

### Modified Files

- `package.json` - Added npm scripts for median calculations
- `.github/workflows/daily-workflow.yml` - Added median calculation as final step
- `models/index.js` - Added zipMedians module export

## Database Schema Changes

The following columns were added to the `zip` table:

```sql
-- Median columns for Zillow listing data
median_zestimate DECIMAL(12,2)        -- Median Zillow automated valuation
median_last_sold_price DECIMAL(12,2)  -- Median last sold price
median_market_rent DECIMAL(8,2)       -- Median monthly rent estimate
median_bedrooms DECIMAL(3,1)          -- Median number of bedrooms
median_bathrooms DECIMAL(3,1)         -- Median number of bathrooms
median_sqft DECIMAL(8,2)              -- Median square footage
medians_updated_at TIMESTAMPTZ        -- Timestamp of last calculation
```

## Usage

### NPM Scripts

```bash
# Calculate medians for all zip codes with Zillow data
npm run calculate-medians

# Calculate medians for specific zip codes
npm run calculate-medians -- --zip=16146
npm run calculate-medians -- --zip=16146,90210,10001

# View current median statistics
npm run median-stats

# View median statistics for specific zip codes
npm run median-stats -- --zip=16146
```

### Direct Script Execution

```bash
# Calculate medians for all zip codes
node scripts/final-median-calculations.js

# Calculate medians for specific zip codes
node scripts/final-median-calculations.js --zip=16146

# View statistics
node scripts/final-median-calculations.js --stats
```

## How It Works

### 1. Data Collection

- Queries the `zillow_listing` table for all listings in each zip code
- Extracts the target columns: `zestimate`, `last_sold_price`, `market_rent`, `bedrooms`, `bathrooms`, `sqft`

### 2. Median Calculation

- Filters out NULL, undefined, and empty values
- Converts values to numbers and validates them
- Sorts values in ascending order
- Calculates median:
  - For odd number of values: returns middle value
  - For even number of values: returns average of two middle values

### 3. Database Update

- Updates the corresponding zip record with calculated medians
- Sets `medians_updated_at` to current timestamp
- Handles cases where no valid data exists (leaves medians as NULL)

### 4. Error Handling

- Continues processing other zip codes if one fails
- Logs detailed error messages
- Returns comprehensive summary of results

## Workflow Integration

The median calculation runs as the final step in the GitHub Actions daily workflow:

1. ATTOM daily tasks
2. Zillow daily tasks
3. Wait periods
4. RentCast daily tasks
5. Property linking tasks
6. **Median calculations** (NEW - final step)

This ensures that:

- All data is fresh and updated
- Medians reflect the most current state of the data
- The workflow completes with the most comprehensive data analysis

## Example Output

```
=== Starting Final Median Calculations ===
Started at: 2025-05-29T19:30:00.000Z

--- Testing Supabase Connection ---
Successfully connected to Supabase!

Getting all zip codes with Zillow listing data...
Found 1 zip codes with Zillow data: 16146

--- Processing 1 zip codes for median calculations ---

--- Processing zip code: 16146 ---
Calculating medians for zip code 16146...
Processing 25 listings for zip code 16146
Medians calculated for zip code 16146:
  - Zestimate: $185,000
  - Last Sold Price: N/A
  - Market Rent: $1,200
  - Bedrooms: 3
  - Bathrooms: 2
  - Square Feet: 1,450
  - Based on 25 listings
Successfully updated medians for zip code 16146
✓ Successfully processed zip code 16146 (25 listings)

=== Final Median Calculations Summary ===
Total zip codes processed: 1
Successful: 1
Failed: 0
Completed at: 2025-05-29T19:30:15.000Z
```

## Performance Considerations

- Processes zip codes sequentially to avoid memory issues
- Uses efficient SQL queries with proper indexing
- Minimal database round trips per zip code
- Handles large datasets gracefully

## Future Enhancements

Potential improvements for the median calculation system:

1. **Additional Metrics**: Add more statistical measures (mean, standard deviation, quartiles)
2. **Historical Tracking**: Store median history over time
3. **Batch Processing**: Process multiple zip codes in parallel for better performance
4. **Alerting**: Notify when median values change significantly
5. **API Endpoints**: Expose median data through REST API
6. **Visualization**: Create charts and graphs of median trends

## Troubleshooting

### Common Issues

1. **No zip codes found**: Ensure Zillow data exists in the database
2. **Database connection errors**: Check Supabase credentials and connection
3. **Permission errors**: Verify database user has UPDATE permissions on zip table
4. **Memory issues**: Process fewer zip codes at once or increase system memory

### Debugging

Enable detailed logging by running the script directly:

```bash
node scripts/final-median-calculations.js --zip=16146
```

Check the database schema:

```sql
-- Verify median columns exist
\d zip

-- Check current median values
SELECT zip5, median_zestimate, median_market_rent, medians_updated_at
FROM zip
WHERE zip5 = '16146';
```
