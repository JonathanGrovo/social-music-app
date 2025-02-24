// src/routes/index.ts
import { Router } from 'express';
import roomRoutes from './rooms';
import healthRoutes from './health';

const router = Router();

// Mount route groups
router.use('/health', healthRoutes);
router.use('/api/rooms', roomRoutes);

export default router;