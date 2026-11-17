import rateLimit from 'express-rate-limit';

/**
 * Rate limiter untuk rute /api/admin/* dan percobaan autentikasi admin
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Terlalu banyak permintaan ke layanan admin. Silakan coba lagi beberapa saat.',
  },
});

/**
 * Rate limiter untuk unggahan file (bukti transfer maupun foto produk)
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Terlalu banyak percobaan unggah file. Silakan tunggu beberapa menit.',
  },
});

/**
 * Rate limiter untuk pembatalan pesanan (/api/orders/:id/cancel)
 * Mencegah brute-force nomor telepon pada UUID pesanan
 */
export const cancelLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Terlalu banyak permintaan pembatalan pesanan. Silakan coba lagi nanti.',
  },
});
