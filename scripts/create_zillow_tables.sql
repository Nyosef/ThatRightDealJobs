-- Create Zillow Listing Table
-- This table stores Zillow property listings data

CREATE TABLE IF NOT EXISTS zillow_listing (
  id SERIAL PRIMARY KEY,
  zillow_id VARCHAR UNIQUE NOT NULL,
  zip5 VARCHAR(5),
  address VARCHAR,
  address_street VARCHAR,
  city VARCHAR,
  state VARCHAR(2),
  
  -- Pricing Information
  price DECIMAL(12,2),              -- Current listing price
  zestimate DECIMAL(12,2),          -- Zillow's automated valuation (can be null)
  last_sold_price DECIMAL(12,2),    -- Last recorded sale price (not available in current response)
  market_rent DECIMAL(8,2),         -- Fair-market monthly rent estimate (Rent Zestimate)
  
  -- Property Details
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  sqft INTEGER,
  property_type VARCHAR,            -- CONDO, HOUSE, etc.
  listing_status VARCHAR,           -- FOR_SALE, etc.
  
  -- Dates and Timing
  listing_date DATE,                -- Not available in current response format
  last_sold_date DATE,              -- Not available in current response format
  days_on_zillow INTEGER,           -- Days the listing has been on Zillow
  last_updated DATE,
  
  -- Location
  lat DECIMAL(10,8),
  lon DECIMAL(11,8),
  
  -- Additional Info from Zillow Response
  zillow_url TEXT,
  img_src TEXT,
  has_image BOOLEAN,
  broker_name VARCHAR,
  status_text VARCHAR,
  country_currency VARCHAR(5),
  
  -- Metadata
  is_zillow_owned BOOLEAN,
  is_featured BOOLEAN,
  has_3d_model BOOLEAN,
  has_video BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_zillow_listing_zip5 ON zillow_listing(zip5);
CREATE INDEX IF NOT EXISTS idx_zillow_listing_price ON zillow_listing(price);
CREATE INDEX IF NOT EXISTS idx_zillow_listing_status ON zillow_listing(listing_status);
CREATE INDEX IF NOT EXISTS idx_zillow_listing_updated ON zillow_listing(last_updated);
CREATE INDEX IF NOT EXISTS idx_zillow_listing_location ON zillow_listing(lat, lon);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_zillow_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS trigger_update_zillow_listing_updated_at ON zillow_listing;
CREATE TRIGGER trigger_update_zillow_listing_updated_at
  BEFORE UPDATE ON zillow_listing
  FOR EACH ROW
  EXECUTE FUNCTION update_zillow_listing_updated_at();

-- Add comments to the table and important columns
COMMENT ON TABLE zillow_listing IS 'Stores Zillow property listings data scraped via Apify';
COMMENT ON COLUMN zillow_listing.zillow_id IS 'Unique Zillow property identifier (zpid)';
COMMENT ON COLUMN zillow_listing.price IS 'Current listing price in USD';
COMMENT ON COLUMN zillow_listing.zestimate IS 'Zillow automated valuation estimate';
COMMENT ON COLUMN zillow_listing.market_rent IS 'Zillow Rent Zestimate - monthly rent estimate';
COMMENT ON COLUMN zillow_listing.days_on_zillow IS 'Number of days the listing has been active on Zillow';
COMMENT ON COLUMN zillow_listing.last_updated IS 'Date when this record was last updated in our system';
