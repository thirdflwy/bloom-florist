import express from 'express';
import { CustomerController } from '../controllers/customerController.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Publik: Daftar, Masuk, Sinkronisasi & Perbarui Profil Pelanggan
router.post('/register', CustomerController.register);
router.post('/login', CustomerController.login);
router.get('/me', CustomerController.getMe);
router.put('/profile', CustomerController.updateProfile);

// Operasi manajemen daftar pelanggan di bawah ini memerlukan autentikasi Admin
router.use(adminLimiter, requireAdmin);

router.get('/', CustomerController.getAll);
router.get('/:id', CustomerController.getById);
router.post('/', CustomerController.create);
router.put('/:id', CustomerController.update);
router.delete('/:id', CustomerController.remove);

export default router;
