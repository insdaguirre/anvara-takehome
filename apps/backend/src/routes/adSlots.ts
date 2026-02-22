import { Router, type Response, type IRouter } from 'express';
import { authMiddleware, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();

const AD_SLOT_TYPES = ['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST'] as const;
const VALID_AD_SLOT_SORT = [
  'newest',
  'oldest',
  'price-high',
  'price-low',
  'name',
  'availability',
] as const;
type AdSlotType = (typeof AD_SLOT_TYPES)[number];
type AdSlotSortBy = (typeof VALID_AD_SLOT_SORT)[number];

function parsePositiveNumber(value: unknown): number | null {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return numberValue;
}

function parseNonNegativeNumber(value: unknown): number | null {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return null;
  return numberValue;
}

function parsePositiveInteger(value: unknown): number | null {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) return null;
  return numberValue;
}

function parseIntegerQuery(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

// GET /api/ad-slots - List current publisher's ad slots
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['PUBLISHER']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.publisherId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const rawPage = parseIntegerQuery(req.query.page);
      const rawLimit = parseIntegerQuery(req.query.limit);
      const page = Math.max(1, rawPage ?? 1);
      const limit = Math.min(100, Math.max(1, rawLimit ?? 12));
      const skip = (page - 1) * limit;

      const rawType = typeof req.query.type === 'string' ? req.query.type : undefined;
      const type = AD_SLOT_TYPES.includes(rawType as AdSlotType)
        ? (rawType as AdSlotType)
        : undefined;

      const rawAvailable =
        typeof req.query.available === 'string' ? req.query.available : undefined;
      const available =
        rawAvailable === 'true' ? true : rawAvailable === 'false' ? false : undefined;

      const rawSortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined;
      const sortBy: AdSlotSortBy = VALID_AD_SLOT_SORT.includes(rawSortBy as AdSlotSortBy)
        ? (rawSortBy as AdSlotSortBy)
        : 'newest';

      const orderBy =
        sortBy === 'oldest'
          ? { createdAt: 'asc' as const }
          : sortBy === 'price-high'
            ? { basePrice: 'desc' as const }
            : sortBy === 'price-low'
              ? { basePrice: 'asc' as const }
              : sortBy === 'name'
                ? { name: 'asc' as const }
                : sortBy === 'availability'
                  ? { isAvailable: 'desc' as const }
                  : { createdAt: 'desc' as const };

      const where = {
        publisherId: req.user.publisherId,
        ...(type && { type }),
        ...(available !== undefined && { isAvailable: available }),
      };

      const [total, adSlots] = await prisma.$transaction([
        prisma.adSlot.count({ where }),
        prisma.adSlot.findMany({
          where,
          include: {
            publisher: { select: { id: true, name: true, category: true, monthlyViews: true } },
            _count: { select: { placements: true } },
          },
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      res.json({
        data: adSlots,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching ad slots:', error);
      res.status(500).json({ error: 'Failed to fetch ad slots' });
    }
  }
);

// GET /api/ad-slots/:id - Get single ad slot for current publisher
router.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['PUBLISHER']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.publisherId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

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

      if (adSlot.publisherId !== req.user.publisherId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      res.json(adSlot);
    } catch (error) {
      console.error('Error fetching ad slot:', error);
      res.status(500).json({ error: 'Failed to fetch ad slot' });
    }
  }
);

// POST /api/ad-slots - Create new ad slot for current publisher
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['PUBLISHER']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.publisherId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { name, description, type, position, width, height, basePrice, cpmFloor, isAvailable } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      if (typeof type !== 'string' || !AD_SLOT_TYPES.includes(type as AdSlotType)) {
        res.status(400).json({ error: 'Invalid ad slot type' });
        return;
      }

      const parsedBasePrice = parsePositiveNumber(basePrice);
      if (parsedBasePrice === null) {
        res.status(400).json({ error: 'basePrice must be greater than 0' });
        return;
      }

      if (description !== undefined && description !== null && typeof description !== 'string') {
        res.status(400).json({ error: 'description must be a string' });
        return;
      }

      if (position !== undefined && position !== null && typeof position !== 'string') {
        res.status(400).json({ error: 'position must be a string' });
        return;
      }

      const parsedWidth = width === undefined || width === null ? undefined : parsePositiveInteger(width);
      if (width !== undefined && width !== null && parsedWidth === null) {
        res.status(400).json({ error: 'width must be a positive integer' });
        return;
      }

      const parsedHeight = height === undefined || height === null ? undefined : parsePositiveInteger(height);
      if (height !== undefined && height !== null && parsedHeight === null) {
        res.status(400).json({ error: 'height must be a positive integer' });
        return;
      }

      const parsedCpmFloor = cpmFloor === undefined || cpmFloor === null ? undefined : parseNonNegativeNumber(cpmFloor);
      if (cpmFloor !== undefined && cpmFloor !== null && parsedCpmFloor === null) {
        res.status(400).json({ error: 'cpmFloor must be a non-negative number' });
        return;
      }

      if (isAvailable !== undefined && typeof isAvailable !== 'boolean') {
        res.status(400).json({ error: 'isAvailable must be a boolean' });
        return;
      }

      const adSlot = await prisma.adSlot.create({
        data: {
          name: name.trim(),
          description,
          type: type as AdSlotType,
          position,
          width: parsedWidth,
          height: parsedHeight,
          basePrice: parsedBasePrice,
          cpmFloor: parsedCpmFloor,
          ...(isAvailable !== undefined && { isAvailable }),
          publisherId: req.user.publisherId,
        },
        include: {
          publisher: { select: { id: true, name: true } },
        },
      });

      res.status(201).json(adSlot);
    } catch (error) {
      console.error('Error creating ad slot:', error);
      res.status(500).json({ error: 'Failed to create ad slot' });
    }
  }
);

