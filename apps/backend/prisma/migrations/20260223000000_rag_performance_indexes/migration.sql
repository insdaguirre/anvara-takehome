CREATE INDEX IF NOT EXISTS ad_slots_embedding_idx
ON ad_slots USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS placements_ad_slot_id_idx
ON placements ("adSlotId");
