import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateEmbeddingMock: vi.fn(),
  generateRagResponseMock: vi.fn(),
  prismaMock: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  },
  EmbeddingProviderError: class EmbeddingProviderError extends Error {},
}));

vi.mock('../db.js', () => ({
  prisma: mocks.prismaMock,
}));

vi.mock('./embeddings.js', () => ({
  EmbeddingProviderError: mocks.EmbeddingProviderError,
  VALID_AD_SLOT_TYPES: ['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST'],
  generateEmbedding: mocks.generateEmbeddingMock,
}));

vi.mock('./llm.js', () => ({
  generateRagResponse: mocks.generateRagResponseMock,
}));

import { ragSearch } from './rag.js';

const vectorRows = [
  {
    id: 'slot-1',
    name: 'Newsletter Sponsor Block',
    description: 'Top sponsor placement',
    type: 'NEWSLETTER',
    position: 'top',
    width: null,
    height: null,
    basePrice: '500.00',
    cpmFloor: null,
    isAvailable: true,
    publisherId: 'pub-1',
    publisherName: 'Tech Weekly',
    publisherWebsite: 'https://techweekly.example',
    publisherCategory: 'Newsletter',
    publisherMonthlyViews: 150000,
    publisherSubscriberCount: 45000,
    publisherIsVerified: true,
    placementCount: 8,
    similarity: 0.82,
  },
];

describe('ragSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAG_TOP_K = '10';
    process.env.RAG_SIMILARITY_THRESHOLD = '0.3';

    mocks.generateEmbeddingMock.mockResolvedValue(new Array(1536).fill(0.002));
    mocks.prismaMock.$executeRawUnsafe.mockResolvedValue(1);
    mocks.prismaMock.$queryRawUnsafe.mockResolvedValue(vectorRows);
    mocks.prismaMock.$transaction.mockImplementation(async (operations: unknown[]) => {
      return Promise.all(operations as Array<Promise<unknown>>);
    });
  });

  it('returns validated llm-ranked results and drops unknown ad slot ids', async () => {
    mocks.generateRagResponseMock.mockResolvedValue([
      {
        adSlotId: 'unknown-slot',
        rank: 1,
        relevanceScore: 0.9,
        explanation: 'Invalid id',
      },
      {
        adSlotId: 'slot-1',
        rank: 2,
        relevanceScore: 0.78,
        explanation: 'Strong category and audience fit.',
      },
    ]);

    const response = await ragSearch({
      query: 'newsletter sponsorships',
      filters: { type: 'NEWSLETTER' },
    });

    expect(response.generationFailed).toBe(false);
    expect(response.phase).toBe('ranked');
    expect(response.retrievalCount).toBe(1);
    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        relevanceScore: 0.78,
        explanation: 'Strong category and audience fit.',
        adSlot: expect.objectContaining({ id: 'slot-1' }),
      })
    );
  });

  it('falls back to vector similarity when llm ranking fails', async () => {
    mocks.generateRagResponseMock.mockRejectedValueOnce(new Error('LLM timeout'));

    const response = await ragSearch({
      query: 'tech podcast inventory',
      filters: { available: true },
    });

    expect(response.generationFailed).toBe(true);
    expect(response.phase).toBe('ranked');
    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        explanation: null,
        adSlot: expect.objectContaining({ id: 'slot-1' }),
      })
    );
  });

  it('times out long-running requests after 12 seconds', async () => {
    vi.useFakeTimers();
    try {
      mocks.generateEmbeddingMock.mockImplementation(() => new Promise<number[]>(() => {}));

      const pending = ragSearch({
        query: 'slow query',
        filters: { type: 'NEWSLETTER' },
      });
      const rejection = expect(pending).rejects.toThrow('RAG request timed out');

      await vi.advanceTimersByTimeAsync(12_001);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});
