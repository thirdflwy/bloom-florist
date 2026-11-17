import { OrderModel } from '../models/orderModel.js';
import { normalizePhone } from '../models/customerModel.js';

function mapRpcError(err, res, fallbackMessage) {
  const msg = err?.message || fallbackMessage || 'Terjadi kesalahan pada server.';
  if (msg.includes('VALIDATION:')) {
    return res.status(400).json({ error: msg.replace('VALIDATION:', '').trim() });
  }
  if (msg.includes('NOT_FOUND:')) {
    return res.status(404).json({ error: msg.replace('NOT_FOUND:', '').trim() });
  }
  if (msg.includes('CONFLICT:')) {
    return res.status(409).json({ error: msg.replace('CONFLICT:', '').trim() });
  }
  return res.status(400).json({ error: msg });
}

export const OrderController = {
  /**
   * POST /api/orders
   * Membuat pesanan baru secara atomik (validasi H+1, jam >= 08:00, kartu ucapan <= 200 karakter, stok)
   */
  async createOrder(req, res) {
    try {
      const {
        customer_name,
        customer_phone,
        customer_email,
        customer_address,
        pickup_date,
        pickup_time,
        card_message,
        items,
      } = req.body;

      if (!customer_name || !String(customer_name).trim()) {
        return res.status(400).json({ error: 'Nama pemesan wajib diisi.' });
      }

      const normalizedPhone = normalizePhone(customer_phone);
      if (!normalizedPhone || normalizedPhone.length < 9) {
        return res.status(400).json({ error: 'Nomor telepon pemesan wajib diisi dan harus valid.' });
      }

      if (!pickup_date) {
        return res.status(400).json({ error: 'Tanggal pengambilan wajib dipilih (minimal H+1).' });
      }

      if (!pickup_time || String(pickup_time) < '08:00') {
        return res.status(400).json({ error: 'Jam pengambilan minimal mulai pukul 08:00.' });
      }

      if (card_message && String(card_message).length > 200) {
        return res.status(400).json({ error: 'Kartu ucapan maksimal 200 karakter.' });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Keranjang pesanan tidak boleh kosong.' });
      }

      const sanitizedItems = items.map((item) => ({
        product_id: item.product_id || item.id,
        quantity: Number(item.quantity),
      }));

      for (const item of sanitizedItems) {
        if (!item.product_id || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          return res.status(400).json({
            error: 'Setiap item pesanan harus memiliki product_id dan quantity > 0.',
          });
        }
      }

      const createdRpc = await OrderModel.createViaRpc({
        customer_name: String(customer_name).trim(),
        customer_phone: normalizedPhone,
        customer_email: customer_email ? String(customer_email).trim() : null,
        customer_address: customer_address ? String(customer_address).trim() : null,
        pickup_date,
        pickup_time,
        card_message: card_message ? String(card_message).trim() : null,
        items: sanitizedItems,
      });

      const fullOrder = await OrderModel.findById(createdRpc.id);
      return res.status(201).json(fullOrder || createdRpc);
    } catch (err) {
      return mapRpcError(err, res, 'Gagal membuat pesanan.');
    }
  },

  /**
   * GET /api/orders?phone=...&ids=...
   * Mengambil daftar pesanan milik pelanggan berdasarkan nomor telepon dan/atau daftar UUID pesanan
   */
  async listOrders(req, res) {
    try {
      const { phone, ids } = req.query;
      const parsedIds = ids
        ? String(ids)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      if (!phone && parsedIds.length === 0) {
        return res.status(400).json({
          error: 'Parameter phone atau ids diperlukan untuk melihat riwayat pesanan.',
        });
      }

      const orders = await OrderModel.findForCustomer({
        phone: phone ? String(phone) : null,
        ids: parsedIds,
      });

      return res.status(200).json(orders);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal mengambil daftar pesanan.' });
    }
  },

  /**
   * GET /api/orders/summary
   * Mengembalikan ringkasan penjualan (total pesanan selesai, omzet, 3 produk terlaris)
   */
  async getSummary(req, res) {
    try {
      const summary = await OrderModel.getSummary();
      return res.status(200).json(summary);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal memuat ringkasan penjualan.' });
    }
  },

  /**
   * GET /api/orders/:id
   * Mengambil detail pesanan + signed URL bukti bayar
   */
  async getOrderById(req, res) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      }
      return res.status(200).json(order);
    } catch (err) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }
  },

  /**
   * POST /api/orders/:id/payment-proof
   * Unggah bukti pembayaran (multipart/form-data, field `proof`)
   */
  async uploadPaymentProof(req, res) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      }

      if (order.status === 'dibatalkan') {
        return res.status(409).json({
          error: 'Pesanan sudah dibatalkan. Bukti pembayaran tidak dapat diunggah.',
        });
      }

      if (order.payment_status === 'terverifikasi') {
        return res.status(409).json({
          error: 'Pembayaran pesanan ini sudah terverifikasi.',
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'File bukti transfer (proof) wajib diunggah.' });
      }

      const updated = await OrderModel.uploadPaymentProof(
        order.id,
        req.file.buffer,
        req.file.detectedExt,
        req.file.detectedMime,
        order.payment_proof_path
      );

      const fullOrder = await OrderModel.findById(updated.id);
      return res.status(200).json(fullOrder || updated);
    } catch (err) {
      return res.status(500).json({
        error: err.message || 'Gagal mengunggah bukti pembayaran.',
      });
    }
  },

  /**
   * PATCH /api/orders/:id/cancel
   * Jika x-admin-key valid (req.isAdmin = true), izinkan pembatalan langsung tanpa nomor telepon.
   * Jika pelanggan biasa, wajib menyertakan phone di body request (400 jika kosong, 403 jika tidak cocok).
   * Menolak dengan 409 jika sudah terverifikasi atau sudah dibatalkan.
   */
  async cancelOrder(req, res) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      }

      // Otorisasi: jika bukan Admin, wajib verifikasi nomor telepon pemesan
      if (!req.isAdmin) {
        const rawPhone = req.body?.phone;
        const providedPhone = normalizePhone(rawPhone);

        if (!providedPhone) {
          return res.status(400).json({
            error: 'Nomor telepon pemesan wajib disertakan untuk membatalkan pesanan.',
          });
        }

        const orderPhone = normalizePhone(order.customers?.phone || '');
        if (!orderPhone || providedPhone !== orderPhone) {
          return res.status(403).json({
            error: 'Tidak dapat membatalkan pesanan. Nomor telepon tidak sesuai dengan data pemesan.',
          });
        }
      }

      // Cek status pesanan sebelum memanggil RPC
      if (order.status === 'dibatalkan') {
        return res.status(409).json({
          error: 'Pesanan ini sudah dibatalkan sebelumnya.',
        });
      }

      if (order.payment_status === 'terverifikasi') {
        return res.status(409).json({
          error: 'Pesanan dengan pembayaran yang sudah terverifikasi tidak dapat dibatalkan.',
        });
      }

      await OrderModel.cancelViaRpc(order.id);
      const updatedOrder = await OrderModel.findById(order.id);

      return res.status(200).json(updatedOrder);
    } catch (err) {
      return mapRpcError(err, res, 'Gagal membatalkan pesanan.');
    }
  },
};
