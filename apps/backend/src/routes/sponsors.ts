import { Router, type Request, type Response, type IRouter } from 'express';
import { authMiddleware, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma } from '../db.js';
import { getParam, isValidEmail } from '../utils/helpers.js';

const router: IRouter = Router();

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return 'code' in error && (error as { code?: unknown }).code === 'P2002';
}

// GET /api/sponsors - List all sponsors
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sponsors);
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

// GET /api/sponsors/:id - Get single sponsor with campaigns
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const sponsor = await prisma.sponsor.findUnique({
      where: { id },
      include: {
        campaigns: {
          include: {
            _count: { select: { placements: true } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!sponsor) {
      res.status(404).json({ error: 'Sponsor not found' });
      return;
    }

    res.json(sponsor);
  } catch (error) {
    console.error('Error fetching sponsor:', error);
    res.status(500).json({ error: 'Failed to fetch sponsor' });
  }
});

// POST /api/sponsors - Create new sponsor
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, website, logo, description, industry } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    const sponsor = await prisma.sponsor.create({
      data: { name, email, website, logo, description, industry },
    });

    res.status(201).json(sponsor);
  } catch (error) {
    console.error('Error creating sponsor:', error);
    res.status(500).json({ error: 'Failed to create sponsor' });
  }
});

// PUT /api/sponsors/:id - Update sponsor profile
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['SPONSOR']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = getParam(req.params.id);

      if (!req.user?.sponsorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const existingSponsor = await prisma.sponsor.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existingSponsor) {
        res.status(404).json({ error: 'Sponsor not found' });
        return;
      }

      if (req.user.sponsorId !== id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { name, email, website, logo, description, industry } = req.body as Record<string, unknown>;
      if (
        name === undefined &&
        email === undefined &&
        website === undefined &&
        logo === undefined &&
        description === undefined &&
        industry === undefined
      ) {
        res.status(400).json({ error: 'At least one field is required for update' });
        return;
      }

      const data: Record<string, string | null> = {};

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

      if (logo !== undefined) {
        if (logo !== null && typeof logo !== 'string') {
          res.status(400).json({ error: 'logo must be a string or null' });
          return;
        }
        data.logo = logo === null ? null : logo.trim();
      }

      if (description !== undefined) {
        if (description !== null && typeof description !== 'string') {
          res.status(400).json({ error: 'description must be a string or null' });
          return;
        }
        data.description = description === null ? null : description.trim();
      }

      if (industry !== undefined) {
        if (industry !== null && typeof industry !== 'string') {
          res.status(400).json({ error: 'industry must be a string or null' });
          return;
        }
        data.industry = industry === null ? null : industry.trim();
      }

      const updatedSponsor = await prisma.sponsor.update({
        where: { id },
        data,
      });

      res.status(200).json(updatedSponsor);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        res.status(409).json({ error: 'A sponsor with that email already exists' });
        return;
      }

      console.error('Error updating sponsor:', error);
      res.status(500).json({ error: 'Failed to update sponsor' });
    }
  }
);

export default router;
