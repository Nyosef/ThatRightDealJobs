# Redfin API Integration

This module provides integration with Redfin property listings through the Apify Redfin scraper.

## Overview

The Redfin API integration uses the `tri_angle/redfin-search` Apify actor to scrape property listings from Redfin.com. It follows the same pattern as the Zillow integration.

## Files

- `client.js` - Redfin API client using Apify
- `listings.js` - Redfin listings search and data processing
- `index.js` - Module exports

## Usage

```javascript
const { redfin } = require("../api");

// Search for listings by zip code
const results = await redfin.searchListingsByZipCode("16146");
```

## Configuration

The integration requires the following environment variables:

- `APIFY_API_TOKEN` - Your Apify API token

## Actor Details

- **Actor ID**: `tri_angle/redfin-search`
- **URL Format**: `https://www.redfin.com/zipcode/{zipcode}`
- **Input Format**:
  ```json
  {
    "debugLog": false,
    "searchUrls": [
      {
        "url": "https://www.redfin.com/zipcode/16146",
        "method": "GET"
      }
    ],
    "zoomIn": true
  }
  ```

## Data Transformation

The Redfin response data is transformed to match our database schema. Key transformations include:

- Extracting values from nested value objects (e.g., `price.value`)
- Converting timestamps from milliseconds
- Mapping Redfin-specific fields to our standardized schema
- Handling latitude/longitude coordinates

## Database Schema

The transformed data is stored in the `redfin_listing` table with fields including:

- Property identifiers (redfin_id, listing_id, mls_id)
- Location data (address, city, state, zip, coordinates)
- Pricing information (price, price_per_sqft, hoa_fee)
- Property details (bedrooms, bathrooms, sqft, lot_size, year_built)
- Status and timing (mls_status, dom, time_on_redfin)
- Features and amenities (virtual tours, 3D tours, etc.)

## Error Handling

The integration includes comprehensive error handling:

- API connection errors
- Data transformation errors
- Invalid or missing property IDs
- Timeout handling for long-running scrapes

## Logging

Detailed logging is provided for:

- Scraper run status and progress
- Data transformation results
- Error conditions and debugging information
- Performance metrics (response size, processing time)
