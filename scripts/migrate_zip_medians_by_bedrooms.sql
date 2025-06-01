-- Migrate zip table to use bedroom-specific median columns
-- This script removes existing median columns and adds new bedroom-specific ones

-- First, drop existing median columns
ALTER TABLE zip DROP COLUMN IF EXISTS median_zestimate;
ALTER TABLE zip DROP COLUMN IF EXISTS median_last_sold_price;
ALTER TABLE zip DROP COLUMN IF EXISTS median_market_rent;
ALTER TABLE zip DROP COLUMN IF EXISTS median_bedrooms;
ALTER TABLE zip DROP COLUMN IF EXISTS median_bathrooms;
ALTER TABLE zip DROP COLUMN IF EXISTS median_sqft;

-- Add bedroom-specific median columns for 2 bedrooms
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_zestimate_2br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_last_sold_price_2br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_market_rent_2br DECIMAL(8,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bedrooms_2br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bathrooms_2br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_sqft_2br DECIMAL(8,2);

-- Add bedroom-specific median columns for 3 bedrooms
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_zestimate_3br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_last_sold_price_3br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_market_rent_3br DECIMAL(8,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bedrooms_3br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bathrooms_3br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_sqft_3br DECIMAL(8,2);

-- Add bedroom-specific median columns for 4 bedrooms
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_zestimate_4br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_last_sold_price_4br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_market_rent_4br DECIMAL(8,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bedrooms_4br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bathrooms_4br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_sqft_4br DECIMAL(8,2);

-- Add bedroom-specific median columns for 5 bedrooms
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_zestimate_5br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_last_sold_price_5br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_market_rent_5br DECIMAL(8,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bedrooms_5br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bathrooms_5br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_sqft_5br DECIMAL(8,2);

-- Add bedroom-specific median columns for 6+ bedrooms
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_zestimate_6plus_br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_last_sold_price_6plus_br DECIMAL(12,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_market_rent_6plus_br DECIMAL(8,2);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bedrooms_6plus_br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_bathrooms_6plus_br DECIMAL(3,1);
ALTER TABLE zip ADD COLUMN IF NOT EXISTS median_sqft_6plus_br DECIMAL(8,2);

-- Keep the medians_updated_at column
ALTER TABLE zip ADD COLUMN IF NOT EXISTS medians_updated_at TIMESTAMPTZ;

-- Add comments to the new columns
COMMENT ON COLUMN zip.median_zestimate_2br IS 'Median Zillow automated valuation estimate for 2-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_last_sold_price_2br IS 'Median last sold price for 2-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_market_rent_2br IS 'Median monthly rent estimate for 2-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_bedrooms_2br IS 'Median number of bedrooms for 2-bedroom properties in this zip code (should be ~2)';
COMMENT ON COLUMN zip.median_bathrooms_2br IS 'Median number of bathrooms for 2-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_sqft_2br IS 'Median square footage for 2-bedroom properties in this zip code';

COMMENT ON COLUMN zip.median_zestimate_3br IS 'Median Zillow automated valuation estimate for 3-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_last_sold_price_3br IS 'Median last sold price for 3-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_market_rent_3br IS 'Median monthly rent estimate for 3-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_bedrooms_3br IS 'Median number of bedrooms for 3-bedroom properties in this zip code (should be ~3)';
COMMENT ON COLUMN zip.median_bathrooms_3br IS 'Median number of bathrooms for 3-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_sqft_3br IS 'Median square footage for 3-bedroom properties in this zip code';

COMMENT ON COLUMN zip.median_zestimate_4br IS 'Median Zillow automated valuation estimate for 4-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_last_sold_price_4br IS 'Median last sold price for 4-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_market_rent_4br IS 'Median monthly rent estimate for 4-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_bedrooms_4br IS 'Median number of bedrooms for 4-bedroom properties in this zip code (should be ~4)';
COMMENT ON COLUMN zip.median_bathrooms_4br IS 'Median number of bathrooms for 4-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_sqft_4br IS 'Median square footage for 4-bedroom properties in this zip code';

COMMENT ON COLUMN zip.median_zestimate_5br IS 'Median Zillow automated valuation estimate for 5-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_last_sold_price_5br IS 'Median last sold price for 5-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_market_rent_5br IS 'Median monthly rent estimate for 5-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_bedrooms_5br IS 'Median number of bedrooms for 5-bedroom properties in this zip code (should be ~5)';
COMMENT ON COLUMN zip.median_bathrooms_5br IS 'Median number of bathrooms for 5-bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_sqft_5br IS 'Median square footage for 5-bedroom properties in this zip code';

COMMENT ON COLUMN zip.median_zestimate_6plus_br IS 'Median Zillow automated valuation estimate for 6+ bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_last_sold_price_6plus_br IS 'Median last sold price for 6+ bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_market_rent_6plus_br IS 'Median monthly rent estimate for 6+ bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_bedrooms_6plus_br IS 'Median number of bedrooms for 6+ bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_bathrooms_6plus_br IS 'Median number of bathrooms for 6+ bedroom properties in this zip code';
COMMENT ON COLUMN zip.median_sqft_6plus_br IS 'Median square footage for 6+ bedroom properties in this zip code';

COMMENT ON COLUMN zip.medians_updated_at IS 'Timestamp when bedroom-specific median values were last calculated and updated';

-- Create indexes for faster queries on the new columns
CREATE INDEX IF NOT EXISTS idx_zip_medians_updated_at ON zip(medians_updated_at);

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Bedroom-specific median columns added to zip table successfully';
    RAISE NOTICE 'Old median columns have been removed';
    RAISE NOTICE 'New columns support 2br, 3br, 4br, 5br, and 6+br calculations';
END $$;
