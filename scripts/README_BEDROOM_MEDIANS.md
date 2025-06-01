# Bedroom-Specific Median Calculations

This document describes the new bedroom-specific median calculation system that replaces the previous overall median calculations.

## Overview

The system now calculates median values for Zillow listing data grouped by bedroom count, providing more granular insights into property values based on property size.

## Database Schema Changes

### Old Schema (Removed)

- `median_zestimate`
- `median_last_sold_price`
- `median_market_rent`
- `median_bedrooms`
- `median_bathrooms`
- `median_sqft`

### New Schema (Added)

For each bedroom category (2br, 3br, 4br, 5br, 6+br), the following columns are added:

- `median_zestimate_[bedroom]br`
- `median_last_sold_price_[bedroom]br`
- `median_market_rent_[bedroom]br`
- `median_bedrooms_[bedroom]br`
- `median_bathrooms_[bedroom]br`
- `median_sqft_[bedroom]br`

### Bedroom Categories

- **2br**: Properties with exactly 2 bedrooms
- **3br**: Properties with exactly 3 bedrooms
- **4br**: Properties with exactly 4 bedrooms
- **5br**: Properties with exactly 5 bedrooms
- **6+br**: Properties with 6 or more bedrooms

## Files Created/Modified

### Database Migration

- `scripts/migrate_zip_medians_by_bedrooms.sql` - SQL script to update zip table schema

### New Model

- `models/zip-medians-by-bedrooms.js` - New model for bedroom-specific calculations
  - Groups listings by bedroom count
  - Calculates medians for each bedroom category
  - Updates zip table with bedroom-specific values

### Calculation Scripts

- `scripts/bedroom-median-calculations.js` - Main script to run calculations
- `scripts/test-bedroom-medians.js` - Test script to verify functionality
- `scripts/run-migration.js` - Helper script to run database migration

## Usage

### 1. Database Migration

Run the SQL migration in Supabase SQL editor:

```sql
-- Copy and paste contents of scripts/migrate_zip_medians_by_bedrooms.sql
```

### 2. Test the System

```bash
# Using npm script
npm run test-bedroom-medians

# Or directly
node scripts/test-bedroom-medians.js
```

### 3. Run Full Calculations

```bash
# Using npm scripts
npm run calculate-bedroom-medians

# Or directly
node scripts/bedroom-median-calculations.js

# Process specific zip code
node scripts/bedroom-median-calculations.js 12345
```

## Data Processing Logic

### Bedroom Categorization

- Properties with 0-1 bedrooms are excluded from calculations
- Properties with 2-5 bedrooms are grouped individually
- Properties with 6+ bedrooms are grouped together due to low volume

### Median Calculation

- Filters out null, undefined, and non-numeric values
- Sorts values and calculates true median (middle value or average of two middle values)
- Returns null if no valid values exist for a category

### Database Updates

- Updates all bedroom-specific columns for each zip code
- Sets `medians_updated_at` timestamp
- Handles cases where no listings exist for certain bedroom categories

## Example Output

For zip code 12345:

```
2br (14 listings):
  Zestimate: $450,000
  Market Rent: $2,200
  Sqft: 1,100

3br (46 listings):
  Zestimate: $650,000
  Market Rent: $3,100
  Sqft: 1,650

4br (8 listings):
  Zestimate: $850,000
  Market Rent: $4,200
  Sqft: 2,200
```

## Benefits

1. **Granular Analysis**: Compare property values by bedroom count
2. **Market Segmentation**: Understand different market segments within each zip code
3. **Investment Insights**: Better ROI calculations for specific property types
4. **Trend Analysis**: Track how different bedroom categories perform over time

## Integration with Existing System

- The new system is completely separate from the old median calculations
- Existing scripts that reference old median columns will need to be updated
- The `medians_updated_at` timestamp is preserved for tracking updates

## Future Enhancements

- Add minimum sample size requirements (e.g., need at least 3 listings for median calculation)
- Add confidence intervals or standard deviations
- Create API endpoints to query bedroom-specific medians
- Add visualization dashboards for bedroom-specific trends
