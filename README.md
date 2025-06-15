# ThatRightDeal

A comprehensive real estate data pipeline that fetches property data from multiple sources, merges it intelligently, and calculates investment metrics to identify attractive real estate deals.

## Overview

ThatRightDeal is a sophisticated property analysis system that:

1. **Collects Data** from multiple real estate APIs (Zillow, Redfin, Realtor, RentCast, ATTOM)
2. **Merges Listings** from different sources using intelligent address and coordinate matching
3. **Calculates Market Medians** by zip code and bedroom count for fallback data
4. **Computes Investment Metrics** using proven real estate formulas
5. **Ranks Properties** by investment attractiveness for deal identification

## Project Structure

```
├── api/                    # API client implementations
│   ├── attom/             # ATTOM API integration
│   ├── rentcast/          # RentCast API integration
│   ├── zillow/            # Zillow scraping via Apify
│   ├── redfin/            # Redfin scraping via Apify
│   └── realtor/           # Realtor scraping via Apify
├── models/                # Database models and data processing
├── scripts/               # Executable scripts and documentation
├── utils/                 # Utility functions and configuration
└── .github/workflows/     # GitHub Actions automation
```

## Key Features

### 🏠 Multi-Source Data Collection

- **Zillow**: Property listings, Zestimates, market data
- **Redfin**: MLS listings, sold prices, market insights
- **Realtor**: Additional listing data and property details
- **RentCast**: Rental estimates and market rent data
- **ATTOM**: Property sales history and detailed property information

### 🔗 Intelligent Data Merging

- Advanced address normalization and matching
- Coordinate-based property matching for accuracy
- Conflict detection and resolution between sources
- Quality scoring and confidence metrics

### 📊 Market Analysis

- Zip code median calculations by bedroom count
- Market rent estimates for investment analysis
- Historical sale price medians for equity calculations
- Automated data quality validation

### 💰 Investment Metrics Calculation

Based on proven real estate investment formulas:

- **Cap Rate**: Net Operating Income ÷ List Price
- **Gross Rent Multiplier (GRM)**: List Price ÷ Annual Gross Income
- **Cash Flow**: Monthly and annual projections
- **Instant Equity**: Built-in equity vs market medians
- **NOI**: Net Operating Income with 45% expense ratio

## Daily Workflow

The system runs automatically via GitHub Actions with the following sequence:

1. **Data Collection**: Fetch new listings from all sources
2. **Property Linking**: Connect properties across different APIs
3. **Median Calculations**: Update zip code market medians by bedroom count
4. **Data Merging**: Intelligently merge listings from all sources
5. **Investment Analysis**: Calculate investment metrics for all properties
6. **Quality Reporting**: Generate statistics and quality reports

## Database Schema

### Core Tables

- **`merged_listing`** - Final merged property data with investment metrics
- **`zillow_listing`** - Raw Zillow property data
- **`redfin_listing`** - Raw Redfin property data
- **`realtor_listing`** - Raw Realtor property data
- **`rentcast_listing`** - RentCast rental data
- **`zip`** - Zip code data with bedroom-specific medians
- **`property`** - ATTOM property details
- **`sale`** - ATTOM sales history

### Investment Metrics Columns

The `merged_listing` table includes these calculated investment metrics:

```sql
gross_income                 DECIMAL(12,2)  -- Annual gross rental income
noi                         DECIMAL(12,2)  -- Net Operating Income
cap_rate                    DECIMAL(5,4)   -- Capitalization Rate
expected_cash_flow_annual   DECIMAL(12,2)  -- Expected annual cash flow
expected_cash_flow_monthly  DECIMAL(12,2)  -- Expected monthly cash flow
cash_on_cash_return         DECIMAL(5,4)   -- Cash-on-Cash Return
grm                         DECIMAL(8,2)   -- Gross Rent Multiplier
instant_equity_vs_median    DECIMAL(12,2)  -- Instant equity vs median
equity_vs_zestimate         DECIMAL(12,2)  -- Equity vs Zestimate
```

