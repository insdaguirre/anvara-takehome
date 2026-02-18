import { Router, type IRouter } from 'express';
import authRoutes from './auth.js';
import sponsorsRoutes from './sponsors.js';
import publishersRoutes from './publishers.js';
import campaignsRoutes from './campaigns.js';
import adSlotsRoutes from './adSlots.js';
import placementsRoutes from './placements.js';
import dashboardRoutes from './dashboard.js';
import healthRoutes from './health.js';
import marketplaceRoutes from './marketplace.js';
import newsletterRoutes from './newsletter.js';
import quotesRoutes from './quotes.js';

const router: IRouter = Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/sponsors', sponsorsRoutes);
router.use('/publishers', publishersRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/ad-slots', adSlotsRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/placements', placementsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/health', healthRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/quotes', quotesRoutes);

export default router;
