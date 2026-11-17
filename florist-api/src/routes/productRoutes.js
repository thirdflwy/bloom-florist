import express from 'express';
import { ProductController } from '../controllers/productController.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { adminLimiter, uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadSingleImage } from '../middleware/upload.js';

const router = express.Router();

// Publik: hanya produk dengan is_available = true
router.get('/', ProductController.getPublicProducts);
router.get('/:id', ProductController.getPublicProductById);

// Admin: tambah produk, ubah produk (termasuk ganti foto & re-aktivasi), dan soft delete
router.post(
  '/',
  adminLimiter,
  uploadLimiter,
  requireAdmin,
  uploadSingleImage('image', false),
  ProductController.createProduct
);

router.put(
  '/:id',
  adminLimiter,
  uploadLimiter,
  requireAdmin,
  uploadSingleImage('image', false),
  ProductController.updateProduct
);

router.delete(
  '/:id',
  adminLimiter,
  requireAdmin,
  ProductController.softDeleteProduct
);

export default router;
