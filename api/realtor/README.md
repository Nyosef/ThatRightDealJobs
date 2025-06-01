# Realtor.com API Module

This module provides integration with Realtor.com property data through the Apify `epctex/realtor-scraper` actor.

## Overview

The Realtor.com API module enables searching and retrieving property listings data from Realtor.com, including:

- Property details (beds, baths, sqft, lot size, etc.)
- Pricing information (list price, sold price, price per sqft)
- Risk assessments (flood, fire, noise)
- Tax history and assessments
- School information and ratings
- Property photos and media
- Transaction history

## Features

### Unique Data Points (vs. Zillow/Redfin)

- **Risk Assessment**: Flood, wildfire, and noise risk scores
- **Detailed Tax History**: Complete property tax assessment history
- **School Ratings**: Nearby school information with ratings and distances
- **Insurance Information**: Flood and fire insurance requirements and quotes

## Usage

### Basic Search by Zip Code

```javascript
const { realtor } = require("../api");

// Search for listings in a zip code
const results = await realtor.searchListingsByZipCode("16146");

console.log(`Found ${results.validListings} listings`);
console.log(`Run ID: ${results.runId}`);
```

### Search with Options

```javascript
const results = await realtor.searchListingsByZipCode("16146", {
  maxItems: 50,
  // Additional Apify actor options can be passed here
});
```

### Check Run Status

```javascript
const status = await realtor.getRunStatus(runId);
console.log(`Run status: ${status.status}`);
```

## Data Structure

### Processed Listing Object

```javascript
{
  realtor_id: "1422664517",
  url: "https://www.realtor.com/realestateandhomes-detail/...",
  status: "sold",
  zip5: "16146",

  // Pricing
  list_price: 475000,
  last_sold_price: 485000,
  price_per_sqft: 176.24,

  // Property Details
  beds: 4,
  baths: 3,
  sqft: 2752,
  lot_sqft: 9148,
  year_built: 1975,
  property_type: "single_family",

  // Location
  latitude: 36.110005,
  longitude: -115.077626,
  street: "4368 Seville St",
  locality: "Las Vegas",
  region: "NV",
  postal_code: "89121",

  // Risk Assessment (Unique to Realtor.com)
  flood_factor_score: 1,
  flood_factor_severity: "minimal",
  fire_factor_score: 1,
  fire_factor_severity: "Minimal",
  noise_score: 73,

  // Tax Information
  latest_tax_year: 2021,
  latest_tax_amount: 1176,
  latest_assessed_total: 58739,
  latest_market_total: 167826,

  // School Information
  nearest_elementary_rating: 5,
  nearest_elementary_distance: 0.3,
  nearest_middle_rating: 2,
  nearest_middle_distance: 0.8,
  nearest_high_rating: 3,
  nearest_high_distance: 0.9,

  // Complex Data (JSONB)
  nearby_schools: { /* Full school data */ },
  local_risk_data: { /* Complete risk assessment */ },
  price_history: [ /* Transaction history */ ],
  tax_history: [ /* Complete tax history */ ],
  coordinates: { latitude: 36.110005, longitude: -115.077626 },
  address_full: { /* Complete address object */ },
  photos: [ /* Photo URLs */ ]
}
```

## Configuration

### Environment Variables

```bash
APIFY_API_TOKEN=your_apify_token_here
```

### Apify Actor Settings

The module uses the `epctex/realtor-scraper` actor with these default settings:

- **Mode**: "BUY" (focuses on purchase listings)
- **Proxy**: Apify proxy enabled
- **Max Items**: 100 per zip code
- **Include Floorplans**: false (not needed for BUY mode)

## Error Handling

The module includes comprehensive error handling:

- Invalid listings are skipped with warnings
- Network errors are caught and re-thrown with context
- Data processing errors are logged with problematic data

## Investment Analysis Features

### Risk Assessment

- Flood risk scores (1-10 scale, 1 = minimal)
- Wildfire risk scores and severity levels
- Noise pollution scores
- Insurance requirement information

### Financial Analysis

- Complete tax assessment history
- Market vs. assessed value trends
- Price per square foot calculations
- Transaction history with dates and prices

### Location Intelligence

- School ratings and distances (affects property values)
- Neighborhood risk factors
- Precise coordinates for mapping

## Integration with Database

Processed listings are designed to integrate with the `realtor_listing` table:

- Key fields extracted to dedicated columns for fast queries
- Complex data stored as JSONB for detailed analysis
- Proper indexing for performance
- Automatic timestamp management

## Comparison with Other Sources

| Feature             | Realtor.com      | Zillow       | Redfin |
| ------------------- | ---------------- | ------------ | ------ |
| Risk Assessment     | ✅ Comprehensive | ❌           | ❌     |
| Tax History         | ✅ Complete      | ❌           | ❌     |
| School Ratings      | ✅ Detailed      | ❌           | ❌     |
| Insurance Info      | ✅               | ❌           | ❌     |
| Transaction History | ✅               | ❌           | ✅     |
| Photos              | ✅               | ✅           | ✅     |
| Market Data         | ✅               | ✅ Zestimate | ✅     |

## Best Practices

1. **Rate Limiting**: Respect Apify rate limits and use appropriate delays
2. **Data Validation**: Always validate listing data before processing
3. **Error Logging**: Log errors with sufficient context for debugging
4. **Incremental Updates**: Check for existing listings to avoid duplicates
5. **Data Quality**: Monitor for data quality issues and handle gracefully

## Troubleshooting

### Common Issues

1. **No Results**: Check if zip code has active listings
2. **Rate Limits**: Implement delays between requests
3. **Data Quality**: Some fields may be null or missing
4. **Actor Changes**: Monitor Apify actor for updates or changes

### Debugging

Enable detailed logging by setting environment variables:

```bash
DEBUG=realtor:*
```

This will provide detailed information about API calls, data processing, and errors.
