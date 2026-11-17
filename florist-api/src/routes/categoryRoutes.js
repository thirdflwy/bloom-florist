import express from 'express';
import { CategoryController } from '../controllers/categoryController.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Publik
router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);

// Admin (tanpa UI khusus, dikelola via API/Postman/Supabase)
router.post('/', adminLimiter, requireAdmin, CategoryController.create);
router.put('/:id', adminLimiter, requireAdmin, CategoryController.update);
router.delete('/:id', adminLimiter, requireAdmin, CategoryController.remove);

export default router;
