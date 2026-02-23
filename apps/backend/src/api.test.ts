import request from 'supertest';
import type { Application } from 'express';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const generateEmbeddingMock = vi.fn();
const generateRagResponseMock = vi.fn();

const prismaMock = {
  $queryRaw: vi.fn(),
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
  $transaction: vi.fn(),
  adSlot: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
  },
  sponsor: {
    findUnique: vi.fn(),
  },
  publisher: {
    findUnique: vi.fn(),
  },
};

const getSessionMock = vi.fn();

vi.mock('./db.js', () => ({
  prisma: prismaMock,
}));

vi.mock('./betterAuth.js', () => ({
  betterAuthInstance: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock('./utils/embeddings.js', async () => {
  const actual = await vi.importActual<typeof import('./utils/embeddings.js')>('./utils/embeddings.js');
  return {
    ...actual,
    generateEmbedding: generateEmbeddingMock,
  };
});

vi.mock('./utils/llm.js', async () => {
  const actual = await vi.importActual<typeof import('./utils/llm.js')>('./utils/llm.js');
  return {
    ...actual,
    generateRagResponse: generateRagResponseMock,
  };
});

let app: Application;

beforeAll(async () => {
  ({ default: app } = await import('./app.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$queryRaw.mockResolvedValue([{ ok: 1 }]);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  prismaMock.$transaction.mockImplementation(async (operations: unknown[]) => {
    return Promise.all(operations as Array<Promise<unknown>>);
  });
  prismaMock.adSlot.findMany.mockResolvedValue([]);
  prismaMock.adSlot.count.mockResolvedValue(0);
  prismaMock.adSlot.findUnique.mockResolvedValue(null);
  prismaMock.sponsor.findUnique.mockResolvedValue(null);
  prismaMock.publisher.findUnique.mockResolvedValue(null);
  getSessionMock.mockResolvedValue(null);
  generateEmbeddingMock.mockResolvedValue(new Array(1536).fill(0.001));
  generateRagResponseMock.mockResolvedValue([]);
  process.env.RAG_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'test-api-key';
});

describe('API routes', () => {
  describe('GET /api/health', () => {
    it("returns 200 with status:'ok', timestamp, and database:'connected'", async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'ok',
          database: 'connected',
        })
      );
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('GET /api/marketplace/ad-slots', () => {
    it('returns 200 with data and pagination metadata', async () => {
      const mockSlots = [
        {
          id: 'slot-1',
          name: 'Header Banner',
          basePrice: 500,
        },
      ];
      prismaMock.adSlot.findMany.mockResolvedValue(mockSlots);
      prismaMock.adSlot.count.mockResolvedValue(1);

      const response = await request(app).get('/api/marketplace/ad-slots');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          data: mockSlots,
          pagination: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('GET /api/marketplace/ad-slots/:id', () => {
    it('returns 200 for a valid ad slot id', async () => {
      prismaMock.adSlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        name: 'Header Banner',
        publisher: { id: 'publisher-1', name: 'Dev Blog Daily' },
        placements: [],
      });

      const response = await request(app).get('/api/marketplace/ad-slots/slot-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: 'slot-1',
          name: 'Header Banner',
        })
      );
    });

    it('returns 404 for a non-existent ad slot id', async () => {
      prismaMock.adSlot.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/marketplace/ad-slots/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Ad slot not found' });
    });
  });

  describe('Campaign auth and validation', () => {
    it('GET /api/campaigns returns 401 without session cookie', async () => {
      getSessionMock.mockResolvedValue(null);

      const response = await request(app).get('/api/campaigns');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('POST /api/campaigns returns 401 without session', async () => {
      getSessionMock.mockResolvedValue(null);

      const response = await request(app).post('/api/campaigns').send({});

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('POST /api/campaigns returns 400 for missing required fields with a valid session', async () => {
      getSessionMock.mockResolvedValue({
        user: { id: 'user-1', email: 'sponsor@example.com' },
      });
      prismaMock.sponsor.findUnique.mockResolvedValue({ id: 'sponsor-1' });
      prismaMock.publisher.findUnique.mockResolvedValue(null);

      const response = await request(app).post('/api/campaigns').send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Name is required' });
    });
  });

  describe('POST /api/marketplace/rag-search', () => {
    const retrievedRows = [
      {
        id: 'slot-1',
        name: 'Fintech Podcast Slot',
        description: 'Host-read mid-roll',
        type: 'PODCAST',
        position: 'mid-roll',
        width: null,
        height: null,
        basePrice: '1200.00',
        cpmFloor: null,
        isAvailable: true,
        publisherId: 'pub-1',
        publisherName: 'Tech Talks Weekly',
        publisherWebsite: 'https://example.com',
        publisherCategory: 'Podcast',
        publisherMonthlyViews: 30000,
        publisherSubscriberCount: 18000,
        publisherIsVerified: true,
        placementCount: 4,
        similarity: 0.91,
      },
    ];

    it('returns 400 when query is missing', async () => {
      const response = await request(app).post('/api/marketplace/rag-search').send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'query is required' });
    });

    it('returns 400 when query exceeds 500 characters', async () => {
      const response = await request(app)
        .post('/api/marketplace/rag-search')
        .send({ query: 'a'.repeat(501) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'query must be between 1 and 500 characters' });
    });

    it('returns 404 when RAG feature is disabled', async () => {
      process.env.RAG_ENABLED = 'false';

      const response = await request(app)
        .post('/api/marketplace/rag-search')
        .send({ query: 'tech podcasts' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not found' });
    });

    it('returns ranked results for a valid request', async () => {
      prismaMock.$queryRawUnsafe.mockResolvedValue(retrievedRows);
      generateRagResponseMock.mockResolvedValue([
        {
          adSlotId: 'slot-1',
          rank: 1,
          relevanceScore: 0.88,
          explanation: 'Strong audience fit and format alignment.',
        },
      ]);

      const response = await request(app).post('/api/marketplace/rag-search').send({
        query: 'podcasts with fintech audiences',
        topK: 10,
        filters: { type: 'PODCAST', category: 'Podcast', available: true },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          query: 'podcasts with fintech audiences',
          phase: 'ranked',
          retrievalCount: 1,
          generationFailed: false,
          results: [
            expect.objectContaining({
              rank: 1,
              relevanceScore: expect.any(Number),
              explanation: expect.any(String),
              adSlot: expect.objectContaining({
                id: 'slot-1',
                name: 'Fintech Podcast Slot',
              }),
            }),
          ],
        })
      );
      expect(generateEmbeddingMock).toHaveBeenCalledTimes(1);
      expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      expect(generateRagResponseMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to vector results when llm generation fails', async () => {
      prismaMock.$queryRawUnsafe.mockResolvedValue(retrievedRows);
      generateRagResponseMock.mockRejectedValueOnce(new Error('LLM unavailable'));

      const response = await request(app)
        .post('/api/marketplace/rag-search')
        .send({ query: 'fintech podcast placements' });

      expect(response.status).toBe(200);
      expect(response.body.generationFailed).toBe(true);
      expect(response.body.phase).toBe('ranked');
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toEqual(
        expect.objectContaining({
          explanation: null,
        })
      );
    });

    it('returns retrieval-only results when skipRanking is true', async () => {
      prismaMock.$queryRawUnsafe.mockResolvedValue(retrievedRows);

      const response = await request(app).post('/api/marketplace/rag-search').send({
        query: 'fintech podcast placements',
        skipRanking: true,
      });

      expect(response.status).toBe(200);
      expect(response.body.phase).toBe('retrieval');
      expect(response.body.generationFailed).toBe(false);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toEqual(
        expect.objectContaining({
          explanation: null,
        })
      );
      expect(generateRagResponseMock).not.toHaveBeenCalled();
    });
  });
});
