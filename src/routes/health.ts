// src/routes/health.ts
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

export default router;