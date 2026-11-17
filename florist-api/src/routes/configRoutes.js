import express from 'express';
import { ConfigController } from '../controllers/configController.js';

const router = express.Router();

// GET /api/config (Publik)
router.get('/', ConfigController.getConfig);

export default router;
