import { Router, type Response, type IRouter } from 'express';
import { authMiddleware, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();

const AD_SLOT_TYPES = ['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST'] as const;

// GET /api/ad-slots - List current publisher's ad slots
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['PUBLISHER']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { type, available } = req.query;

      if (!req.user?.publisherId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const adSlots = await prisma.adSlot.findMany({
        where: {
          publisherId: req.user.publisherId,
          ...(type && {
            type: type as string as 'DISPLAY' | 'VIDEO' | 'NATIVE' | 'NEWSLETTER' | 'PODCAST',
          }),
          ...(available === 'true' && { isAvailable: true }),
        },
        include: {
          publisher: { select: { id: true, name: true, category: true, monthlyViews: true } },
          _count: { select: { placements: true } },
        },
        orderBy: { basePrice: 'desc' },
      });

      res.json(adSlots);
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

      const { name, description, type, basePrice } = req.body;

      if (!name || !type || basePrice === undefined || basePrice === null) {
        res.status(400).json({
          error: 'Name, type, and basePrice are required',
        });
        return;
      }

      if (!AD_SLOT_TYPES.includes(type)) {
        res.status(400).json({ error: 'Invalid ad slot type' });
        return;
      }

      if (Number(basePrice) <= 0) {
        res.status(400).json({ error: 'basePrice must be greater than 0' });
        return;
      }

      const adSlot = await prisma.adSlot.create({
        data: {
          name,
          description,
          type,
          basePrice,
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

// TODO: Add PUT /api/ad-slots/:id endpoint
// TODO: Add DELETE /api/ad-slots/:id endpoint

export default router;

