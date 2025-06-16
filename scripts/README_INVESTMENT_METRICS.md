# Investment Metrics Calculation

This document describes the investment metrics calculation system that analyzes merged property listings to determine their investment potential based on the Zillow Scraper POC Section 4 formulas.

## Overview

The investment metrics calculation is the final step in the daily workflow, running after all data has been collected, merged, and zip code medians have been calculated. It adds 9 key investment metrics to each merged listing to enable rapid deal evaluation.

## Investment Metrics Calculated

Based on the Zillow Scraper POC Section 4, the following metrics are calculated for each property:

### 1. Gross Income

- **Formula**: `marketRent × 12`
- **Description**: Annual gross rental income
- **Column**: `gross_income`

### 2. Net Operating Income (NOI)

- **Formula**: `Gross Income × 0.55` (assumes 45% expense ratio)
- **Description**: Annual net operating income after expenses
- **Column**: `noi`

### 3. Cap Rate

- **Formula**: `NOI ÷ listPrice`
- **Description**: Capitalization rate - key metric for investment yield
- **Column**: `cap_rate`

### 4. Expected Cash Flow (Annual)

- **Formula**: `NOI` (same as NOI for all-cash purchase)
- **Description**: Expected annual cash flow
- **Column**: `expected_cash_flow_annual`

### 5. Expected Cash Flow (Monthly)

- **Formula**: `NOI ÷ 12`
- **Description**: Expected monthly cash flow
- **Column**: `expected_cash_flow_monthly`

### 6. Cash-on-Cash Return

- **Formula**: `NOI ÷ listPrice` (same as cap rate for all-cash)
- **Description**: Cash-on-cash return for all-cash purchase
- **Column**: `cash_on_cash_return`

### 7. Gross Rent Multiplier (GRM)

- **Formula**: `listPrice ÷ Gross Income`
- **Description**: How many years of gross rent to pay for the property
- **Column**: `grm`

### 8. Instant Equity vs Median

- **Formula**: `medianZestimate - listPrice`
- **Description**: Built-in equity compared to median Zestimate for similar properties
- **Column**: `instant_equity_vs_median`

### 9. Equity vs Zestimate

- **Formula**: `zestimate - listPrice`
- **Description**: Built-in equity compared to Zestimate
- **Column**: `equity_vs_zestimate`

## Data Sources and Fallback Logic

The calculation uses a smart fallback system to ensure maximum data coverage:

### Market Rent

- **Source**: `zip.median_market_rent_{bedrooms}br`
- **Logic**: Always uses zip median data by bedroom count

### List Price

- **Primary**: `merged_listing.price`
- **Fallback**: `zip.median_zestimate_{bedrooms}br`

### Median Zestimate (for Instant Equity)

- **Source**: `zip.median_zestimate_{bedrooms}br`
- **Logic**: Always uses zip median data by bedroom count for instant equity calculation

### Zestimate

- **Primary**: `merged_listing.zestimate`
- **Fallback**: `zip.median_zestimate_{bedrooms}br`

## Bedroom Category Mapping

Properties are categorized by bedroom count for zip median lookups:

- **2 bedrooms** → `2br`
- **3 bedrooms** → `3br`
- **4 bedrooms** → `4br`
- **5 bedrooms** → `5br`
- **6+ bedrooms** → `6plus_br`

Properties with 0 or 1 bedrooms are skipped as they don't fit typical investment criteria.

## Database Schema

### New Columns Added to merged_listing

```sql
-- Investment calculation columns
gross_income DECIMAL(12,2)                    -- Annual gross rental income
noi DECIMAL(12,2)                            -- Net Operating Income
cap_rate DECIMAL(5,4)                        -- Capitalization Rate
expected_cash_flow_annual DECIMAL(12,2)      -- Expected annual cash flow
expected_cash_flow_monthly DECIMAL(12,2)     -- Expected monthly cash flow
cash_on_cash_return DECIMAL(5,4)             -- Cash-on-Cash Return
grm DECIMAL(8,2)                             -- Gross Rent Multiplier
instant_equity_vs_median DECIMAL(12,2)       -- Instant equity vs median
equity_vs_zestimate DECIMAL(12,2)            -- Equity vs Zestimate
investment_metrics_updated_at TIMESTAMPTZ    -- Calculation timestamp
```

### Performance Indexes

The following indexes are created for efficient querying:

- `idx_merged_listing_cap_rate` - For sorting by cap rate (descending)
- `idx_merged_listing_grm` - For sorting by GRM (ascending)
- `idx_merged_listing_cash_flow` - For sorting by cash flow (descending)
- `idx_merged_listing_equity_median` - For sorting by equity vs median (descending)
- `idx_merged_listing_equity_zestimate` - For sorting by equity vs Zestimate (descending)
- `idx_merged_listing_investment_ranking` - Composite index for ranking (cap_rate DESC, instant_equity_vs_median DESC)

## Usage

### Running the Calculation

The investment metrics calculation runs automatically as part of the daily workflow, but can also be run manually:

```bash
# Run investment metrics calculation
npm run calculate-investment-metrics
```

### Workflow Integration

The calculation runs as the final step in the daily workflow:

1. Data collection (Zillow, Redfin, Realtor, RentCast, ATTOM)
2. Property linking
3. Zip median calculations
4. Data merging
5. Merge statistics
6. **Investment metrics calculation** ← Final step
7. Status report

### Querying Investment Data

Example queries for finding attractive investment properties:

```sql
-- Top properties by cap rate
SELECT address, price, cap_rate, grm, instant_equity_vs_median
FROM merged_listing
WHERE cap_rate IS NOT NULL
ORDER BY cap_rate DESC
LIMIT 10;

-- Properties with high equity potential
SELECT address, price, instant_equity_vs_median, equity_vs_zestimate
FROM merged_listing
WHERE instant_equity_vs_median > 50000
ORDER BY instant_equity_vs_median DESC;

-- Best overall deals (high cap rate + positive equity)
SELECT address, price, cap_rate, grm, instant_equity_vs_median
FROM merged_listing
WHERE cap_rate > 0.10
  AND instant_equity_vs_median > 0
ORDER BY cap_rate DESC, instant_equity_vs_median DESC;
```

## Validation and Quality Control

### Data Validation

The calculation includes several validation steps:

1. **Bedroom Count**: Must be 2-6+ bedrooms
2. **Zip Code**: Must exist in zip median data
3. **Market Rent**: Must be positive value
4. **List Price**: Must be positive value
5. **Reasonable Results**: Cap rates and GRM values are sanity-checked

### Error Handling

Properties are skipped (not failed) when:

- Invalid bedroom count (0, 1, or null)
- No zip median data available
- Missing market rent data
- Missing or invalid list price data

### Logging and Monitoring

The calculation provides detailed logging:

- Progress updates every 50 properties
- Detailed calculation results for each property
- Summary statistics at completion
- Error tracking and reporting

## Performance Considerations

### Optimization Features

1. **Batch Processing**: Processes all listings in a single database connection
2. **Efficient Queries**: Uses indexed lookups for zip median data
3. **Smart Caching**: Reuses zip median data for properties in the same zip/bedroom category
4. **Minimal Database Writes**: Single update per property with all calculated metrics

### Expected Performance

- **Processing Speed**: ~100-200 properties per minute
- **Database Impact**: Minimal - single SELECT per zip/bedroom combination, single UPDATE per property
- **Memory Usage**: Low - processes one property at a time

## Troubleshooting

### Common Issues

1. **No zip median data**: Ensure bedroom-specific median calculations have run
2. **Missing market rent**: Check if zip median data includes rent estimates
3. **Invalid calculations**: Verify input data quality and formula implementation

### Debug Mode

For detailed debugging, the script logs:

- Input values for each calculation
- Fallback logic decisions
- Calculated metric values
- Skip reasons for properties that can't be processed

## Future Enhancements

### Planned Improvements

1. **Financing Scenarios**: Add calculations for leveraged purchases
2. **Market Adjustments**: Factor in local market conditions
3. **Risk Metrics**: Add volatility and risk assessment
4. **Comparative Analysis**: Rank properties within market segments
5. **Historical Tracking**: Track metric changes over time

### Integration Opportunities

1. **Telegram Bot**: Use metrics for automated deal alerts
2. **Web Dashboard**: Display ranked investment opportunities
3. **API Endpoints**: Expose metrics for external applications
4. **Reporting**: Generate investment analysis reports

## Files

- `scripts/add_investment_metrics_columns.sql` - Database schema changes
- `scripts/calculate-investment-metrics.js` - Main calculation script
- `scripts/README_INVESTMENT_METRICS.md` - This documentation
- `.github/workflows/daily-workflow.yml` - Workflow integration

## Related Documentation

- [Merged Listings README](README_MERGED_LISTINGS.md) - Data merging process
- [Bedroom Medians README](README_BEDROOM_MEDIANS.md) - Zip median calculations
- [Zillow Scraper POC](../Zillow%20Scraper%20POC.pdf) - Original formulas and methodology
