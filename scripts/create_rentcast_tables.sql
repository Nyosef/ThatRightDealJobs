-- RentCast Tables SQL Script
-- Run this script in your Supabase SQL Editor to create the necessary tables

-- Note: This script assumes the 'property' table already exists with an 'attom_id' column

-- RentCast Properties Table
CREATE TABLE IF NOT EXISTS rentcast_properties (
  id SERIAL PRIMARY KEY,
  rentcast_id VARCHAR NOT NULL UNIQUE,
  formatted_address TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  property_type VARCHAR,
  bedrooms INTEGER,
  bathrooms NUMERIC(4, 1),
  square_footage INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RentCast AVM Value Table
CREATE TABLE IF NOT EXISTS rentcast_avm_value (
  id SERIAL PRIMARY KEY,
  rentcast_id VARCHAR NOT NULL REFERENCES rentcast_properties(rentcast_id),
  price_estimate NUMERIC,
  price_low NUMERIC,
  price_high NUMERIC,
  confidence_score NUMERIC(4, 2),
  forecast_standard_deviation NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RentCast AVM Rent Table
CREATE TABLE IF NOT EXISTS rentcast_avm_rent (
  id SERIAL PRIMARY KEY,
  rentcast_id VARCHAR NOT NULL REFERENCES rentcast_properties(rentcast_id),
  rent_estimate NUMERIC,
  rent_low NUMERIC,
  rent_high NUMERIC,
  confidence_score NUMERIC(4, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property Link Table (for connecting ATTOM and RentCast data)
CREATE TABLE IF NOT EXISTS property_link (
  id SERIAL PRIMARY KEY,
  attom_id BIGINT REFERENCES property(attom_id),
  rentcast_id VARCHAR REFERENCES rentcast_properties(rentcast_id),
  match_confidence NUMERIC(4, 2),
  match_method VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attom_id, rentcast_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rentcast_properties_rentcast_id ON rentcast_properties(rentcast_id);
CREATE INDEX IF NOT EXISTS idx_rentcast_avm_value_rentcast_id ON rentcast_avm_value(rentcast_id);
CREATE INDEX IF NOT EXISTS idx_rentcast_avm_rent_rentcast_id ON rentcast_avm_rent(rentcast_id);
CREATE INDEX IF NOT EXISTS idx_property_link_attom_id ON property_link(attom_id);
CREATE INDEX IF NOT EXISTS idx_property_link_rentcast_id ON property_link(rentcast_id);

-- Create a function to find properties by location
-- This function uses PostGIS to find properties within a specified radius
-- Note: This function works better with the PostGIS extension, but includes a fallback if it's not available
CREATE OR REPLACE FUNCTION find_properties_by_location(
  lat NUMERIC,
  lon NUMERIC,
  radius_meters INTEGER
)
RETURNS TABLE (
  attom_id BIGINT,
  address_line1 TEXT,
  property_lat NUMERIC,
  property_lon NUMERIC,
  distance NUMERIC
) AS $$
BEGIN
  -- Check if PostGIS extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) THEN
    -- Use PostGIS for accurate distance calculation
    RETURN QUERY
    SELECT
      p.attom_id,
      p.address_line1,
      p.lat AS property_lat,
      p.lon AS property_lon,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(p.lon, p.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
      ) AS distance
    FROM
      property p
    WHERE
      ST_DWithin(
        ST_SetSRID(ST_MakePoint(p.lon, p.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
        radius_meters
      )
    ORDER BY
      distance ASC;
  ELSE
    -- Fallback to a simpler calculation using the Haversine formula
    RETURN QUERY
    SELECT
      p.attom_id,
      p.address_line1,
      p.lat AS property_lat,
      p.lon AS property_lon,
      (
        6371000 * acos(
          cos(radians(lat)) * 
          cos(radians(p.lat)) * 
          cos(radians(p.lon) - radians(lon)) + 
          sin(radians(lat)) * 
          sin(radians(p.lat))
        )
      ) AS distance
    FROM
      property p
    WHERE
      p.lat BETWEEN lat - 0.01 AND lat + 0.01
      AND p.lon BETWEEN lon - 0.01 AND lon + 0.01
    HAVING
      (
        6371000 * acos(
          cos(radians(lat)) * 
          cos(radians(p.lat)) * 
          cos(radians(p.lon) - radians(lon)) + 
          sin(radians(lat)) * 
          sin(radians(p.lat))
        )
      ) <= radius_meters
    ORDER BY
      distance ASC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables
CREATE TRIGGER update_rentcast_properties_timestamp
BEFORE UPDATE ON rentcast_properties
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_rentcast_avm_value_timestamp
BEFORE UPDATE ON rentcast_avm_value
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_rentcast_avm_rent_timestamp
BEFORE UPDATE ON rentcast_avm_rent
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_property_link_timestamp
BEFORE UPDATE ON property_link
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Missing Field Jobs Table (for tracking missing fields in RentCast data)
CREATE TABLE IF NOT EXISTS missing_field_jobs (
  id SERIAL PRIMARY KEY,
  rentcast_id VARCHAR REFERENCES rentcast_properties(rentcast_id),
  attom_id BIGINT REFERENCES property(attom_id),
  missing_fields JSONB,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_missing_field_jobs_status ON missing_field_jobs(status);
CREATE INDEX IF NOT EXISTS idx_missing_field_jobs_rentcast_id ON missing_field_jobs(rentcast_id);
CREATE INDEX IF NOT EXISTS idx_missing_field_jobs_attom_id ON missing_field_jobs(attom_id);

-- Apply the trigger to the missing_field_jobs table
CREATE TRIGGER update_missing_field_jobs_timestamp
BEFORE UPDATE ON missing_field_jobs
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
