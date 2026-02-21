import request from 'supertest';
import type { Application } from 'express';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  $queryRaw: vi.fn(),
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

let app: Application;

beforeAll(async () => {
  ({ default: app } = await import('./app.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$queryRaw.mockResolvedValue([{ ok: 1 }]);
  prismaMock.$transaction.mockImplementation(async (operations: unknown[]) => {
    return Promise.all(operations as Array<Promise<unknown>>);
  });
  prismaMock.adSlot.findMany.mockResolvedValue([]);
  prismaMock.adSlot.count.mockResolvedValue(0);
  prismaMock.adSlot.findUnique.mockResolvedValue(null);
  prismaMock.sponsor.findUnique.mockResolvedValue(null);
  prismaMock.publisher.findUnique.mockResolvedValue(null);
  getSessionMock.mockResolvedValue(null);
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
});
