import { Router, type Request, type Response, type IRouter } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';
import { VALID_AD_SLOT_TYPES } from '../utils/embeddings.js';
import {
  EmbeddingProviderError,
  RagRequestTimeoutError,
  ragSearch,
  type RagSearchFilters,
} from '../utils/rag.js';

const router: IRouter = Router();

const VALID_SORT = ['price-desc', 'price-asc', 'name', 'audience'] as const;
type SortBy = (typeof VALID_SORT)[number];

const MAX_LIMIT = 100;
const RAG_MAX_QUERY_LENGTH = 500;
const RAG_MAX_TOP_K = 20;

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function isRagEnabled(): boolean {
  return process.env.RAG_ENABLED?.toLowerCase() === 'true' && Boolean(process.env.OPENAI_API_KEY?.trim());
}

function sanitizeRagQuery(query: string): string {
  let sanitized = '';
  for (const char of query) {
    const code = char.charCodeAt(0);
    const isControl = (code >= 0 && code <= 31 && code !== 10) || code === 127;
    if (!isControl) sanitized += char;
  }
  return sanitized.trim();
}

function parseTopK(rawTopK: unknown): number | undefined {
  if (rawTopK === undefined || rawTopK === null || rawTopK === '') {
    return undefined;
  }

  const parsed = Number(rawTopK);
  if (!Number.isFinite(parsed)) return undefined;

  return Math.max(1, Math.min(RAG_MAX_TOP_K, Math.trunc(parsed)));
}

const ragRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: parsePositiveIntegerEnv('RAG_RATE_LIMIT_PER_MINUTE', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI search requests. Please wait a moment.' },
});

// GET /api/marketplace/ad-slots - Public ad slot listing for marketplace
router.get('/ad-slots', async (req: Request, res: Response) => {
  try {
    const {
      type,
      available,
      category,
      search,
      sortBy = 'price-desc',
      page: pageParam = '1',
      limit: limitParam = '12',
    } = req.query as Record<string, string>;

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limitParam, 10) || 12));
    const skip = (page - 1) * limit;

    const resolvedSort: SortBy = VALID_SORT.includes(sortBy as SortBy)
      ? (sortBy as SortBy)
      : 'price-desc';

    const orderBy =
      resolvedSort === 'price-asc'
        ? { basePrice: 'asc' as const }
        : resolvedSort === 'name'
          ? { name: 'asc' as const }
          : { basePrice: 'desc' as const };

    const where = {
      ...(type && { type: type as 'DISPLAY' | 'VIDEO' | 'NATIVE' | 'NEWSLETTER' | 'PODCAST' }),
      ...(available === 'true' && { isAvailable: true }),
      ...(category && { publisher: { category } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { publisher: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const include = {
      publisher: {
        select: {
          id: true,
          name: true,
          website: true,
          category: true,
          monthlyViews: true,
          subscriberCount: true,
          isVerified: true,
        },
      },
      _count: { select: { placements: true } },
    };

    // audience sort requires a post-sort since Prisma can't sort by a computed publisher field
    if (resolvedSort === 'audience') {
      const [allSlots, total] = await prisma.$transaction([
        prisma.adSlot.findMany({ where, include }),
        prisma.adSlot.count({ where }),
      ]);

      allSlots.sort((a, b) => {
        const audA =
          ((a.publisher as { monthlyViews?: number | null } | null)?.monthlyViews ?? 0) +
          ((a.publisher as { subscriberCount?: number | null } | null)?.subscriberCount ?? 0);
        const audB =
          ((b.publisher as { monthlyViews?: number | null } | null)?.monthlyViews ?? 0) +
          ((b.publisher as { subscriberCount?: number | null } | null)?.subscriberCount ?? 0);
        return audB - audA;
      });

      const data = allSlots.slice(skip, skip + limit);
      return res.json({
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    const [data, total] = await prisma.$transaction([
      prisma.adSlot.findMany({ where, include, orderBy, skip, take: limit }),
      prisma.adSlot.count({ where }),
    ]);

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching marketplace ad slots:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace ad slots' });
  }
});

// GET /api/marketplace/ad-slots/:id - Public ad slot detail for marketplace
router.get('/ad-slots/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const adSlot = await prisma.adSlot.findUnique({
      where: { id },
      include: {
        publisher: true,
        placements: {
          include: {
            campaign: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });

    if (!adSlot) {
      res.status(404).json({ error: 'Ad slot not found' });
      return;
    }

    res.json(adSlot);
  } catch (error) {
    console.error('Error fetching marketplace ad slot:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace ad slot' });
  }
});

router.get('/rag-status', (_req: Request, res: Response) => {
  res.json({ enabled: isRagEnabled() });
});

// POST /api/marketplace/rag-search - AI-assisted marketplace search
router.post('/rag-search', ragRateLimiter, async (req: Request, res: Response) => {
  if (!isRagEnabled()) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const rawQuery = req.body?.query;
    if (typeof rawQuery !== 'string') {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    const query = sanitizeRagQuery(rawQuery);
    if (query.length === 0) {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    if (query.length > RAG_MAX_QUERY_LENGTH) {
      res.status(400).json({ error: 'query must be between 1 and 500 characters' });
      return;
    }

    const filtersBody = req.body?.filters;
    if (filtersBody !== undefined && (typeof filtersBody !== 'object' || filtersBody === null)) {
      res.status(400).json({ error: 'filters must be an object' });
      return;
    }

    const skipRanking = req.body?.skipRanking;
    if (skipRanking !== undefined && typeof skipRanking !== 'boolean') {
      res.status(400).json({ error: 'skipRanking must be a boolean' });
      return;
    }

    const filters: RagSearchFilters = {};
    if (filtersBody && 'type' in filtersBody) {
      const type = (filtersBody as { type?: unknown }).type;
      if (typeof type !== 'string' || !VALID_AD_SLOT_TYPES.includes(type as (typeof VALID_AD_SLOT_TYPES)[number])) {
        res.status(400).json({ error: 'filters.type is invalid' });
        return;
      }
      filters.type = type as RagSearchFilters['type'];
    }

    if (filtersBody && 'category' in filtersBody) {
      const category = (filtersBody as { category?: unknown }).category;
      if (category !== undefined && category !== null && typeof category !== 'string') {
        res.status(400).json({ error: 'filters.category must be a string' });
        return;
      }

      const cleaned = typeof category === 'string' ? category.trim() : '';
      if (cleaned.length > 0) {
        filters.category = cleaned;
      }
    }

    if (filtersBody && 'available' in filtersBody) {
      const available = (filtersBody as { available?: unknown }).available;
      if (typeof available !== 'boolean') {
        res.status(400).json({ error: 'filters.available must be a boolean' });
        return;
      }
      filters.available = available;
    }

    const response = await ragSearch({
      query,
      topK: parseTopK(req.body?.topK),
      filters,
      skipRanking,
    });

    res.json(response);
  } catch (error) {
    if (error instanceof EmbeddingProviderError) {
      res.status(503).json({ error: 'AI search temporarily unavailable' });
      return;
    }

    if (error instanceof RagRequestTimeoutError) {
      res.status(503).json({ error: 'RAG request timed out' });
      return;
    }

    console.error('Error performing RAG marketplace search:', error);
    res.status(500).json({ error: 'Failed to perform AI marketplace search' });
  }
});

export default router;
