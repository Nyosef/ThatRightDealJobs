-- Create Realtor Listing Table
-- This table stores Realtor.com property listings data

CREATE TABLE IF NOT EXISTS realtor_listing (
  id SERIAL PRIMARY KEY,
  realtor_id VARCHAR UNIQUE NOT NULL,  -- The "id" field from response
  url TEXT,
  status VARCHAR,                      -- sold, for_sale, etc.
  zip5 VARCHAR(5),
  
  -- Pricing Information (Key for investors)
  list_price DECIMAL(12,2),           -- Current listing price
  last_sold_price DECIMAL(12,2),      -- Last sale price
  price_per_sqft DECIMAL(8,2),        -- Calculated from last_sold_price/sqft
  
  -- Property Details (Essential for analysis)
  beds INTEGER,
  baths INTEGER,
  baths_full INTEGER,
  baths_half INTEGER,
  baths_3qtr INTEGER,
  baths_total INTEGER,
  baths_max INTEGER,
  baths_min INTEGER,
  baths_full_calc INTEGER,
  baths_partial_calc INTEGER,
  beds_max INTEGER,
  beds_min INTEGER,
  sqft INTEGER,
  sqft_max INTEGER,
  sqft_min INTEGER,
  lot_sqft BIGINT,                    -- Can be very large
  year_built INTEGER,
  year_renovated INTEGER,
  stories INTEGER,
  rooms INTEGER,
  units INTEGER,
  property_type VARCHAR,              -- single_family, condo, etc.
  sub_type VARCHAR,
  
  -- Property Features (Investment considerations)
  construction VARCHAR,
  cooling VARCHAR,
  exterior VARCHAR,
  fireplace VARCHAR,
  garage VARCHAR,
  garage_max INTEGER,
  garage_min INTEGER,
  garage_type VARCHAR,
  heating VARCHAR,
  logo VARCHAR,
  pool VARCHAR,
  roofing VARCHAR,
  styles VARCHAR,
  zoning VARCHAR,
  name VARCHAR,
  text TEXT,
  
  -- Dates and Timing (Critical for market analysis)
  sold_on DATE,
  listing_date DATE,                  -- If available from listing history
  days_on_market INTEGER,             -- Calculated from history
  last_updated DATE,
  
  -- Location (Essential for analysis)
  street VARCHAR,
  locality VARCHAR,
  region VARCHAR(2),
  postal_code VARCHAR(10),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Investment Analysis Data (Unique value-add)
  -- Tax History - Extract latest year for quick access
  latest_tax_year INTEGER,
  latest_tax_amount DECIMAL(10,2),
  latest_assessed_total DECIMAL(12,2),
  latest_market_total DECIMAL(12,2),
  latest_assessed_building DECIMAL(12,2),
  latest_assessed_land DECIMAL(12,2),
  latest_market_building DECIMAL(12,2),
  latest_market_land DECIMAL(12,2),
  
  -- Risk Assessment (Unique to Realtor.com - valuable for investors)
  flood_factor_score INTEGER,
  flood_factor_severity VARCHAR,
  flood_environmental_risk INTEGER,
  flood_trend_direction INTEGER,
  flood_insurance_requirement VARCHAR,
  fire_factor_score INTEGER,
  fire_factor_severity VARCHAR,
  fire_cumulative_30 INTEGER,
  noise_score INTEGER,
  
  -- School Information (affects property values)
  nearest_elementary_rating INTEGER,
  nearest_middle_rating INTEGER,
  nearest_high_rating INTEGER,
  nearest_elementary_distance DECIMAL(4,2),
  nearest_middle_distance DECIMAL(4,2),
  nearest_high_distance DECIMAL(4,2),
  
  -- Complex data as JSONB for detailed analysis
  nearby_schools JSONB,              -- School ratings affect property values
  local_risk_data JSONB,             -- Full flood/fire/noise data
  price_history JSONB,               -- Full transaction history
  tax_history JSONB,                 -- Complete tax assessment history
  floorplans JSONB,                  -- For rental analysis if applicable
  coordinates JSONB,                 -- Full coordinates object
  address_full JSONB,                -- Full address object
  
  -- Media and Marketing
  photos JSONB,                      -- Photo URLs
  has_photos BOOLEAN,
  
  -- Metadata
  realtor_url TEXT,
  neighborhood VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_realtor_listing_realtor_id ON realtor_listing(realtor_id);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_zip5 ON realtor_listing(zip5);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_list_price ON realtor_listing(list_price);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_last_sold_price ON realtor_listing(last_sold_price);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_status ON realtor_listing(status);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_updated ON realtor_listing(last_updated);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_location ON realtor_listing(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_beds_baths ON realtor_listing(beds, baths);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_sqft ON realtor_listing(sqft);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_year_built ON realtor_listing(year_built);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_property_type ON realtor_listing(property_type);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_sold_on ON realtor_listing(sold_on);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_price_per_sqft ON realtor_listing(price_per_sqft);

-- JSONB indexes for complex data queries
CREATE INDEX IF NOT EXISTS idx_realtor_listing_schools_gin ON realtor_listing USING GIN (nearby_schools);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_risk_gin ON realtor_listing USING GIN (local_risk_data);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_history_gin ON realtor_listing USING GIN (price_history);
CREATE INDEX IF NOT EXISTS idx_realtor_listing_tax_gin ON realtor_listing USING GIN (tax_history);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_realtor_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS trigger_update_realtor_listing_updated_at ON realtor_listing;
CREATE TRIGGER trigger_update_realtor_listing_updated_at
  BEFORE UPDATE ON realtor_listing
  FOR EACH ROW
  EXECUTE FUNCTION update_realtor_listing_updated_at();

-- Add comments to the table and important columns
COMMENT ON TABLE realtor_listing IS 'Stores Realtor.com property listings data scraped via Apify';
COMMENT ON COLUMN realtor_listing.realtor_id IS 'Unique Realtor.com property identifier (id field)';
COMMENT ON COLUMN realtor_listing.list_price IS 'Current listing price in USD';
COMMENT ON COLUMN realtor_listing.last_sold_price IS 'Last recorded sale price in USD';
COMMENT ON COLUMN realtor_listing.price_per_sqft IS 'Price per square foot calculated from sale price';
COMMENT ON COLUMN realtor_listing.lot_sqft IS 'Lot size in square feet (BIGINT for massive lots)';
COMMENT ON COLUMN realtor_listing.flood_factor_score IS 'Flood risk score (1-10, 1=minimal risk)';
COMMENT ON COLUMN realtor_listing.fire_factor_score IS 'Wildfire risk score (1-10, 1=minimal risk)';
COMMENT ON COLUMN realtor_listing.noise_score IS 'Noise level score (higher = noisier)';
COMMENT ON COLUMN realtor_listing.latest_tax_amount IS 'Most recent annual property tax amount';
COMMENT ON COLUMN realtor_listing.latest_assessed_total IS 'Most recent total assessed value';
COMMENT ON COLUMN realtor_listing.latest_market_total IS 'Most recent total market value';
COMMENT ON COLUMN realtor_listing.nearby_schools IS 'JSONB array of nearby schools with ratings and distances';
COMMENT ON COLUMN realtor_listing.local_risk_data IS 'JSONB object containing flood, fire, and noise risk details';
COMMENT ON COLUMN realtor_listing.price_history IS 'JSONB array of historical price events and transactions';
COMMENT ON COLUMN realtor_listing.tax_history IS 'JSONB array of historical tax assessments';
COMMENT ON COLUMN realtor_listing.last_updated IS 'Date when this record was last updated in our system';
