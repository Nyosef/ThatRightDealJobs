-- Migration: Fix Merge Statistics Unique Constraint
-- Date: 2024-12-10
-- Description: Adds unique constraint on run_date to fix upsert operation in merge statistics

-- First, check for any existing duplicate run_date entries
SELECT 
    run_date, 
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as duplicate_ids
FROM merge_statistics 
GROUP BY run_date 
HAVING COUNT(*) > 1
ORDER BY run_date;

-- If duplicates exist, we need to remove them (keeping the most recent one)
-- This query will show which records would be deleted
WITH ranked_stats AS (
    SELECT 
        id,
        run_date,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY run_date ORDER BY created_at DESC) as rn
    FROM merge_statistics
)
SELECT 
    'Would delete record ID: ' || id || ' for date: ' || run_date as action
FROM ranked_stats 
WHERE rn > 1;

-- Remove duplicate records (keeping the most recent one per date)
WITH ranked_stats AS (
    SELECT 
        id,
        run_date,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY run_date ORDER BY created_at DESC) as rn
    FROM merge_statistics
)
DELETE FROM merge_statistics 
WHERE id IN (
    SELECT id 
    FROM ranked_stats 
    WHERE rn > 1
);

-- Now add the unique constraint on run_date
ALTER TABLE merge_statistics 
ADD CONSTRAINT unique_merge_statistics_run_date UNIQUE (run_date);

-- Verify the constraint was added successfully
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'merge_statistics'::regclass 
    AND conname = 'unique_merge_statistics_run_date';

-- Test that the constraint works by showing any existing records
SELECT 
    run_date,
    COUNT(*) as record_count
FROM merge_statistics 
GROUP BY run_date 
ORDER BY run_date DESC 
LIMIT 10;

-- Show current merge_statistics table structure (alternative to \d command)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'merge_statistics' 
ORDER BY ordinal_position;

COMMENT ON CONSTRAINT unique_merge_statistics_run_date ON merge_statistics 
IS 'Ensures only one statistics record per day, enabling upsert operations';