## Configuration

Set these environment variables:

```bash
# API Keys
ATTOM_API_KEY=your_attom_api_key
RENTCAST_API_KEY=your_rentcast_api_key
APIFY_API_TOKEN=your_apify_token

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Optional Configuration
TARGET_ZIP_CODES=16146,90210  # Comma-separated zip codes
```

## Usage

### Running Locally

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Run individual tasks
npm run zillow-daily-task -- --zip=16146
npm run redfin-daily-task -- --zip=16146
npm run realtor-daily-task -- --zip=16146
npm run rentcast-daily-task
npm run calculate-bedroom-medians
npm run merge-listings
npm run calculate-investment-metrics

# Or run the full workflow
npm run full-workflow
```

### Available Scripts

```bash
# Data Collection
npm run daily-task                    # ATTOM data collection
npm run zillow-daily-task             # Zillow listings
npm run redfin-daily-task             # Redfin listings
npm run realtor-daily-task            # Realtor listings
npm run rentcast-daily-task           # RentCast rental data

# Data Processing
npm run link-properties               # Link properties across sources
npm run calculate-bedroom-medians     # Calculate zip medians by bedroom
npm run merge-listings                # Merge all listing sources
npm run calculate-investment-metrics  # Calculate investment metrics

# Analysis & Reporting
npm run merge-stats                   # Merge quality statistics
npm run bedroom-median-stats          # Median calculation stats
npm run test-bedroom-medians          # Test median calculations
```

### GitHub Actions

The system runs automatically daily at 8:00 AM UTC via GitHub Actions. You can also trigger it manually from the Actions tab.

## Investment Analysis

### Finding Great Deals

Query the database to find attractive investment properties:

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

### Investment Metrics Explained

- **Cap Rate > 8%**: Generally considered good for rental properties
- **GRM < 10**: Lower is better - how many years to pay off with gross rent
- **Positive Instant Equity**: Property listed below market median
- **High Cash Flow**: Strong monthly income potential

## Data Quality & Validation

The system includes comprehensive quality controls:

- **Address Matching**: Fuzzy matching with confidence scoring
- **Coordinate Validation**: GPS-based property verification
- **Conflict Resolution**: Intelligent handling of data discrepancies
- **Quality Scoring**: Overall data quality metrics
- **Error Tracking**: Detailed logging and monitoring

## Documentation

Detailed documentation is available in the `scripts/` directory:

- [Investment Metrics](scripts/README_INVESTMENT_METRICS.md) - Investment calculation details
- [Merged Listings](scripts/README_MERGED_LISTINGS.md) - Data merging process
- [Bedroom Medians](scripts/README_BEDROOM_MEDIANS.md) - Market median calculations
- [General Medians](scripts/README_MEDIANS.md) - Overall median calculations

## Architecture

### Data Flow

1. **Collection**: APIs → Raw listing tables
2. **Linking**: Property matching across sources
3. **Aggregation**: Zip median calculations
4. **Merging**: Intelligent data consolidation
5. **Analysis**: Investment metrics calculation
6. **Output**: Ranked investment opportunities

### Key Technologies

- **Node.js**: Runtime environment
- **Supabase**: PostgreSQL database and API
- **Apify**: Web scraping platform for real estate sites
- **GitHub Actions**: Automated daily workflows

## Future Enhancements

- **Telegram Bot**: Automated deal alerts
- **Web Dashboard**: Visual property analysis interface
- **Machine Learning**: Predictive pricing models
- **Market Trends**: Historical analysis and forecasting
- **Portfolio Tracking**: Investment performance monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions or issues:

1. Check the documentation in `scripts/README_*.md`
2. Review the GitHub Issues
3. Create a new issue with detailed information

---

**ThatRightDeal** - Finding the right real estate deals through data-driven analysis.
