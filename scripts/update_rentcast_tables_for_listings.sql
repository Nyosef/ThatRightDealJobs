-- Update RentCast Tables SQL Script for Listings Endpoint
-- Run this script in your Supabase SQL Editor to update the necessary tables

-- Add new columns to rentcast_properties table
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS city VARCHAR;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS state VARCHAR;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS zip_code VARCHAR;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS lot_size INTEGER;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS year_built INTEGER;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS hoa_fee NUMERIC;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS status VARCHAR;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS listing_type VARCHAR;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS listed_date TIMESTAMPTZ;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS removed_date TIMESTAMPTZ;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS last_seen_date TIMESTAMPTZ;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS days_on_market INTEGER;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS mls_name VARCHAR;
ALTER TABLE rentcast_properties ADD COLUMN IF NOT EXISTS mls_number VARCHAR;

-- Listing Agent Table
CREATE TABLE IF NOT EXISTS rentcast_listing_agent (
  id SERIAL PRIMARY KEY,
  rentcast_id VARCHAR NOT NULL REFERENCES rentcast_properties(rentcast_id),
  name VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  website VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listing Office Table
CREATE TABLE IF NOT EXISTS rentcast_listing_office (
  id SERIAL PRIMARY KEY,
  rentcast_id VARCHAR NOT NULL REFERENCES rentcast_properties(rentcast_id),
  name VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  website VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Builder Table (for New Construction listings)
CREATE TABLE IF NOT EXISTS rentcast_builder (
  id SERIAL PRIMARY KEY,
  rentcast_id VARCHAR NOT NULL REFERENCES rentcast_properties(rentcast_id),
  name VARCHAR,
  development VARCHAR,
  phone VARCHAR,
  website VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listing History Table
CREATE TABLE IF NOT EXISTS rentcast_listing_history (
  id SERIAL PRIMARY KEY,
  rentcast_id VARCHAR NOT NULL REFERENCES rentcast_properties(rentcast_id),
  event_date DATE NOT NULL,
  event VARCHAR,
  price NUMERIC,
  listing_type VARCHAR,
  listed_date TIMESTAMPTZ,
  removed_date TIMESTAMPTZ,
  days_on_market INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rentcast_id, event_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rentcast_listing_agent_rentcast_id ON rentcast_listing_agent(rentcast_id);
CREATE INDEX IF NOT EXISTS idx_rentcast_listing_office_rentcast_id ON rentcast_listing_office(rentcast_id);
CREATE INDEX IF NOT EXISTS idx_rentcast_builder_rentcast_id ON rentcast_builder(rentcast_id);
CREATE INDEX IF NOT EXISTS idx_rentcast_listing_history_rentcast_id ON rentcast_listing_history(rentcast_id);

-- Apply the timestamp update trigger to new tables
CREATE TRIGGER update_rentcast_listing_agent_timestamp
BEFORE UPDATE ON rentcast_listing_agent
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_rentcast_listing_office_timestamp
BEFORE UPDATE ON rentcast_listing_office
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_rentcast_builder_timestamp
BEFORE UPDATE ON rentcast_builder
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_rentcast_listing_history_timestamp
BEFORE UPDATE ON rentcast_listing_history
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
