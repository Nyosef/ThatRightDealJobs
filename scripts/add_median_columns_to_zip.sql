-- Add median columns to the zip table
-- This script adds columns to store median values calculated from zillow_listing data

-- Add median columns for Zillow listing data
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_zestimate DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_last_sold_price DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_market_rent DECIMAL(8,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bedrooms DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bathrooms DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_sqft DECIMAL(8,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS medians_updated_at TIMESTAMPTZ;

-- Add comments to the new columns
COMMENT ON COLUMN zip.median_zestimate IS 'Median Zillow automated valuation estimate for properties in this zip code';
COMMENT ON COLUMN zip.median_last_sold_price IS 'Median last sold price for properties in this zip code';
COMMENT ON COLUMN zip.median_market_rent IS 'Median monthly rent estimate for properties in this zip code';
COMMENT ON COLUMN zip.median_bedrooms IS 'Median number of bedrooms for properties in this zip code';
COMMENT ON COLUMN zip.median_bathrooms IS 'Median number of bathrooms for properties in this zip code';
COMMENT ON COLUMN zip.median_sqft IS 'Median square footage for properties in this zip code';
COMMENT ON COLUMN zip.medians_updated_at IS 'Timestamp when median values were last calculated and updated';

-- Create index for faster queries on medians_updated_at
CREATE INDEX IF NOT EXISTS idx_zip_medians_updated_at ON zip(medians_updated_at);

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Median columns added to zip table successfully';
END $$;
