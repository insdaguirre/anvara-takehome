import { Router, type Request, type Response, type IRouter } from 'express';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();

// GET /api/marketplace/ad-slots - Public ad slot listing for marketplace
router.get('/ad-slots', async (req: Request, res: Response) => {
  try {
    const { type, available } = req.query;

    const adSlots = await prisma.adSlot.findMany({
      where: {
        ...(type && {
          type: type as string as 'DISPLAY' | 'VIDEO' | 'NATIVE' | 'NEWSLETTER' | 'PODCAST',
        }),
        ...(available === 'true' && { isAvailable: true }),
      },
      include: {
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
      },
      orderBy: { basePrice: 'desc' },
    });

    res.json(adSlots);
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
