import { OrderModel } from '../models/orderModel.js';

const NEXT_STATUS_MAP = {
  pending: 'diproses',
  diproses: 'siap_diambil',
  siap_diambil: 'selesai',
};

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

export const AdminController = {
  /**
   * GET /api/admin/ping
   * Validasi admin key
   */
  ping(req, res) {
    return res.status(200).json({
      authenticated: true,
      message: 'Admin key valid.',
    });
  },

  /**
   * GET /api/admin/orders?payment_status=...
   * Mengambil seluruh pesanan untuk halaman Admin
   */
  async listOrders(req, res) {
    try {
      const { payment_status, status } = req.query;
      const orders = await OrderModel.findAllForAdmin({
        paymentStatus: payment_status,
        status,
      });
      return res.status(200).json(orders);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal memuat daftar pesanan admin.' });
    }
  },

  /**
   * PATCH /api/orders/:id/payment
   * Verifikasi pembayaran oleh Admin (approve / reject) melalui RPC atomik `review_payment`
   */
  async reviewPayment(req, res) {
    try {
      const { action, payment_status, note, payment_note } = req.body;
      const rawDecision = String(action || payment_status || '').toLowerCase().trim();
      const finalNote = note !== undefined ? note : payment_note;

      let normalizedAction = null;
      if (['approve', 'terverifikasi', 'setuju'].includes(rawDecision)) {
        normalizedAction = 'approve';
      } else if (['reject', 'ditolak', 'tolak'].includes(rawDecision)) {
        normalizedAction = 'reject';
      } else {
        return res.status(400).json({
          error: 'Aksi verifikasi tidak valid. Gunakan "approve" (setuju) atau "reject" (tolak).',
        });
      }

      if (normalizedAction === 'reject' && (!finalNote || !String(finalNote).trim())) {
        return res.status(400).json({
          error: 'Catatan penolakan wajib diisi saat menolak bukti pembayaran.',
        });
      }

      await OrderModel.reviewPaymentViaRpc(
        req.params.id,
        normalizedAction,
        finalNote ? String(finalNote).trim() : null
      );

      const updatedOrder = await OrderModel.findById(req.params.id);
      return res.status(200).json(updatedOrder);
    } catch (err) {
      return mapRpcError(err, res, 'Gagal memverifikasi pembayaran.');
    }
  },

  /**
   * PATCH /api/orders/:id/status
   * Mengubah status pesanan mengikuti alur maju yang sah:
   * pending -> diproses -> siap_diambil -> selesai
   * Menolak 'dibatalkan' atau lompatan di luar alur dengan HTTP 409.
   */
  async updateOrderStatus(req, res) {
    try {
      const { status: targetStatus } = req.body;
      if (!targetStatus) {
        return res.status(400).json({ error: 'Status baru wajib disertakan.' });
      }

      if (targetStatus === 'dibatalkan') {
        return res.status(409).json({
          error: 'Pembatalan pesanan harus melalui endpoint PATCH /api/orders/:id/cancel.',
        });
      }

      const order = await OrderModel.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      }

      if (order.status === 'dibatalkan' || order.status === 'selesai') {
        return res.status(409).json({
          error: `Pesanan berstatus "${order.status}" tidak dapat diubah lagi.`,
        });
      }

      if (order.payment_status !== 'terverifikasi') {
        return res.status(409).json({
          error: 'Pesanan hanya dapat diproses setelah pembayaran berstatus terverifikasi.',
        });
      }

      const expectedNext = NEXT_STATUS_MAP[order.status];
      if (targetStatus !== expectedNext) {
        return res.status(409).json({
          error: `Transisi status tidak sah dari "${order.status}" ke "${targetStatus}". Transisi yang diizinkan adalah ke "${expectedNext}".`,
        });
      }

      await OrderModel.updateStatus(order.id, targetStatus);
      const updatedOrder = await OrderModel.findById(order.id);
      return res.status(200).json(updatedOrder);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal memperbarui status pesanan.' });
    }
  },
};
