import { Router, type Request, type Response, type IRouter } from 'express';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';
import { authMiddleware, type AuthRequest } from '../auth.js';

const router: IRouter = Router();

// NOTE: Authentication is handled by Better Auth on the frontend
// This route is kept for any backend-specific auth utilities

// POST /api/auth/login - By design: authentication is handled by Better Auth on the frontend.
// This endpoint exists only to return a clear error for API clients that call it directly.
router.post('/login', async (_req: Request, res: Response) => {
  res.status(400).json({
    error: 'Use the frontend login at /login instead',
    hint: 'Better Auth handles authentication via the Next.js frontend',
  });
});

// GET /api/auth/me - Get current user (for API clients)
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({ user: req.user });
});

// GET /api/auth/role/:userId - Get user role based on Sponsor/Publisher records
router.get('/role/:userId', async (req: Request, res: Response) => {
  try {
    const userId = getParam(req.params.userId);

    // Check if user is a sponsor
    const sponsor = await prisma.sponsor.findUnique({
      where: { userId },
      select: { id: true, name: true },
    });

    if (sponsor) {
      res.json({ role: 'sponsor', sponsorId: sponsor.id, name: sponsor.name });
      return;
    }

    // Check if user is a publisher
    const publisher = await prisma.publisher.findUnique({
      where: { userId },
      select: { id: true, name: true },
    });

    if (publisher) {
      res.json({ role: 'publisher', publisherId: publisher.id, name: publisher.name });
      return;
    }

    // User has no role assigned
    res.json({ role: null });
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ error: 'Failed to fetch user role' });
  }
});

export default router;
