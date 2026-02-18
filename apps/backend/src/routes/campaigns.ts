import { Router, type Response, type IRouter } from 'express';
import { authMiddleware, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();
const CAMPAIGN_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
] as const;

type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

function parseDateInput(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseStringArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return null;
  }
  return value;
}

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

// GET /api/campaigns - List all campaigns
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['SPONSOR']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.query;

      if (!req.user?.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      if (status && (typeof status !== 'string' || !CAMPAIGN_STATUSES.includes(status as CampaignStatus))) {
        res.status(400).json({ error: 'Invalid campaign status filter' });
        return;
      }

      const campaigns = await prisma.campaign.findMany({
        where: {
          ...(status && { status: status as CampaignStatus }),
          sponsorId: req.user.sponsorId,
        },
        include: {
          sponsor: { select: { id: true, name: true, logo: true } },
          _count: { select: { creatives: true, placements: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }
);

// GET /api/campaigns/:id - Get single campaign with details
router.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['SPONSOR']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const id = getParam(req.params.id);
      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
          sponsor: true,
          creatives: true,
          placements: {
            include: {
              adSlot: true,
              publisher: { select: { id: true, name: true, category: true } },
            },
          },
        },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      if (campaign.sponsorId !== req.user.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      res.json(campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  }
);

// POST /api/campaigns - Create new campaign
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['SPONSOR']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const {
        name,
        description,
        budget,
        cpmRate,
        cpcRate,
        startDate,
        endDate,
        targetCategories,
        targetRegions,
      } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const parsedBudget = parsePositiveNumber(budget);
      if (parsedBudget === null) {
        res.status(400).json({ error: 'budget must be a positive number' });
        return;
      }

      const parsedStartDate = parseDateInput(startDate);
      const parsedEndDate = parseDateInput(endDate);
      if (!parsedStartDate || !parsedEndDate) {
        res.status(400).json({ error: 'startDate and endDate must be valid dates' });
        return;
      }

      if (parsedEndDate < parsedStartDate) {
        res.status(400).json({ error: 'endDate must be after startDate' });
        return;
      }

      if (description !== undefined && description !== null && typeof description !== 'string') {
        res.status(400).json({ error: 'description must be a string' });
        return;
      }

      const parsedTargetCategories = parseStringArray(targetCategories);
      const parsedTargetRegions = parseStringArray(targetRegions);
      if (!parsedTargetCategories || !parsedTargetRegions) {
        res.status(400).json({
          error: 'targetCategories and targetRegions must be arrays of strings',
        });
        return;
      }

      const parsedCpmRate = cpmRate === undefined || cpmRate === null ? undefined : parseNonNegativeNumber(cpmRate);
      const parsedCpcRate = cpcRate === undefined || cpcRate === null ? undefined : parseNonNegativeNumber(cpcRate);
      if ((cpmRate !== undefined && cpmRate !== null && parsedCpmRate === null) || (cpcRate !== undefined && cpcRate !== null && parsedCpcRate === null)) {
        res.status(400).json({ error: 'cpmRate and cpcRate must be non-negative numbers' });
        return;
      }

      const campaign = await prisma.campaign.create({
        data: {
          name: name.trim(),
          description,
          budget: parsedBudget,
          cpmRate: parsedCpmRate,
          cpcRate: parsedCpcRate,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          targetCategories: parsedTargetCategories,
          targetRegions: parsedTargetRegions,
          sponsorId: req.user.sponsorId,
        },
        include: {
          sponsor: { select: { id: true, name: true } },
        },
      });

      res.status(201).json(campaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  }
);

// PUT /api/campaigns/:id - Update campaign details
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['SPONSOR']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const id = getParam(req.params.id);
      const existingCampaign = await prisma.campaign.findUnique({
        where: { id },
        select: { sponsorId: true, startDate: true, endDate: true },
      });

      if (!existingCampaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      if (existingCampaign.sponsorId !== req.user.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const {
        name,
        description,
        budget,
        cpmRate,
        cpcRate,
        startDate,
        endDate,
        targetCategories,
        targetRegions,
        status,
      } = req.body;

      if (
        name === undefined &&
        description === undefined &&
        budget === undefined &&
        cpmRate === undefined &&
        cpcRate === undefined &&
        startDate === undefined &&
        endDate === undefined &&
        targetCategories === undefined &&
        targetRegions === undefined &&
        status === undefined
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

      if (budget !== undefined) {
        const parsedBudget = parsePositiveNumber(budget);
        if (parsedBudget === null) {
          res.status(400).json({ error: 'budget must be a positive number' });
          return;
        }
        data.budget = parsedBudget;
      }

      if (cpmRate !== undefined) {
        if (cpmRate === null) {
          data.cpmRate = null;
        } else {
          const parsedCpmRate = parseNonNegativeNumber(cpmRate);
          if (parsedCpmRate === null) {
            res.status(400).json({ error: 'cpmRate must be a non-negative number or null' });
            return;
          }
          data.cpmRate = parsedCpmRate;
        }
      }

      if (cpcRate !== undefined) {
        if (cpcRate === null) {
          data.cpcRate = null;
        } else {
          const parsedCpcRate = parseNonNegativeNumber(cpcRate);
          if (parsedCpcRate === null) {
            res.status(400).json({ error: 'cpcRate must be a non-negative number or null' });
            return;
          }
          data.cpcRate = parsedCpcRate;
        }
      }

      let parsedStartDate = existingCampaign.startDate;
      let parsedEndDate = existingCampaign.endDate;

      if (startDate !== undefined) {
        const value = parseDateInput(startDate);
        if (!value) {
          res.status(400).json({ error: 'startDate must be a valid date' });
          return;
        }
        parsedStartDate = value;
        data.startDate = value;
      }

      if (endDate !== undefined) {
        const value = parseDateInput(endDate);
        if (!value) {
          res.status(400).json({ error: 'endDate must be a valid date' });
          return;
        }
        parsedEndDate = value;
        data.endDate = value;
      }

      if (parsedEndDate < parsedStartDate) {
        res.status(400).json({ error: 'endDate must be after startDate' });
        return;
      }

      if (targetCategories !== undefined) {
        const parsedTargetCategories = parseStringArray(targetCategories);
        if (!parsedTargetCategories) {
          res.status(400).json({ error: 'targetCategories must be an array of strings' });
          return;
        }
        data.targetCategories = parsedTargetCategories;
      }

      if (targetRegions !== undefined) {
        const parsedTargetRegions = parseStringArray(targetRegions);
        if (!parsedTargetRegions) {
          res.status(400).json({ error: 'targetRegions must be an array of strings' });
          return;
        }
        data.targetRegions = parsedTargetRegions;
      }

      if (status !== undefined) {
        if (typeof status !== 'string' || !CAMPAIGN_STATUSES.includes(status as CampaignStatus)) {
          res.status(400).json({ error: 'Invalid campaign status' });
          return;
        }
        data.status = status as CampaignStatus;
      }

      const updatedCampaign = await prisma.campaign.update({
        where: { id },
        data,
        include: {
          sponsor: { select: { id: true, name: true } },
          _count: { select: { creatives: true, placements: true } },
        },
      });

      res.status(200).json(updatedCampaign);
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  }
);

// DELETE /api/campaigns/:id - Delete campaign
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['SPONSOR']),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const id = getParam(req.params.id);
      const existingCampaign = await prisma.campaign.findUnique({
        where: { id },
        select: { id: true, sponsorId: true },
      });

      if (!existingCampaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      if (existingCampaign.sponsorId !== req.user.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      await prisma.campaign.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }
);

export default router;