// POST /api/ad-slots/:id/book - Book an ad slot as sponsor
router.post(
  '/:id/book',
  authMiddleware,
  roleMiddleware(['SPONSOR']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const id = getParam(req.params.id);
      const { message } = req.body;

      const adSlot = await prisma.adSlot.findUnique({
        where: { id },
        include: { publisher: true },
      });

      if (!adSlot) {
        res.status(404).json({ error: 'Ad slot not found' });
        return;
      }

      if (!adSlot.isAvailable) {
        res.status(400).json({ error: 'Ad slot is no longer available' });
        return;
      }

      const updatedSlot = await prisma.adSlot.update({
        where: { id },
        data: { isAvailable: false },
        include: {
          publisher: { select: { id: true, name: true } },
        },
      });

      console.log(
        `Ad slot ${id} booked by sponsor ${req.user.sponsorId}. Message: ${message || 'None'}`
      );

      res.json({
        success: true,
        message: 'Ad slot booked successfully!',
        adSlot: updatedSlot,
      });
    } catch (error) {
      console.error('Error booking ad slot:', error);
      res.status(500).json({ error: 'Failed to book ad slot' });
    }
  }
);

// POST /api/ad-slots/:id/unbook - Reset ad slot to available (for testing)
router.post(
  '/:id/unbook',
  authMiddleware,
  roleMiddleware(['SPONSOR']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = getParam(req.params.id);

      const existing = await prisma.adSlot.findUnique({ where: { id }, select: { id: true } });
      if (!existing) {
        res.status(404).json({ error: 'Ad slot not found' });
        return;
      }

      const updatedSlot = await prisma.adSlot.update({
        where: { id },
        data: { isAvailable: true },
        include: {
          publisher: { select: { id: true, name: true } },
        },
      });

      res.json({
        success: true,
        message: 'Ad slot is now available again',
        adSlot: updatedSlot,
      });
    } catch (error) {
      console.error('Error unbooking ad slot:', error);
      res.status(500).json({ error: 'Failed to unbook ad slot' });
    }
  }
);

