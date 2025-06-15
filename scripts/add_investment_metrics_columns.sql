-- Add investment metrics columns to merged_listing table
-- Based on Zillow Scraper POC Section 4 formulas

-- Add investment calculation columns
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS gross_income DECIMAL(12,2);
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS noi DECIMAL(12,2);
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS cap_rate DECIMAL(5,4);
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS expected_cash_flow_annual DECIMAL(12,2);
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS expected_cash_flow_monthly DECIMAL(12,2);
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS cash_on_cash_return DECIMAL(5,4);
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS grm DECIMAL(8,2);
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS instant_equity_vs_median DECIMAL(12,2);
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS equity_vs_zestimate DECIMAL(12,2);
ALTER TABLE merged_listing ADD COLUMN IF NOT EXISTS investment_metrics_updated_at TIMESTAMPTZ;

-- Add comments to the new columns
COMMENT ON COLUMN merged_listing.gross_income IS 'Annual gross rental income (marketRent × 12)';
COMMENT ON COLUMN merged_listing.noi IS 'Net Operating Income (Gross Income × 0.55, assuming 45% expense ratio)';
COMMENT ON COLUMN merged_listing.cap_rate IS 'Capitalization Rate (NOI ÷ listPrice)';
COMMENT ON COLUMN merged_listing.expected_cash_flow_annual IS 'Expected annual cash flow (NOI for all-cash purchase)';
COMMENT ON COLUMN merged_listing.expected_cash_flow_monthly IS 'Expected monthly cash flow (NOI ÷ 12)';
COMMENT ON COLUMN merged_listing.cash_on_cash_return IS 'Cash-on-Cash Return (NOI ÷ listPrice, same as cap_rate for all-cash)';
COMMENT ON COLUMN merged_listing.grm IS 'Gross Rent Multiplier (listPrice ÷ Gross Income)';
COMMENT ON COLUMN merged_listing.instant_equity_vs_median IS 'Instant equity vs median sale price (medianSalePrice - listPrice)';
COMMENT ON COLUMN merged_listing.equity_vs_zestimate IS 'Equity vs Zestimate (zestimate - listPrice)';
COMMENT ON COLUMN merged_listing.investment_metrics_updated_at IS 'Timestamp when investment metrics were last calculated';

-- Create indexes for performance on the new columns
CREATE INDEX IF NOT EXISTS idx_merged_listing_cap_rate ON merged_listing(cap_rate DESC);
CREATE INDEX IF NOT EXISTS idx_merged_listing_grm ON merged_listing(grm ASC);
CREATE INDEX IF NOT EXISTS idx_merged_listing_cash_flow ON merged_listing(expected_cash_flow_annual DESC);
CREATE INDEX IF NOT EXISTS idx_merged_listing_equity_median ON merged_listing(instant_equity_vs_median DESC);
CREATE INDEX IF NOT EXISTS idx_merged_listing_equity_zestimate ON merged_listing(equity_vs_zestimate DESC);
CREATE INDEX IF NOT EXISTS idx_merged_listing_investment_updated ON merged_listing(investment_metrics_updated_at);

-- Composite index for ranking by investment attractiveness (cap rate + equity)
CREATE INDEX IF NOT EXISTS idx_merged_listing_investment_ranking ON merged_listing(cap_rate DESC, instant_equity_vs_median DESC);

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Investment metrics columns added to merged_listing table successfully';
    RAISE NOTICE 'Added columns: gross_income, noi, cap_rate, expected_cash_flow_annual, expected_cash_flow_monthly, cash_on_cash_return, grm, instant_equity_vs_median, equity_vs_zestimate, investment_metrics_updated_at';
    RAISE NOTICE 'Created performance indexes for investment metrics';
END $$;
