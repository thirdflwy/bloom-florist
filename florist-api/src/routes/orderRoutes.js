import express from 'express';
import { OrderController } from '../controllers/orderController.js';
import { AdminController } from '../controllers/adminController.js';
import { optionalAdmin, requireAdmin } from '../middleware/adminAuth.js';
import { adminLimiter, cancelLimiter, uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadSingleImage } from '../middleware/upload.js';

const router = express.Router();

// PENTING: GET /api/orders/summary HARUS didaftarkan sebelum GET /api/orders/:id
router.get('/summary', OrderController.getSummary);

// Publik: buat pesanan & lihat daftar pesanan pelanggan
router.post('/', OrderController.createOrder);
router.get('/', OrderController.listOrders);

// Publik: detail pesanan + signed URL bukti transfer
router.get('/:id', OrderController.getOrderById);

// Publik: unggah bukti transfer (maks 2 MB, validasi magic bytes)
router.post(
  '/:id/payment-proof',
  uploadLimiter,
  uploadSingleImage('proof', true),
  OrderController.uploadPaymentProof
);

// Pelanggan (dengan verifikasi nomor telepon) ATAU Admin (dengan x-admin-key valid)
router.patch(
  '/:id/cancel',
  cancelLimiter,
  optionalAdmin,
  OrderController.cancelOrder
);

// Admin: verifikasi pembayaran (setuju / tolak) & ubah status pesanan maju
router.patch(
  '/:id/payment',
  adminLimiter,
  requireAdmin,
  AdminController.reviewPayment
);

router.patch(
  '/:id/status',
  adminLimiter,
  requireAdmin,
  AdminController.updateOrderStatus
);

export default router;
