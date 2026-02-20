import { Router, type Request, type Response, type IRouter } from 'express';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();

const VALID_SORT = ['price-desc', 'price-asc', 'name', 'audience'] as const;
type SortBy = (typeof VALID_SORT)[number];

const MAX_LIMIT = 100;

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

export default router;
