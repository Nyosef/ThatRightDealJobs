-- Migration: Add Zestimate Field and Change Tracking to Merged Listings
-- Date: 2024-12-10
-- Description: Adds missing zestimate field from Zillow and implements change tracking system

-- Add zestimate field (Zillow-specific)
ALTER TABLE merged_listing 
ADD COLUMN IF NOT EXISTS zestimate DECIMAL(12,2);

-- Add change tracking fields
ALTER TABLE merged_listing 
ADD COLUMN IF NOT EXISTS last_change_reason VARCHAR(255);

ALTER TABLE merged_listing 
ADD COLUMN IF NOT EXISTS changed_fields JSONB;

ALTER TABLE merged_listing 
ADD COLUMN IF NOT EXISTS change_source VARCHAR(100);

ALTER TABLE merged_listing 
ADD COLUMN IF NOT EXISTS change_details JSONB;

-- Add comments for documentation
COMMENT ON COLUMN merged_listing.zestimate IS 'Zillow Zestimate value (Zillow-specific estimate)';
COMMENT ON COLUMN merged_listing.last_change_reason IS 'Reason for the last update (e.g., "New data from zillow_daily_task")';
COMMENT ON COLUMN merged_listing.changed_fields IS 'JSON object containing fields that changed with old/new values';
COMMENT ON COLUMN merged_listing.change_source IS 'Comma-separated list of sources that contributed to changes';
COMMENT ON COLUMN merged_listing.change_details IS 'Additional metadata about the changes';

-- Create index for change tracking queries
CREATE INDEX IF NOT EXISTS idx_merged_listing_change_source ON merged_listing(change_source);
CREATE INDEX IF NOT EXISTS idx_merged_listing_last_change ON merged_listing(last_change_reason);

-- Update existing records to have default change tracking values
UPDATE merged_listing 
SET 
    last_change_reason = 'Historical data - no change tracking',
    change_source = 'unknown',
    changed_fields = '{}',
    change_details = '{}'
WHERE last_change_reason IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'merged_listing' 
    AND column_name IN ('zestimate', 'last_change_reason', 'changed_fields', 'change_source', 'change_details')
ORDER BY column_name;

-- Show sample of updated structure
SELECT 
    the_real_deal_id,
    address,
    zestimate,
    last_change_reason,
    change_source,
    source_count
FROM merged_listing 
LIMIT 3;
