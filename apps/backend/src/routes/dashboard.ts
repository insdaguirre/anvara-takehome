import { Router, type Request, type Response, type IRouter } from 'express';
import { authMiddleware, type AuthRequest } from '../auth.js';
import { prisma } from '../db.js';

const router: IRouter = Router();

// GET /api/dashboard - Get role-scoped dashboard aggregates for authenticated user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.user.role === 'SPONSOR') {
      if (!req.user.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const [totalCampaigns, activeCampaigns, totals] = await Promise.all([
        prisma.campaign.count({
          where: { sponsorId: req.user.sponsorId },
        }),
        prisma.campaign.count({
          where: { sponsorId: req.user.sponsorId, status: 'ACTIVE' },
        }),
        prisma.campaign.aggregate({
          where: { sponsorId: req.user.sponsorId },
          _sum: { budget: true, spent: true },
        }),
      ]);

      res.json({
        role: 'SPONSOR',
        totalCampaigns,
        activeCampaigns,
        totalBudget: totals._sum.budget ?? 0,
        totalSpent: totals._sum.spent ?? 0,
      });
      return;
    }

    if (!req.user.publisherId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const [totalSlots, availableSlots, totals] = await Promise.all([
      prisma.adSlot.count({
        where: { publisherId: req.user.publisherId },
      }),
      prisma.adSlot.count({
        where: { publisherId: req.user.publisherId, isAvailable: true },
      }),
      prisma.adSlot.aggregate({
        where: { publisherId: req.user.publisherId },
        _sum: { basePrice: true },
      }),
    ]);

    res.json({
      role: 'PUBLISHER',
      totalSlots,
      availableSlots,
      inventoryValue: totals._sum.basePrice ?? 0,
    });
  } catch (error) {
    console.error('Error fetching role dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/dashboard/stats - Get overall platform stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [sponsorCount, publisherCount, activeCampaigns, totalPlacements, placementMetrics] =
      await Promise.all([
        prisma.sponsor.count({ where: { isActive: true } }),
        prisma.publisher.count({ where: { isActive: true } }),
        prisma.campaign.count({ where: { status: 'ACTIVE' } }),
        prisma.placement.count(),
        prisma.placement.aggregate({
          _sum: {
            impressions: true,
            clicks: true,
            conversions: true,
          },
        }),
      ]);

    res.json({
      sponsors: sponsorCount,
      publishers: publisherCount,
      activeCampaigns,
      totalPlacements,
      metrics: {
        totalImpressions: placementMetrics._sum.impressions || 0,
        totalClicks: placementMetrics._sum.clicks || 0,
        totalConversions: placementMetrics._sum.conversions || 0,
        avgCtr: placementMetrics._sum.impressions
          ? (
              ((placementMetrics._sum.clicks || 0) / placementMetrics._sum.impressions) *
              100
            ).toFixed(2)
          : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
