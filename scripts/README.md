# Scripts

This directory contains executable scripts for data tasks.

## daily-task.js

The `daily-task.js` script fetches property data from the ATTOM API and stores it in the Supabase database. It is designed to be run on a regular basis (e.g., daily) to keep the database updated with the latest property sales data.

### Features

- Fetches property sale data from the ATTOM API for configured zip codes
- Processes the API response and maps it to the database schema
- Stores raw API responses in the `api_data` table
- Inserts new records and updates existing records if they've changed
- Supports multiple zip codes
- Can be run manually or via GitHub Actions

### Usage

#### Basic Usage

```bash
node scripts/daily-task.js
```

This will process all zip codes configured in `utils/config.js`.

#### Specify Zip Codes

```bash
node scripts/daily-task.js --zip=16146,90210
```

This will process only the specified zip codes.

### Environment Variables

The script uses the following environment variables:

- `ATTOM_API_KEY` - ATTOM API key
- `SUPABASE_URL` - Supabase URL
- `SUPABASE_KEY` - Supabase API key
- `TARGET_ZIP_CODES` - Comma-separated list of ZIP codes to process (optional)
- `ZIP_GEOID_MAPPING` - JSON string mapping ZIP codes to geoIdV4 values (optional)

### Implementation Details

1. The script first tests the Supabase connection to ensure the database is accessible.
2. It then determines which zip codes to process based on command-line arguments, environment variables, or the default configuration.
3. For each zip code:
   - It calculates a date range (one month back from the current date)
   - It fetches sale data from the ATTOM API using the zip code's geoIdV4
   - It stores the raw API response in the `api_data` table
   - It processes the property data and inserts/updates records in the `property` table
   - It processes the sale data and inserts/updates records in the `sale_fact` table
4. Finally, it logs a summary of the operations performed for each zip code.

### Error Handling

The script includes robust error handling to ensure that:

- Errors in processing one zip code don't affect the processing of other zip codes
- Database connection issues are detected and reported
- API errors are caught and logged
- The script exits with a non-zero status code if there are unhandled errors (useful for CI/CD pipelines)

## rentcast-daily-task.js

The `rentcast-daily-task.js` script fetches property data from the RentCast API and stores it in the Supabase database. It is designed to run 30 minutes after the ATTOM daily task to ensure that the ATTOM data is available for reference.

### Features

- Fetches property data directly from the RentCast API by zip code
- Processes the API response and maps it to the database schema
- Retrieves automated valuation model (AVM) data and rent estimates
- Inserts new records and updates existing records if they've changed
- Supports multiple zip codes
- Includes rate limiting to avoid hitting API rate limits

### Usage

#### Basic Usage

```bash
node scripts/rentcast-daily-task.js
```

This will process all zip codes configured in `utils/config.js`.

#### Specify Zip Codes

```bash
node scripts/rentcast-daily-task.js --zip=16146,90210
```

This will process only the specified zip codes.

### Environment Variables

The script uses the following environment variables:

- `RENTCAST_API_KEY` - RentCast API key
- `SUPABASE_URL` - Supabase URL
- `SUPABASE_KEY` - Supabase API key
- `TARGET_ZIP_CODES` - Comma-separated list of ZIP codes to process (optional)

### Implementation Details

1. The script first tests the Supabase connection to ensure the database is accessible.
2. It then determines which zip codes to process based on command-line arguments, environment variables, or the default configuration.
3. For each zip code:
   - It retrieves properties directly from the RentCast API for that zip code
   - For each property:
     - It processes the property data and inserts/updates records in the `rentcast_properties` table
     - It retrieves and processes AVM data and inserts/updates records in the `rentcast_avm_value` table
     - It retrieves and processes rent estimate data and inserts/updates records in the `rentcast_avm_rent` table
4. Finally, it logs a summary of the operations performed for each zip code.

## link-properties-task.js

The `link-properties-task.js` script links properties between the ATTOM and RentCast data sources. It is designed to run after both the ATTOM and RentCast data has been updated.

### Features

- Finds RentCast properties that don't have links to ATTOM properties
- Uses geographic proximity to find matching properties
- Calculates a confidence score for each match
- Stores the links in the `property_link` table
- Supports batch processing to handle large datasets efficiently

### Usage

#### Basic Usage

```bash
node scripts/link-properties-task.js
```

This will process all unlinked RentCast properties with default settings.

#### Advanced Options

```bash
node scripts/link-properties-task.js --batch-size=50 --confidence=0.8 --distance=30
```

This will:

- Process properties in batches of 50
- Only create links with a confidence score of 0.8 or higher
- Only consider properties within 30 meters of each other

#### Check Link Quality

```bash
node scripts/link-properties-task.js --check-quality
```

This will analyze the quality of existing property links and provide statistics.

### Implementation Details

1. The script first tests the Supabase connection to ensure the database is accessible.
2. It retrieves all RentCast properties that don't have links to ATTOM properties.
3. For each property:
   - It finds the best matching ATTOM property based on geographic proximity
   - It calculates a confidence score for the match
   - If the confidence score meets the threshold, it creates a link in the `property_link` table
4. Finally, it logs a summary of the operations performed.

## create_rentcast_tables.sql

The `create_rentcast_tables.sql` script contains SQL statements to create the necessary tables for the RentCast data and property linking in the Supabase PostgreSQL database.

### Tables Created

- `rentcast_properties` - Stores basic property information from RentCast
- `rentcast_avm_value` - Stores property valuation data from RentCast
- `rentcast_avm_rent` - Stores property rent data from RentCast
- `property_link` - Links ATTOM and RentCast properties

### Usage

Run this script in your Supabase SQL Editor to create the necessary tables before running the RentCast data fetching and property linking scripts.

## rentcast_example.js

The `rentcast_example.js` script demonstrates how to use the RentCast API integration.

### Features

- Shows how to search for a property by address
- Shows how to retrieve and process AVM data
- Shows how to retrieve and process rent estimate data
- Shows how to link properties between ATTOM and RentCast

### Usage

```bash
node scripts/rentcast_example.js
```
