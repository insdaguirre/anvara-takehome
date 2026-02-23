-- Add indexes on foreign key columns that are frequently used in WHERE / JOIN clauses.
-- The adSlotId index on placements already exists from the previous migration (20260223000000);
-- the remaining FK columns are covered here.

CREATE INDEX IF NOT EXISTS campaigns_sponsor_id_idx
ON campaigns ("sponsorId");

CREATE INDEX IF NOT EXISTS creatives_campaign_id_idx
ON creatives ("campaignId");

CREATE INDEX IF NOT EXISTS placements_campaign_id_idx
ON placements ("campaignId");

CREATE INDEX IF NOT EXISTS placements_publisher_id_idx
ON placements ("publisherId");

CREATE INDEX IF NOT EXISTS payments_sponsor_id_idx
ON payments ("sponsorId");
