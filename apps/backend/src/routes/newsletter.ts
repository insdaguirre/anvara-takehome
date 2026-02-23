import { Router, type Request, type Response, type IRouter } from 'express';
import { prisma } from '../db.js';
import { isValidEmail } from '../utils/helpers.js';

const router: IRouter = Router();

// POST /api/newsletter/subscribe - Subscribe email to newsletter
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const emailRaw = req.body?.email;
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    await prisma.newsletterSubscription.upsert({
      where: { email },
      create: { email },
      update: {},
    });

    res.status(200).json({
      success: true,
      message: 'Thanks for subscribing to our newsletter!',
    });
  } catch (error) {
    console.error('Error creating newsletter subscription:', error);
    res.status(500).json({ error: 'Failed to subscribe to newsletter' });
  }
});

export default router;
