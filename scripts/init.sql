-- Enable pgvector extension (required for ad_slots.embedding vector column)
CREATE EXTENSION IF NOT EXISTS vector;

-- Initialize the sponsorships table
CREATE TABLE IF NOT EXISTS sponsorships (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    sponsor_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed with sample data
INSERT INTO sponsorships (title, amount, sponsor_name, description, status) VALUES
    ('Tech Conference 2026', 5000.00, 'Acme Corp', 'Annual tech conference sponsorship', 'active'),
    ('Startup Hackathon', 2500.00, 'Innovation Labs', 'Weekend hackathon event', 'active'),
    ('Developer Meetup', 1000.00, 'Code Academy', 'Monthly developer meetup series', 'pending'),
    ('Open Source Fund', 10000.00, 'Tech Giants Inc', 'Supporting open source projects', 'active'),
    ('Student Scholarships', 3000.00, 'Future Foundation', 'Scholarships for aspiring developers', 'completed');

-- HNSW vector index for semantic (RAG) search on ad_slots.embedding.
-- Applied here for fresh Docker-based DB initializations; the Prisma migration
-- 20260223000000_rag_performance_indexes applies the same index for managed environments.
CREATE INDEX IF NOT EXISTS ad_slots_embedding_idx
ON ad_slots USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Foreign key indexes to avoid sequential scans on common JOIN / WHERE patterns.
CREATE INDEX IF NOT EXISTS campaigns_sponsor_id_idx   ON campaigns ("sponsorId");
CREATE INDEX IF NOT EXISTS creatives_campaign_id_idx  ON creatives ("campaignId");
CREATE INDEX IF NOT EXISTS placements_ad_slot_id_idx  ON placements ("adSlotId");
CREATE INDEX IF NOT EXISTS placements_campaign_id_idx ON placements ("campaignId");
CREATE INDEX IF NOT EXISTS placements_publisher_id_idx ON placements ("publisherId");
CREATE INDEX IF NOT EXISTS payments_sponsor_id_idx    ON payments ("sponsorId");
