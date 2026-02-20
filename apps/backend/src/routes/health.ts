import { Router, type Request, type Response, type IRouter } from 'express';
import { prisma } from '../db.js';

const router: IRouter = Router();

// GET /api/health - Health check endpoint
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export default router;
