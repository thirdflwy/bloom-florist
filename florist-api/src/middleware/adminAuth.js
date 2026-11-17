import crypto from 'crypto';

/**
 * Perbandingan string secara timing-safe menggunakan SHA-256 digest
 * agar panjang string pun tidak bocor lewat timing side-channel.
 */
export function isAdminKeyValid(providedKey) {
  const expectedKey = process.env.ADMIN_KEY;
  if (!expectedKey || typeof providedKey !== 'string' || !providedKey.trim()) {
    return false;
  }

  const hashProvided = crypto.createHash('sha256').update(providedKey).digest();
  const hashExpected = crypto.createHash('sha256').update(expectedKey).digest();

  return crypto.timingSafeEqual(hashProvided, hashExpected);
}

/**
 * Middleware wajib untuk endpoint khusus Admin (mengembalikan 401 jika tidak valid).
 */
export function requireAdmin(req, res, next) {
  const providedKey = req.headers['x-admin-key'];

  if (!isAdminKeyValid(providedKey)) {
    return res.status(401).json({
      error: 'Akses ditolak. Admin key tidak valid atau tidak disertakan.',
    });
  }

  req.isAdmin = true;
  next();
}

/**
 * Middleware opsional untuk mengecek apakah request datang dari Admin
 * (dipakai pada PATCH /api/orders/:id/cancel).
 */
export function optionalAdmin(req, res, next) {
  const providedKey = req.headers['x-admin-key'];
  req.isAdmin = isAdminKeyValid(providedKey);
  next();
}
