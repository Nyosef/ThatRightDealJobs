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
