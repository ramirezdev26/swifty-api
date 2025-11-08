import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import imageRoutes from './image.routes.js';

const router = Router();

// Health check endpoint for container orchestration
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/images', imageRoutes);

export default router;
