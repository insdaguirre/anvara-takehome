interface CacheEntry<V> {
  value: V;
  expiresAt: number | null;
}

export class LruTtlCache<K, V> {
  private readonly store = new Map<K, CacheEntry<V>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new Error('maxEntries must be a positive integer');
    }

    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      throw new Error('ttlMs must be a non-negative number');
    }
  }

  get size(): number {
    return this.store.size;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    // Move to most recently used position.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    const expiresAt = this.ttlMs > 0 ? Date.now() + this.ttlMs : null;
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, { value, expiresAt });
    if (this.store.size > this.maxEntries) {
      this.pruneExpiredEntries();
      this.evictLeastRecentlyUsed();
    }
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  private pruneExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  private evictLeastRecentlyUsed(): void {
    while (this.store.size > this.maxEntries) {
      const firstKey = this.store.keys().next().value as K | undefined;
      if (firstKey === undefined) return;
      this.store.delete(firstKey);
    }
  }
}
