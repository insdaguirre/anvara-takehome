import { type Request, type Response, type NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { betterAuthInstance } from './betterAuth.js';
import { prisma } from './db.js';

// TODO: Add sponsorId and publisherId to the user interface
// These are needed to scope queries to the user's own data
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'SPONSOR' | 'PUBLISHER';
    sponsorId?: string;
    publisherId?: string;
  };
}

// TODO: This middleware doesn't actually validate anything!
// It should:
// 1. Check for Authorization header or session cookie
// 2. Validate the token/session
// 3. Look up the user in the database
// 4. Attach user info to req.user
// 5. Return 401 if invalid
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [sponsor, publisher] = await Promise.all([
      prisma.sponsor.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      }),
      prisma.publisher.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      }),
    ]);

    if (!sponsor && !publisher) {
      res.status(403).json({ error: 'User role not configured' });
      return;
    }

    if (sponsor) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        role: 'SPONSOR',
        sponsorId: sponsor.id,
      };
      next();
      return;
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: 'PUBLISHER',
      publisherId: publisher!.id,
    };
    next();
  } catch (error) {
    console.error('Authentication failed:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function roleMiddleware(allowedRoles: Array<'SPONSOR' | 'PUBLISHER'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
