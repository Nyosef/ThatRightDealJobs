# ThatRightDeal

A data pipeline for real estate property data, fetching from various APIs and storing in a Supabase database.

## Project Structure

- `api/` - API client implementations for different data sources
  - `attom/` - ATTOM API integration
  - `rentcast/` - (Future) Rentcast API integration
- `models/` - Database models and data processing logic
- `scripts/` - Executable scripts for data tasks
- `utils/` - Utility functions and helpers

## ATTOM API Integration

This project integrates with the ATTOM API to fetch property sale data. The integration:

1. Fetches sale snapshot data for configured zip codes
2. Processes the API response and maps it to our database schema
3. Stores the data in the Supabase database, updating existing records if they've changed

### API Endpoints Used

- `sale/snapshot` - Fetches property sale data for a specific geographic area and date range

### Data Flow

1. The daily task script runs (manually or via GitHub Actions)
2. For each configured zip code:
   - Calculates a date range (one month back from current date)
   - Fetches sale data from ATTOM API
   - Processes the API response
   - Inserts new records and updates changed records in the database
3. Logs a summary of the operations performed

## Database Schema

The database has the following tables:

1. `api_data` - Stores raw API responses

   - `id` (int8) - Primary key
   - `created_at` (timestamptz) - Record creation timestamp
   - `data` (json) - Raw API response data

2. `sale_fact` - Stores processed sale data

   - `sale_id` (int8) - Primary key
   - `attom_id` (int8) - ATTOM property ID
   - `zip5` (bpchar) - ZIP code
   - `rec_date` (date) - Record date
   - `sale_amt` (numeric) - Sale amount
   - `trans_type` (text) - Transaction type
   - `trans_date` (date) - Transaction date
   - `sale_meta` (jsonb) - Additional sale metadata
   - `imported_at` (timestamptz) - Import timestamp

3. `property` - Stores property information

   - `attom_id` (int8) - Primary key
   - `zip5` (bpchar) - ZIP code
   - `apn` (text) - Assessor's Parcel Number
   - `address_line` (text) - Street address
   - `address_full` (text) - Full address
   - `lat` (numeric) - Latitude
   - `lon` (numeric) - Longitude
   - `property_type` (text) - Property type
   - `year_built` (int2) - Year built
   - `livable_sqft` (int4) - Livable square footage
   - `lot_size_acre` (numeric) - Lot size in acres
   - `last_updated` (date) - Last update date

4. `zip` - Stores ZIP code information
   - `zip5` (bpchar) - Primary key
   - `geo_id_v4` (uuid) - Geographic ID
   - `city` (text) - City
   - `state` (text) - State
   - `land_sq_mi` (numeric) - Land area in square miles
   - `water_sq_mi` (numeric) - Water area in square miles
   - `created_at` (timestamptz) - Record creation timestamp

## Configuration

The application uses environment variables for configuration:

- `ATTOM_API_KEY` - ATTOM API key
- `SUPABASE_URL` - Supabase URL
- `SUPABASE_KEY` - Supabase API key
- `TARGET_ZIP_CODES` - Comma-separated list of ZIP codes to process (optional)
- `ZIP_GEOID_MAPPING` - JSON string mapping ZIP codes to geoIdV4 values (optional)

## Running the Application

### Locally

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your API keys
3. Install dependencies: `npm install`
4. Run the daily task: `node scripts/daily-task.js`

### With Command-Line Arguments

You can specify which ZIP codes to process using command-line arguments:

```bash
node scripts/daily-task.js --zip=16146,90210
```

### With GitHub Actions

The application can be run automatically using GitHub Actions. Create a workflow file in `.github/workflows/daily-update.yml`:

```yaml
name: Daily Property Data Update

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: "0 2 * * *"
  workflow_dispatch:
    inputs:
      zip_codes:
        description: "Comma-separated list of zip codes to process (leave empty for all)"
        required: false
        default: ""

jobs:
  update-property-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run daily task
        env:
          ATTOM_API_KEY: ${{ secrets.ATTOM_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
          TARGET_ZIP_CODES: ${{ github.event.inputs.zip_codes || '' }}
        run: node scripts/daily-task.js
```

## Adding New API Integrations

To add a new API integration (like Rentcast):

1. Create a new directory under `api/` for the new API
2. Implement the API client and specific API functions
3. Create model functions to process and store the data
4. Update the daily task script to use the new API functions

## Extending ZIP Code Coverage

To add support for new ZIP codes:

1. Add the ZIP code and its corresponding geoIdV4 to the `DEFAULT_ZIP_GEOID_MAPPING` in `utils/config.js`
2. The script will automatically include the new ZIP code in its processing

Alternatively, you can set the `ZIP_GEOID_MAPPING` environment variable with a JSON string:

```
ZIP_GEOID_MAPPING={"16146":"9910140a4987c800f1399e10ccabb2d0","90210":"another-geo-id-here"}
```