// PUT /api/ad-slots/:id - Update ad slot details
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['PUBLISHER']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.publisherId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const id = getParam(req.params.id);
      const existingAdSlot = await prisma.adSlot.findUnique({
        where: { id },
        select: { id: true, publisherId: true },
      });

      if (!existingAdSlot) {
        res.status(404).json({ error: 'Ad slot not found' });
        return;
      }

      if (existingAdSlot.publisherId !== req.user.publisherId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { name, description, type, position, width, height, basePrice, cpmFloor, isAvailable } =
        req.body;

      if (
        name === undefined &&
        description === undefined &&
        type === undefined &&
        position === undefined &&
        width === undefined &&
        height === undefined &&
        basePrice === undefined &&
        cpmFloor === undefined &&
        isAvailable === undefined
      ) {
        res.status(400).json({ error: 'At least one field is required for update' });
        return;
      }

      const data: Record<string, unknown> = {};

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          res.status(400).json({ error: 'name must be a non-empty string' });
          return;
        }
        data.name = name.trim();
      }

      if (description !== undefined) {
        if (description !== null && typeof description !== 'string') {
          res.status(400).json({ error: 'description must be a string or null' });
          return;
        }
        data.description = description;
      }

      if (type !== undefined) {
        if (typeof type !== 'string' || !AD_SLOT_TYPES.includes(type as AdSlotType)) {
          res.status(400).json({ error: 'Invalid ad slot type' });
          return;
        }
        data.type = type as AdSlotType;
      }

      if (position !== undefined) {
        if (position !== null && typeof position !== 'string') {
          res.status(400).json({ error: 'position must be a string or null' });
          return;
        }
        data.position = position;
      }

      if (width !== undefined) {
        if (width === null) {
          data.width = null;
        } else {
          const parsedWidth = parsePositiveInteger(width);
          if (parsedWidth === null) {
            res.status(400).json({ error: 'width must be a positive integer or null' });
            return;
          }
          data.width = parsedWidth;
        }
      }

      if (height !== undefined) {
        if (height === null) {
          data.height = null;
        } else {
          const parsedHeight = parsePositiveInteger(height);
          if (parsedHeight === null) {
            res.status(400).json({ error: 'height must be a positive integer or null' });
            return;
          }
          data.height = parsedHeight;
        }
      }

      if (basePrice !== undefined) {
        const parsedBasePrice = parsePositiveNumber(basePrice);
        if (parsedBasePrice === null) {
          res.status(400).json({ error: 'basePrice must be a positive number' });
          return;
        }
        data.basePrice = parsedBasePrice;
      }

      if (cpmFloor !== undefined) {
        if (cpmFloor === null) {
          data.cpmFloor = null;
        } else {
          const parsedCpmFloor = parseNonNegativeNumber(cpmFloor);
          if (parsedCpmFloor === null) {
            res.status(400).json({ error: 'cpmFloor must be a non-negative number or null' });
            return;
          }
          data.cpmFloor = parsedCpmFloor;
        }
      }

      if (isAvailable !== undefined) {
        if (typeof isAvailable !== 'boolean') {
          res.status(400).json({ error: 'isAvailable must be a boolean' });
          return;
        }
        data.isAvailable = isAvailable;
      }

      const updatedAdSlot = await prisma.adSlot.update({
        where: { id },
        data,
        include: {
          publisher: { select: { id: true, name: true } },
          _count: { select: { placements: true } },
        },
      });

      res.status(200).json(updatedAdSlot);
    } catch (error) {
      console.error('Error updating ad slot:', error);
      res.status(500).json({ error: 'Failed to update ad slot' });
    }
  }
);

// DELETE /api/ad-slots/:id - Delete ad slot
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['PUBLISHER']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.publisherId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const id = getParam(req.params.id);
      const existingAdSlot = await prisma.adSlot.findUnique({
        where: { id },
        select: { id: true, publisherId: true },
      });

      if (!existingAdSlot) {
        res.status(404).json({ error: 'Ad slot not found' });
        return;
      }

      if (existingAdSlot.publisherId !== req.user.publisherId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      await prisma.adSlot.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting ad slot:', error);
      res.status(500).json({ error: 'Failed to delete ad slot' });
    }
  }
);

export default router;
