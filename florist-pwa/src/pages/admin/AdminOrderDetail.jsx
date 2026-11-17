import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  WifiOff,
  Calendar,
  Clock,
  User,
  Loader2,
} from 'lucide-react';
import api, { AdminSession } from '../../services/api.js';
import { formatCurrency, formatDateId } from '../../utils/formatCurrency.js';
import { useOnline } from '../../hooks/useOnline.js';
import { getStatusBadgeStyle, getPaymentBadgeStyle } from '../customer/Orders.jsx';

const NEXT_STATUS_ACTION = {
  diproses: { next: 'siap_diambil', label: 'Tandai Siap Diambil di Toko' },
  siap_diambil: { next: 'selesai', label: 'Tandai Pesanan Selesai' },
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useOnline();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [rejectNote, setRejectNote] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!AdminSession.isLoggedIn()) {
      navigate('/admin', { replace: true });
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        AdminSession.clearKey();
        navigate('/admin', { replace: true });
        return;
      }
      setError(err.response?.data?.error || 'Pesanan tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Setujui Pembayaran (FR-23)
  const handleApprovePayment = async () => {
    if (!isOnline) return;
    setProcessing(true);
    setError('');
    setFeedback('');

    try {
      const res = await api.patch(`/orders/${id}/payment`, {
        action: 'approve',
      });
      setOrder(res.data);
      setFeedback('Pembayaran berhasil disetujui. Status pesanan otomatis menjadi Diproses.');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyetujui pembayaran.');
    } finally {
      setProcessing(false);
    }
  };

  // Tolak Pembayaran dengan Catatan Wajib (FR-24)
  const handleRejectPayment = async (e) => {
    e.preventDefault();
    if (!isOnline) return;
    if (!rejectNote.trim()) {
      setError('Catatan alasan penolakan wajib diisi.');
      return;
    }

    setProcessing(true);
    setError('');
    setFeedback('');

    try {
      const res = await api.patch(`/orders/${id}/payment`, {
        action: 'reject',
        note: rejectNote.trim(),
      });
      setOrder(res.data);
      setShowRejectBox(false);
      setRejectNote('');
      setFeedback('Bukti pembayaran ditolak dan catatan telah dikirim ke pelanggan.');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menolak pembayaran.');
    } finally {
      setProcessing(false);
    }
  };

  // Ubah Status Pesanan Maju (FR-25)
  const handleAdvanceStatus = async (nextStatus) => {
    if (!isOnline) return;
    setProcessing(true);
    setError('');
    setFeedback('');

    try {
      const res = await api.patch(`/orders/${id}/status`, {
        status: nextStatus,
      });
      setOrder(res.data);
      setFeedback(`Status pesanan berhasil diperbarui menjadi "${nextStatus}".`);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memperbarui status pesanan.');
    } finally {
      setProcessing(false);
    }
  };

  // Batalkan Pesanan oleh Penjual dengan x-admin-key (FR-29) — tanpa window.confirm blocking
  const handleAdminCancelOrder = async () => {
    if (!isOnline) return;

    setProcessing(true);
    setError('');
    setFeedback('');

    try {
      const res = await api.patch(`/orders/${id}/cancel`, {});
      setOrder(res.data);
      setShowCancelConfirm(false);
      setFeedback('Pesanan berhasil dibatalkan dan stok produk telah dikembalikan.');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal membatalkan pesanan.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-[#EAE6DF] h-72 animate-pulse p-6" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-red-700">{error || 'Pesanan tidak ditemukan.'}</p>
      </div>
    );
  }

  const statusBadge = getStatusBadgeStyle(order.status);
  const paymentBadge = getPaymentBadgeStyle(order.payment_status);
  const canVerifyPayment =
    order.status !== 'dibatalkan' && order.payment_status !== 'terverifikasi';
  const canCancelOrder =
    order.status === 'pending' && order.payment_status !== 'terverifikasi';
  const nextTransition =
    order.payment_status === 'terverifikasi' ? NEXT_STATUS_ACTION[order.status] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/pesanan')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#EAE6DF] text-xs font-semibold text-[#1E3528] hover:border-[#D45D79] min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Daftar Pesanan Admin</span>
        </button>

        <span className="text-xs font-mono text-[#2F4538]">
          UUID: {order.id}
        </span>
      </div>

      {!isOnline && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Mode Offline: Semua tombol verifikasi, ubah status, dan batal dinonaktifkan.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Data Pesanan & Bukti Transfer */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-[#D45D79] font-bold block mb-1">
                  Detail Pesanan Masuk
                </span>
                <h1 className="font-serif text-2xl font-bold text-[#1E3528] leading-tight">
                  #{order.id.slice(0, 8).toUpperCase()}
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${paymentBadge.className}`}
                >
                  {paymentBadge.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-[#EAE6DF] pt-4">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] space-y-1">
                <h3 className="font-sans font-bold text-[#1E3528] flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-[#6B7F59]" />
                  <span>Informasi Pemesan</span>
                </h3>
                <p className="text-[#1E3528] font-semibold">{order.customers?.name}</p>
                <p className="text-[#2F4538]">Telp: {order.customers?.phone}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] space-y-1">
                <h3 className="font-sans font-bold text-[#1E3528] flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-[#D45D79]" />
                  <span>Jadwal Pengambilan</span>
                </h3>
                <p className="text-[#1E3528]">{formatDateId(order.pickup_date)}</p>
                <p className="text-[#D45D79] font-semibold flex items-center gap-2 pt-1">
                  <Clock className="w-4 h-4" />
                  <span>Pukul {String(order.pickup_time || '').slice(0, 5)} WIB</span>
                </p>
              </div>
            </div>

            {order.card_message && (
              <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#D45D79]/20 text-xs">
                <h3 className="font-sans font-bold text-[#1E3528] mb-1">Pesan Kartu Ucapan:</h3>
                <p className="italic text-[#2F4538] leading-relaxed">
                  &ldquo;{order.card_message}&rdquo;
                </p>
              </div>
            )}

            {/* Rincian Item */}
            <div className="border-t border-[#EAE6DF] pt-4 space-y-2">
              <h2 className="font-serif text-lg font-bold text-[#1E3528]">
                Item Buket yang Dipesan
              </h2>
              <ul className="divide-y divide-[#EAE6DF]">
                {(order.order_items || []).map((item) => (
                  <li key={item.id} className="py-3 flex justify-between text-xs sm:text-sm">
                    <div>
                      <span className="font-semibold text-[#1E3528]">
                        {item.products?.name || 'Buket'}
                      </span>
                      <span className="text-[#2F4538] ml-2">
                        ({item.quantity} x {formatCurrency(item.price)})
                      </span>
                    </div>
                    <span className="font-bold text-[#1E3528]">
                      {formatCurrency(Number(item.price) * Number(item.quantity))}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-3 border-t border-[#EAE6DF] flex justify-between items-center">
                <span className="text-sm font-bold text-[#1E3528]">Total Tagihan</span>
                <span className="text-lg font-bold text-[#D45D79]">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Foto Bukti Bayar & Panel Tindakan Admin */}
        <div className="lg:col-span-5 space-y-6">
          {/* Bukti Transfer via Signed URL (FR-22) */}
          <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial">
            <h2 className="font-serif text-lg font-bold text-[#1E3528]">
              Bukti Pembayaran Pelanggan
            </h2>

            {order.payment_proof_url ? (
              <div className="space-y-2">
                <div className="rounded-2xl overflow-hidden border border-[#EAE6DF] bg-[#FAF8F5]">
                  <img
                    src={order.payment_proof_url}
                    alt="Bukti Transfer Pelanggan"
                    className="w-full max-h-80 object-contain"
                  />
                </div>
                <a
                  href={order.payment_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#D45D79] hover:underline py-1"
                >
                  <span>Buka Gambar Ukuran Penuh (Signed URL)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-dashed border-[#EAE6DF] text-center text-xs text-[#2F4538]">
                Pelanggan belum mengunggah foto bukti transfer.
              </div>
            )}

            {/* Tombol Setujui / Tolak Pembayaran */}
            {canVerifyPayment && (
              <div className="pt-4 border-t border-[#EAE6DF] space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!isOnline || processing}
                    onClick={handleApprovePayment}
                    className="flex-1 py-3 px-4 rounded-full bg-[#6B7F59] hover:bg-[#576947] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 min-h-[44px] transition"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                    <span>Setujui Pembayaran</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isOnline || processing}
                    onClick={() => setShowRejectBox((p) => !p)}
                    className="py-3 px-4 rounded-full bg-red-50 hover:bg-red-100 disabled:bg-gray-100 text-red-700 border border-red-200 text-xs font-semibold inline-flex items-center justify-center gap-2 min-h-[44px] transition"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Tolak</span>
                  </button>
                </div>

                {showRejectBox && (
                  <form
                    onSubmit={handleRejectPayment}
                    className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-3"
                  >
                    <label
                      htmlFor="reject-note"
                      className="block text-xs font-bold text-red-900"
                    >
                      Catatan Alasan Penolakan (Wajib) *
                    </label>
                    <textarea
                      id="reject-note"
                      rows={2}
                      required
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Contoh: Nominal kurang atau foto bukti buram..."
                      className="w-full p-3 rounded-xl bg-white border border-red-200 text-xs focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!isOnline || processing}
                      className="w-full py-2.5 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Kirim Penolakan</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Alur Status Pesanan & Pembatalan Admin */}
          <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial">
            <h2 className="font-serif text-lg font-bold text-[#1E3528]">
              Tindakan Status Pesanan
            </h2>

            {nextTransition ? (
              <button
                type="button"
                disabled={!isOnline || processing}
                onClick={() => handleAdvanceStatus(nextTransition.next)}
                className="w-full py-3.5 px-5 rounded-full bg-[#D45D79] hover:bg-[#B84763] disabled:bg-gray-200 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 min-h-[48px] transition shadow-sm"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 shrink-0" />
                )}
                <span>{nextTransition.label}</span>
              </button>
            ) : (
              <p className="text-xs text-[#2F4538] leading-relaxed">
                {order.status === 'selesai'
                  ? 'Pesanan ini telah selesai diambil pelanggan.'
                  : order.status === 'dibatalkan'
                  ? 'Pesanan ini telah dibatalkan.'
                  : 'Setujui pembayaran terlebih dahulu untuk memajukan status pesanan ke tahap Diproses → Siap Diambil → Selesai.'}
              </p>
            )}

            {canCancelOrder && (
              <div className="pt-4 border-t border-[#EAE6DF] space-y-3">
                {!showCancelConfirm ? (
                  <button
                    type="button"
                    disabled={!isOnline || processing}
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-3 px-4 rounded-full bg-white hover:bg-red-50 disabled:bg-gray-100 text-red-700 border border-red-200 text-xs font-semibold inline-flex items-center justify-center gap-2 min-h-[44px] transition"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Batalkan Pesanan &amp; Kembalikan Stok</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                    <p className="text-xs font-bold text-red-900">
                      Konfirmasi Pembatalan Pesanan oleh Admin
                    </p>
                    <p className="text-xs text-red-800 leading-relaxed">
                      Stok seluruh buket pada pesanan ini akan dikembalikan ke katalog secara
                      atomik. Lanjutkan?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        className="flex-1 py-2.5 px-4 rounded-full bg-white border border-gray-300 text-xs font-semibold text-[#1E3528] min-h-[44px]"
                      >
                        Tidak
                      </button>
                      <button
                        type="button"
                        disabled={!isOnline || processing}
                        onClick={handleAdminCancelOrder}
                        className="flex-1 py-2.5 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 min-h-[44px]"
                      >
                        {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>Ya, Batalkan</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
