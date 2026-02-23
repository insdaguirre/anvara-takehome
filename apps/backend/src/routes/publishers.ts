import { Router, type Request, type Response, type IRouter } from 'express';
import { authMiddleware, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma } from '../db.js';
import { getParam, isValidEmail } from '../utils/helpers.js';
import { upsertAdSlotEmbedding } from '../utils/embeddings.js';

const router: IRouter = Router();

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return 'code' in error && (error as { code?: unknown }).code === 'P2002';
}

function parseNonNegativeInteger(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

// GET /api/publishers - List all publishers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const publishers = await prisma.publisher.findMany({
      include: {
        _count: {
          select: { adSlots: true, placements: true },
        },
      },
      orderBy: { monthlyViews: 'desc' },
    });
    res.json(publishers);
  } catch (error) {
    console.error('Error fetching publishers:', error);
    res.status(500).json({ error: 'Failed to fetch publishers' });
  }
});

// GET /api/publishers/:id - Get single publisher with ad slots
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const publisher = await prisma.publisher.findUnique({
      where: { id },
      include: {
        adSlots: true,
        placements: {
          include: {
            campaign: { select: { name: true, sponsor: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!publisher) {
      res.status(404).json({ error: 'Publisher not found' });
      return;
    }

    res.json(publisher);
  } catch (error) {
    console.error('Error fetching publisher:', error);
    res.status(500).json({ error: 'Failed to fetch publisher' });
  }
});

// PUT /api/publishers/:id - Update publisher profile
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['PUBLISHER']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = getParam(req.params.id);

      if (!req.user?.publisherId || req.user.publisherId !== id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const existingPublisher = await prisma.publisher.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existingPublisher) {
        res.status(404).json({ error: 'Publisher not found' });
        return;
      }

      const {
        name,
        email,
        website,
        avatar,
        bio,
        category,
        monthlyViews,
        subscriberCount,
      } = req.body as Record<string, unknown>;

      if (
        name === undefined &&
        email === undefined &&
        website === undefined &&
        avatar === undefined &&
        bio === undefined &&
        category === undefined &&
        monthlyViews === undefined &&
        subscriberCount === undefined
      ) {
        res.status(400).json({ error: 'At least one field is required for update' });
        return;
      }

      const data: Record<string, string | number | null> = {};

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          res.status(400).json({ error: 'name must be a non-empty string' });
          return;
        }
        data.name = name.trim();
      }

      if (email !== undefined) {
        if (typeof email !== 'string' || email.trim().length === 0 || !isValidEmail(email.trim())) {
          res.status(400).json({ error: 'email must be a valid email address' });
          return;
        }
        data.email = email.trim();
      }

      if (website !== undefined) {
        if (website !== null && typeof website !== 'string') {
          res.status(400).json({ error: 'website must be a string or null' });
          return;
        }
        data.website = website === null ? null : website.trim();
      }

      if (avatar !== undefined) {
        if (avatar !== null && typeof avatar !== 'string') {
          res.status(400).json({ error: 'avatar must be a string or null' });
          return;
        }
        data.avatar = avatar === null ? null : avatar.trim();
      }

      if (bio !== undefined) {
        if (bio !== null && typeof bio !== 'string') {
          res.status(400).json({ error: 'bio must be a string or null' });
          return;
        }
        data.bio = bio === null ? null : bio.trim();
      }

      if (category !== undefined) {
        if (category !== null && typeof category !== 'string') {
          res.status(400).json({ error: 'category must be a string or null' });
          return;
        }
        data.category = category === null ? null : category.trim();
      }

      if (monthlyViews !== undefined) {
        const parsed = parseNonNegativeInteger(monthlyViews);
        if (parsed === null) {
          res.status(400).json({ error: 'monthlyViews must be a non-negative integer' });
          return;
        }
        data.monthlyViews = parsed;
      }

      if (subscriberCount !== undefined) {
        const parsed = parseNonNegativeInteger(subscriberCount);
        if (parsed === null) {
          res.status(400).json({ error: 'subscriberCount must be a non-negative integer' });
          return;
        }
        data.subscriberCount = parsed;
      }

      const updatedPublisher = await prisma.publisher.update({
        where: { id },
        data,
      });

      // Publisher fields are part of ad-slot embeddings; refresh all slots asynchronously.
      void prisma.adSlot
        .findMany({ where: { publisherId: id }, select: { id: true } })
        .then((adSlots) => Promise.all(adSlots.map((adSlot) => upsertAdSlotEmbedding(adSlot.id))))
        .catch((embeddingError) => {
          console.error(`Failed to refresh embeddings for publisher ${id}:`, embeddingError);
        });

      res.status(200).json(updatedPublisher);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        res.status(409).json({ error: 'A publisher with that email already exists' });
        return;
      }

      console.error('Error updating publisher:', error);
      res.status(500).json({ error: 'Failed to update publisher' });
    }
  }
);

export default router;
