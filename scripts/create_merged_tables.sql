-- Create Merged Listing Table
-- This table stores merged property data from Zillow, Redfin, and Realtor sources
-- with conflict tracking and resolution

CREATE TABLE IF NOT EXISTS merged_listing (
  -- Core Identity
  the_real_deal_id SERIAL PRIMARY KEY,
  address VARCHAR NOT NULL,                    -- Normalized primary matching key
  original_addresses JSONB,                    -- Store original addresses from each source
  
  -- Geographic Information (averaged from sources)
  lat DECIMAL(10,8),
  lon DECIMAL(11,8),
  zip5 VARCHAR(5),
  city VARCHAR,
  state VARCHAR(2),
  
  -- Averaged Numeric Fields
  price DECIMAL(12,2),                         -- Average of available prices
  last_sold_price DECIMAL(12,2),              -- Average where available
  bedrooms INTEGER,                            -- Average bedrooms/beds
  bathrooms DECIMAL(3,1),                     -- Average bathrooms/baths
  sqft INTEGER,                               -- Average square footage
  year_built INTEGER,                         -- Average or most common value
  lot_size BIGINT,                            -- Average lot size (sqft)
  
  -- Source-Specific Text Fields (Overview/Descriptions)
  zillow_overview TEXT,                       -- From Zillow data/description
  redfin_overview TEXT,                       -- From Redfin listing_remarks
  realtor_overview TEXT,                      -- From Realtor text field
  
  -- Additional Merged Fields
  property_type VARCHAR,                      -- Consensus property type
  listing_status VARCHAR,                     -- Current status (prioritized)
  days_on_market INTEGER,                     -- Average or most recent
  
  -- Source Tracking
  zillow_id VARCHAR,                          -- Link to zillow_listing
  redfin_id VARCHAR,                          -- Link to redfin_listing
  realtor_id VARCHAR,                         -- Link to realtor_listing
  source_count INTEGER NOT NULL DEFAULT 0,    -- Number of contributing sources
  data_sources JSONB,                         -- Array of contributing sources with metadata
  
  -- Matching & Quality Metadata
  matching_method VARCHAR,                    -- How record was matched (address_exact, address_fuzzy, coordinates, hybrid)
  confidence_score DECIMAL(3,2),             -- Matching confidence (0.00-1.00)
  address_similarity_score DECIMAL(3,2),     -- Address matching score for fuzzy matches
  coordinate_distance_meters DECIMAL(8,2),   -- Distance between coordinates if coordinate-matched
  
  -- Conflict Tracking & Resolution
  data_conflicts JSONB,                       -- Detailed conflict information with resolution details
  conflict_count INTEGER DEFAULT 0,          -- Quick count of conflicts for filtering
  has_price_conflicts BOOLEAN DEFAULT FALSE, -- Quick flag for price conflicts
  has_size_conflicts BOOLEAN DEFAULT FALSE,  -- Quick flag for size/dimension conflicts
  
  -- Publication & Status
  published BOOLEAN DEFAULT FALSE,            -- Whether sent to users
  published_at TIMESTAMPTZ,                  -- When it was published
  quality_score DECIMAL(3,2),               -- Overall data quality score (0.00-1.00)
  
  -- Future Ranking Preparation
  ranking_score DECIMAL(8,4),               -- For future ranking algorithms
  ranking_factors JSONB,                    -- Store ranking calculation details
  investment_metrics JSONB,                 -- Store calculated investment metrics
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_merged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_merged_listing_address ON merged_listing(address);
CREATE INDEX IF NOT EXISTS idx_merged_listing_location ON merged_listing(lat, lon);
CREATE INDEX IF NOT EXISTS idx_merged_listing_zip5 ON merged_listing(zip5);
CREATE INDEX IF NOT EXISTS idx_merged_listing_price ON merged_listing(price);
CREATE INDEX IF NOT EXISTS idx_merged_listing_published ON merged_listing(published);
CREATE INDEX IF NOT EXISTS idx_merged_listing_source_count ON merged_listing(source_count);
CREATE INDEX IF NOT EXISTS idx_merged_listing_confidence ON merged_listing(confidence_score);
CREATE INDEX IF NOT EXISTS idx_merged_listing_conflicts ON merged_listing(conflict_count);
CREATE INDEX IF NOT EXISTS idx_merged_listing_quality ON merged_listing(quality_score);
CREATE INDEX IF NOT EXISTS idx_merged_listing_ranking ON merged_listing(ranking_score);
CREATE INDEX IF NOT EXISTS idx_merged_listing_updated ON merged_listing(updated_at);

-- Source ID indexes for joins
CREATE INDEX IF NOT EXISTS idx_merged_listing_zillow_id ON merged_listing(zillow_id);
CREATE INDEX IF NOT EXISTS idx_merged_listing_redfin_id ON merged_listing(redfin_id);
CREATE INDEX IF NOT EXISTS idx_merged_listing_realtor_id ON merged_listing(realtor_id);

-- JSONB indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_merged_listing_sources_gin ON merged_listing USING GIN (data_sources);
CREATE INDEX IF NOT EXISTS idx_merged_listing_conflicts_gin ON merged_listing USING GIN (data_conflicts);
CREATE INDEX IF NOT EXISTS idx_merged_listing_ranking_factors_gin ON merged_listing USING GIN (ranking_factors);
CREATE INDEX IF NOT EXISTS idx_merged_listing_investment_gin ON merged_listing USING GIN (investment_metrics);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_merged_listing_published_quality ON merged_listing(published, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_merged_listing_zip_price ON merged_listing(zip5, price);
CREATE INDEX IF NOT EXISTS idx_merged_listing_source_confidence ON merged_listing(source_count DESC, confidence_score DESC);

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_merged_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_merged_listing_updated_at ON merged_listing;
CREATE TRIGGER trigger_update_merged_listing_updated_at
  BEFORE UPDATE ON merged_listing
  FOR EACH ROW
  EXECUTE FUNCTION update_merged_listing_updated_at();

-- Create configuration table for merge settings
CREATE TABLE IF NOT EXISTS merge_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  data_type VARCHAR DEFAULT 'string',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration values
INSERT INTO merge_config (config_key, config_value, description, data_type) VALUES
('coordinate_tolerance_meters', '50', 'Maximum distance in meters for coordinate-based matching', 'number'),
('address_fuzzy_threshold', '0.8', 'Minimum similarity score for fuzzy address matching (0.0-1.0)', 'number'),
('price_conflict_threshold', '0.05', 'Percentage difference threshold for price conflict detection (0.05 = 5%)', 'number'),
('enable_fuzzy_matching', 'true', 'Enable fuzzy address matching', 'boolean'),
('min_confidence_score', '0.7', 'Minimum confidence score for accepting matches', 'number'),
('max_coordinate_distance', '100', 'Maximum coordinate distance in meters to consider for matching', 'number'),
('conflict_detection_enabled', 'true', 'Enable conflict detection and logging', 'boolean'),
('quality_score_weights', '{"source_count": 0.3, "confidence": 0.4, "conflicts": 0.3}', 'Weights for quality score calculation', 'json')
ON CONFLICT (config_key) DO NOTHING;

-- Create merge statistics table for monitoring
CREATE TABLE IF NOT EXISTS merge_statistics (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL,
  total_processed INTEGER DEFAULT 0,
  total_merged INTEGER DEFAULT 0,
  exact_matches INTEGER DEFAULT 0,
  fuzzy_matches INTEGER DEFAULT 0,
  coordinate_matches INTEGER DEFAULT 0,
  no_matches INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  avg_confidence_score DECIMAL(3,2),
  avg_quality_score DECIMAL(3,2),
  processing_time_seconds INTEGER,
  errors_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for statistics queries
CREATE INDEX IF NOT EXISTS idx_merge_statistics_date ON merge_statistics(run_date DESC);

-- Add table comments for documentation
COMMENT ON TABLE merged_listing IS 'Merged property listings from Zillow, Redfin, and Realtor sources with conflict tracking';
COMMENT ON COLUMN merged_listing.the_real_deal_id IS 'Internal unique identifier for merged listings';
COMMENT ON COLUMN merged_listing.address IS 'Normalized address used as primary matching key';
COMMENT ON COLUMN merged_listing.original_addresses IS 'JSONB storing original addresses from each source for reference';
COMMENT ON COLUMN merged_listing.data_conflicts IS 'JSONB storing detailed information about data conflicts and their resolution';
COMMENT ON COLUMN merged_listing.matching_method IS 'Method used to match this record (address_exact, address_fuzzy, coordinates, hybrid)';
COMMENT ON COLUMN merged_listing.confidence_score IS 'Overall confidence in the match quality (0.00-1.00)';
COMMENT ON COLUMN merged_listing.quality_score IS 'Data quality score based on completeness and consistency (0.00-1.00)';
COMMENT ON COLUMN merged_listing.published IS 'Whether this listing has been published to users';
COMMENT ON COLUMN merged_listing.ranking_score IS 'Future ranking score for investment attractiveness';
COMMENT ON COLUMN merged_listing.investment_metrics IS 'JSONB storing calculated investment metrics and ratios';

COMMENT ON TABLE merge_config IS 'Configuration settings for the merge process';
COMMENT ON TABLE merge_statistics IS 'Daily statistics and monitoring data for merge operations';
