# Zillow Integration

This module provides integration with Zillow property listings using the Apify Zillow scraper. It allows you to search for active property listings by zip code and store the data in your Supabase database.

## Features

- **Active Listings Search**: Search for properties currently for sale on Zillow
- **Comprehensive Data**: Extract price, Zestimate, market rent, property details, and more
- **Zip Code Based**: Search by zip codes to match your existing workflow
- **Data Processing**: Transform raw Zillow data to match your database schema
- **Duplicate Detection**: Automatically handle updates to existing listings
- **Investment Analysis**: Calculate rent yields, price per sqft, and market statistics

## Setup

### 1. Install Dependencies

The Apify client is already included in your package.json:

```bash
npm install
```

### 2. Get Apify API Token

1. Sign up for an account at [Apify.com](https://apify.com)
2. Go to your [API tokens page](https://console.apify.com/account/integrations)
3. Create a new API token
4. Add it to your `.env` file:

```env
APIFY_API_TOKEN=your_apify_api_token_here
```

### 3. Create Database Table

Run the SQL script to create the Zillow listings table:

```sql
-- Run this in your Supabase SQL editor
-- File: scripts/create_zillow_tables.sql
```

### 4. Test the Integration

```bash
npm run zillow-example
```

## Usage

### Basic Search

```javascript
const { zillow } = require("./api");

// Search for listings in a zip code
const results = await zillow.searchListingsByZipCode("10005", {
  maxItems: 200,
});

console.log(`Found ${results.validListings} listings`);
```

### Daily Task

Run the daily task to collect listings for all configured zip codes:

```bash
# Run for all configured zip codes
npm run zillow-daily-task

# Run for specific zip codes
npm run zillow-daily-task --zip=10005,90210

# Get statistics for collected data
npm run zillow-stats
```

### Database Operations

```javascript
const models = require("./models");

// Get listings by zip code
const listings = await models.zillowListing.getListingsByZipCode("10005");

// Get market statistics
const stats = await models.zillowListing.getListingStatsByZipCode("10005");
console.log(`Average price: $${stats.avgPrice}`);
console.log(`Average rent yield: ${stats.avgRentYield}`);
```

## Data Structure

### Zillow Listing Fields

| Field            | Type          | Description                              |
| ---------------- | ------------- | ---------------------------------------- |
| `zillow_id`      | VARCHAR       | Unique Zillow property identifier (zpid) |
| `zip5`           | VARCHAR(5)    | 5-digit zip code                         |
| `address`        | VARCHAR       | Full property address                    |
| `city`           | VARCHAR       | City name                                |
| `state`          | VARCHAR(2)    | State abbreviation                       |
| `price`          | DECIMAL(12,2) | Current listing price                    |
| `zestimate`      | DECIMAL(12,2) | Zillow's automated valuation             |
| `market_rent`    | DECIMAL(8,2)  | Monthly rent estimate (Rent Zestimate)   |
| `bedrooms`       | INTEGER       | Number of bedrooms                       |
| `bathrooms`      | DECIMAL(3,1)  | Number of bathrooms                      |
| `sqft`           | INTEGER       | Living area square footage               |
| `property_type`  | VARCHAR       | Property type (CONDO, HOUSE, etc.)       |
| `listing_status` | VARCHAR       | Current status (FOR_SALE, etc.)          |
| `days_on_zillow` | INTEGER       | Days the listing has been active         |
| `lat`            | DECIMAL(10,8) | Latitude coordinate                      |
| `lon`            | DECIMAL(11,8) | Longitude coordinate                     |
| `zillow_url`     | TEXT          | Direct link to Zillow listing            |
| `broker_name`    | VARCHAR       | Listing broker/agent name                |

### Investment Analysis Fields

The integration automatically calculates useful investment metrics:

- **Rent Yield**: `(market_rent * 12) / price * 100`
- **Price per Sqft**: `price / sqft`
- **Market Rent per Sqft**: `market_rent / sqft`

## API Reference

### ZillowApiClient

```javascript
const client = new ZillowApiClient(apiToken);

// Search by zip code
const results = await client.searchByZipCode("10005", {
  maxItems: 200,
  type: "for-sale",
});
```

### Listings API

```javascript
// Search and process listings
const results = await zillow.searchListingsByZipCode("10005");

// Transform raw data
const transformed = zillow.transformZillowListingData(rawListing, "10005");
```

### Model Operations

```javascript
// Find by Zillow ID
const listing = await models.zillowListing.findByZillowId("2064142765");

// Insert new listing
await models.zillowListing.insert(listingData);

// Update existing listing
await models.zillowListing.update("2064142765", updatedData);

// Process API response
const result = await models.zillowListing.processAndUpsertFromZillow(
  apiData,
  "10005"
);

// Get statistics
const stats = await models.zillowListing.getListingStatsByZipCode("10005");
```

## Configuration

### Zip Code Configuration

Add your target zip codes to the existing configuration in `utils/config.js`:

```javascript
const ZIP_GEOID_MAPPING = {
  10005: "your_geoid_here", // Manhattan, NY
  90210: "your_geoid_here", // Beverly Hills, CA
  // Add more zip codes...
};
```

### Search Options

```javascript
const options = {
  maxItems: 200, // Maximum listings to retrieve
  type: "for-sale", // Search type (for-sale, sold, etc.)
  // Additional Apify scraper options...
};
```

## Workflow Integration

### GitHub Actions

Add Zillow task to your existing workflow:

```yaml
- name: Run Zillow Daily Task
  run: npm run zillow-daily-task
```

### Full Workflow

Use the enhanced workflow that includes Zillow:

```bash
npm run full-workflow
```

This runs:

1. ATTOM daily task
2. Zillow daily task
3. RentCast daily task (after 30 min delay)
4. Property linking task

## Troubleshooting

### Common Issues

1. **API Token Issues**

   - Verify token is correctly set in `.env`
   - Check token permissions on Apify platform
   - Ensure token has access to the Zillow scraper

2. **No Results Found**

   - Try different zip codes with known active listings
   - Check if the zip code has active for-sale listings on Zillow
   - Verify scraper is working with `npm run zillow-example`

3. **Database Errors**

   - Ensure the `zillow_listing` table exists
   - Check Supabase connection and permissions
   - Verify all required fields are properly mapped

4. **Rate Limiting**
   - Apify has usage limits based on your plan
   - Consider reducing `maxItems` or frequency
   - Monitor your Apify usage dashboard

### Debug Mode

Enable detailed logging by setting environment variable:

```bash
DEBUG=zillow npm run zillow-daily-task
```

## Cost Considerations

- **Apify Usage**: Each scraper run consumes Apify credits
- **Data Volume**: 200 listings per zip code per day
- **Storage**: Each listing is ~2KB in database storage
- **Frequency**: Daily runs recommended for fresh data

## Future Enhancements

Planned features for future releases:

1. **Historical Data**: Track price changes over time
2. **Sold Listings**: Add recently sold properties
3. **Property Linking**: Connect with existing ATTOM/RentCast data
4. **Advanced Filters**: Property type, price range, etc.
5. **Market Alerts**: Notify on significant price changes
6. **Comparative Analysis**: Cross-platform price comparisons

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Apify scraper documentation
3. Test with the example script: `npm run zillow-example`
4. Check your Apify dashboard for run details
