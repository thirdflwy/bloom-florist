import express from 'express';
import { AdminController } from '../controllers/adminController.js';
import { ProductController } from '../controllers/productController.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Semua rute /api/admin/* dibatasi dengan rate limiter dan wajib x-admin-key
router.use(adminLimiter, requireAdmin);

// GET /api/admin/ping
router.get('/ping', AdminController.ping);

// GET /api/admin/orders
router.get('/orders', AdminController.listOrders);

// GET /api/admin/products (termasuk produk nonaktif)
router.get('/products', ProductController.getAdminProducts);

export default router;
