import { describe, expect, it, vi } from 'vitest';
import { LruTtlCache } from './cache.js';

describe('LruTtlCache', () => {
  it('evicts least recently used entries when max size is exceeded', () => {
    const cache = new LruTtlCache<string, number>(2, 10_000);

    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1); // refresh recency for a
    cache.set('c', 3);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('expires entries based on ttl', () => {
    vi.useFakeTimers();
    try {
      const cache = new LruTtlCache<string, string>(2, 1000);
      cache.set('key', 'value');

      vi.advanceTimersByTime(999);
      expect(cache.get('key')).toBe('value');

      vi.advanceTimersByTime(2);
      expect(cache.get('key')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

