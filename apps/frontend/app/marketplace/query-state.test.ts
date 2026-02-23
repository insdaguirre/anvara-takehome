import { describe, expect, it } from 'vitest';
import {
  parseMarketplaceQueryState,
  toMarketplaceQueryString,
  type MarketplaceQueryState,
} from './query-state';

describe('marketplace query state', () => {
  it('hydrates rag mode and ragQuery from URL params', () => {
    const parsed = parseMarketplaceQueryState({
      mode: 'rag',
      ragQuery: '  fintech podcast placements  ',
      type: 'PODCAST',
      category: 'Podcast',
      available: 'false',
    });

    expect(parsed.mode).toBe('rag');
    expect(parsed.ragQuery).toBe('fintech podcast placements');
    expect(parsed.type).toBe('PODCAST');
    expect(parsed.category).toBe('Podcast');
    expect(parsed.availableOnly).toBe(false);
  });

  it('serializes rag mode query string with ragQuery and filters', () => {
    const state: MarketplaceQueryState = {
      page: 1,
      limit: 12,
      mode: 'rag',
      ragQuery: 'tech podcasts',
      type: 'PODCAST',
      category: 'Podcast',
      availableOnly: false,
      sortBy: 'price-desc',
      search: '',
    };

    const queryString = toMarketplaceQueryString(state);

    expect(queryString).toContain('mode=rag');
    expect(queryString).toContain('ragQuery=tech+podcasts');
    expect(queryString).toContain('type=PODCAST');
    expect(queryString).toContain('category=Podcast');
    expect(queryString).toContain('available=false');
    expect(queryString).not.toContain('search=');
  });
});
