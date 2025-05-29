-- Create Redfin Listing Table
-- This table stores Redfin property listings data

CREATE TABLE IF NOT EXISTS redfin_listing (
  id SERIAL PRIMARY KEY,
  redfin_id VARCHAR UNIQUE NOT NULL,
  listing_id VARCHAR,
  mls_id VARCHAR,
  zip5 VARCHAR(5),
  address VARCHAR,
  city VARCHAR,
  state VARCHAR(2),
  
  -- Pricing Information
  price DECIMAL(12,2),              -- Current listing price
  price_per_sqft DECIMAL(8,2),      -- Price per square foot
  hoa_fee DECIMAL(8,2),             -- HOA fee amount
  
  -- Property Details
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  sqft INTEGER,                     -- Square footage
  lot_size BIGINT,                  -- Lot size in square feet (BIGINT for massive lots like 7+ billion sq ft)
  year_built INTEGER,               -- Year the property was built
  property_type BIGINT,             -- Redfin property type code (BIGINT for large codes)
  listing_type BIGINT,              -- Redfin listing type code (BIGINT for large codes)
  
  -- Status and Timing
  mls_status VARCHAR,               -- MLS status (Coming Soon, Active, etc.)
  search_status BIGINT,             -- Redfin search status code (BIGINT for large codes)
  dom BIGINT,                       -- Days on market (BIGINT to be safe)
  time_on_redfin BIGINT,           -- Time on Redfin in milliseconds (BIGINT for large values)
  sold_date BIGINT,                -- Sold date as timestamp in milliseconds
  last_updated DATE,
  
  -- Location
  lat DECIMAL(10,8),
  lon DECIMAL(11,8),
  
  -- Additional Information
  redfin_url TEXT,
  listing_remarks TEXT,
  listing_agent_name VARCHAR,
  listing_agent_id BIGINT,         -- Redfin agent ID (BIGINT for large IDs like 7193062800)
  
  -- Features and Amenities
  has_virtual_tour BOOLEAN,
  has_video_tour BOOLEAN,
  has_3d_tour BOOLEAN,
  is_hot BOOLEAN,
  is_new_construction BOOLEAN,
  
  -- Market Information
  market_id BIGINT,                -- Redfin market ID (BIGINT for large IDs)
  data_source_id BIGINT,           -- Redfin data source ID (BIGINT for large IDs)
  business_market_id BIGINT,       -- Redfin business market ID (BIGINT for large IDs)
  time_zone VARCHAR,
  
  -- Display and Media
  primary_photo_display_level BIGINT,  -- Display level (BIGINT to be safe)
  has_photos BOOLEAN,
  show_address_on_map BOOLEAN,
  
  -- Metadata
  ui_property_type BIGINT,         -- UI property type (BIGINT for large codes)
  country_code VARCHAR(5),
  service_policy_id BIGINT,        -- Service policy ID (BIGINT for large IDs)
  is_redfin BOOLEAN,
  is_shortlisted BOOLEAN,
  is_viewed_listing BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_redfin_listing_zip5 ON redfin_listing(zip5);
CREATE INDEX IF NOT EXISTS idx_redfin_listing_price ON redfin_listing(price);
CREATE INDEX IF NOT EXISTS idx_redfin_listing_mls_status ON redfin_listing(mls_status);
CREATE INDEX IF NOT EXISTS idx_redfin_listing_updated ON redfin_listing(last_updated);
CREATE INDEX IF NOT EXISTS idx_redfin_listing_location ON redfin_listing(lat, lon);
CREATE INDEX IF NOT EXISTS idx_redfin_listing_listing_id ON redfin_listing(listing_id);
CREATE INDEX IF NOT EXISTS idx_redfin_listing_mls_id ON redfin_listing(mls_id);
CREATE INDEX IF NOT EXISTS idx_redfin_listing_property_type ON redfin_listing(property_type);
CREATE INDEX IF NOT EXISTS idx_redfin_listing_search_status ON redfin_listing(search_status);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_redfin_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS trigger_update_redfin_listing_updated_at ON redfin_listing;
CREATE TRIGGER trigger_update_redfin_listing_updated_at
  BEFORE UPDATE ON redfin_listing
  FOR EACH ROW
  EXECUTE FUNCTION update_redfin_listing_updated_at();

-- Add comments to the table and important columns
COMMENT ON TABLE redfin_listing IS 'Stores Redfin property listings data scraped via Apify';
COMMENT ON COLUMN redfin_listing.redfin_id IS 'Unique Redfin property identifier (propertyId)';
COMMENT ON COLUMN redfin_listing.listing_id IS 'Redfin listing identifier (listingId)';
COMMENT ON COLUMN redfin_listing.mls_id IS 'MLS listing number';
COMMENT ON COLUMN redfin_listing.price IS 'Current listing price in USD';
COMMENT ON COLUMN redfin_listing.price_per_sqft IS 'Price per square foot in USD';
COMMENT ON COLUMN redfin_listing.hoa_fee IS 'HOA fee amount';
COMMENT ON COLUMN redfin_listing.lot_size IS 'Lot size in square feet (BIGINT for massive lots like 165,130 acres = 7+ billion sq ft)';
COMMENT ON COLUMN redfin_listing.dom IS 'Days on market (BIGINT to handle any large values)';
COMMENT ON COLUMN redfin_listing.time_on_redfin IS 'Time on Redfin in milliseconds (BIGINT for large timestamp values)';
COMMENT ON COLUMN redfin_listing.sold_date IS 'Date property was sold as timestamp in milliseconds';
COMMENT ON COLUMN redfin_listing.last_updated IS 'Date when this record was last updated in our system';
COMMENT ON COLUMN redfin_listing.mls_status IS 'MLS status (Coming Soon, Active, Sold, etc.)';
COMMENT ON COLUMN redfin_listing.search_status IS 'Redfin internal search status code (BIGINT for large codes)';
COMMENT ON COLUMN redfin_listing.property_type IS 'Redfin property type code (BIGINT for large codes)';
COMMENT ON COLUMN redfin_listing.listing_type IS 'Redfin listing type code (BIGINT for large codes)';
COMMENT ON COLUMN redfin_listing.listing_agent_id IS 'Redfin agent ID (BIGINT for large IDs like 7193062800)';
COMMENT ON COLUMN redfin_listing.market_id IS 'Redfin market ID (BIGINT for large IDs)';
COMMENT ON COLUMN redfin_listing.data_source_id IS 'Redfin data source ID (BIGINT for large IDs)';
COMMENT ON COLUMN redfin_listing.business_market_id IS 'Redfin business market ID (BIGINT for large IDs)';
COMMENT ON COLUMN redfin_listing.service_policy_id IS 'Redfin service policy ID (BIGINT for large IDs)';
COMMENT ON COLUMN redfin_listing.ui_property_type IS 'UI property type code (BIGINT for large codes)';
COMMENT ON COLUMN redfin_listing.primary_photo_display_level IS 'Photo display level (BIGINT to be safe)';
