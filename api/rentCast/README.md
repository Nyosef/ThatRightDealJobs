# RentCast API Integration

This module provides integration with the RentCast API to fetch property data, automated valuation model (AVM) values, and rent estimates.

## Setup

1. Add your RentCast API key to the `.env` file:

```
RENTCAST_API_KEY=your_rentcast_api_key_here
```

2. Create the necessary database tables by running the SQL script:

```bash
# Copy the SQL from scripts/create_rentcast_tables.sql and run it in your Supabase SQL Editor
```

## Usage

### API Functions

The RentCast API module provides the following functions:

#### `getPropertyByAddress(address)`

Search for properties by address.

```javascript
const { rentCast } = require("../api");

// Search for a property by address
const propertySearchResult = await rentCast.getPropertyByAddress(
  "123 Main St, San Francisco, CA 94105"
);
```

#### `getPropertiesByZipCode(zipCode, limit, offset)`

Search for properties by zip code with pagination.

```javascript
const { rentCast } = require("../api");

// Search for properties by zip code
const propertySearchResult = await rentCast.getPropertiesByZipCode(
  "94105", // zipCode
  100, // limit (optional, default: 100)
  0 // offset (optional, default: 0)
);
```

#### `getAllPropertiesInZipCode(zipCode, batchSize)`

Get all properties in a zip code, handling pagination automatically.

```javascript
const { rentCast } = require("../api");

// Get all properties in a zip code
const properties = await rentCast.getAllPropertiesInZipCode(
  "94105", // zipCode
  100 // batch size (optional, default: 100)
);
```

#### `getPropertyAvm(propertyId)`

Get the automated valuation model (AVM) data for a property.

```javascript
const { rentCast } = require("../api");

// Get AVM data for a property
const avmData = await rentCast.getPropertyAvm("property-id-123");

// Access the price data
console.log(`Price: $${avmData.price}`);
console.log(
  `Price Range: $${avmData.priceRangeLow} - $${avmData.priceRangeHigh}`
);
```

#### `getPropertyRentEstimate(propertyId)`

Get the rent estimate for a property.

```javascript
const { rentCast } = require("../api");

// Get rent estimate for a property
const rentData = await rentCast.getPropertyRentEstimate("property-id-123");
```

### Models

The RentCast integration includes the following models:

#### `rentcastProperty`

Handles RentCast property data processing and storage.

```javascript
const { rentcastProperty } = require("../models");

// Process and upsert property data
const result = await rentcastProperty.processAndUpsertFromRentCast(
  propertyData
);
```

#### `rentcastAvmValue`

Handles RentCast AVM value data processing and storage.

```javascript
const { rentcastAvmValue } = require("../models");

// Process and upsert AVM value data
const result = await rentcastAvmValue.processAndUpsertFromRentCast(
  rentcastId,
  avmData
);
```

#### `rentcastAvmRent`

Handles RentCast AVM rent data processing and storage.

```javascript
const { rentcastAvmRent } = require("../models");

// Process and upsert AVM rent data
const result = await rentcastAvmRent.processAndUpsertFromRentCast(
  rentcastId,
  rentData
);
```

#### `propertyLink`

Handles linking between ATTOM and RentCast properties.

```javascript
const { propertyLink } = require("../models");

// Find the best matching ATTOM property for a RentCast property
const match = await propertyLink.findBestAttomMatch(rentcastProperty);

// Link properties
await propertyLink.linkProperties(attomId, rentcastId, confidence, method);
```

## Example

See `scripts/rentcast_example.js` for a complete example of how to use the RentCast API integration.

```bash
node scripts/rentcast_example.js
```

## Database Schema

### rentcast_properties

Stores basic property information from RentCast.

| Column            | Type        | Description               |
| ----------------- | ----------- | ------------------------- |
| id                | SERIAL      | Primary key               |
| rentcast_id       | VARCHAR     | RentCast property ID      |
| formatted_address | TEXT        | Property address          |
| latitude          | NUMERIC     | Property latitude         |
| longitude         | NUMERIC     | Property longitude        |
| property_type     | VARCHAR     | Type of property          |
| bedrooms          | INTEGER     | Number of bedrooms        |
| bathrooms         | NUMERIC     | Number of bathrooms       |
| square_footage    | INTEGER     | Property square footage   |
| created_at        | TIMESTAMPTZ | Record creation timestamp |
| updated_at        | TIMESTAMPTZ | Record update timestamp   |

### rentcast_avm_value

Stores property valuation data from RentCast.

| Column                      | Type        | Description                        |
| --------------------------- | ----------- | ---------------------------------- |
| id                          | SERIAL      | Primary key                        |
| rentcast_id                 | VARCHAR     | RentCast property ID (foreign key) |
| price_estimate              | NUMERIC     | Estimated property value           |
| price_low                   | NUMERIC     | Low end of value range             |
| price_high                  | NUMERIC     | High end of value range            |
| confidence_score            | NUMERIC     | Confidence in the estimate (0-1)   |
| forecast_standard_deviation | NUMERIC     | Standard deviation of the forecast |
| created_at                  | TIMESTAMPTZ | Record creation timestamp          |
| updated_at                  | TIMESTAMPTZ | Record update timestamp            |

### rentcast_avm_rent

Stores property rent data from RentCast.

| Column           | Type        | Description                        |
| ---------------- | ----------- | ---------------------------------- |
| id               | SERIAL      | Primary key                        |
| rentcast_id      | VARCHAR     | RentCast property ID (foreign key) |
| rent_estimate    | NUMERIC     | Estimated monthly rent             |
| rent_low         | NUMERIC     | Low end of rent range              |
| rent_high        | NUMERIC     | High end of rent range             |
| confidence_score | NUMERIC     | Confidence in the estimate (0-1)   |
| created_at       | TIMESTAMPTZ | Record creation timestamp          |
| updated_at       | TIMESTAMPTZ | Record update timestamp            |

### property_link

Links ATTOM and RentCast properties.

| Column           | Type        | Description                                     |
| ---------------- | ----------- | ----------------------------------------------- |
| id               | SERIAL      | Primary key                                     |
| attom_id         | BIGINT      | ATTOM property ID (foreign key)                 |
| rentcast_id      | VARCHAR     | RentCast property ID (foreign key)              |
| match_confidence | NUMERIC     | Confidence in the match (0-1)                   |
| match_method     | VARCHAR     | Method used for matching (geo, address, manual) |
| created_at       | TIMESTAMPTZ | Record creation timestamp                       |
| updated_at       | TIMESTAMPTZ | Record update timestamp                         |
