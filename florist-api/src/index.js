import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import configRoutes from './routes/configRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

// Konfigurasi CORS terbatas pada FRONTEND_URL (mendukung multi-origin dipisahkan koma + localhost dev)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Izinkan request tanpa origin (seperti Postman / server-to-server) atau origin yang terdaftar
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.startsWith('http://localhost:') ||
        normalizedOrigin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS Bloom & Co.'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Health check root
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Bloom & Co. Florist REST API',
    version: '1.2.0',
    status: 'online',
  });
});

// Registrasi seluruh rute dengan prefiks /api
app.use('/api/config', configRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes);

// Handler 404 untuk endpoint yang tidak ditemukan
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});

// Handler error global
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Terjadi kesalahan internal pada server.',
  });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Bloom & Co. API] Server berjalan di http://localhost:${PORT}`);
  });
}

export default app;
