import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  MessageSquareHeart,
  XCircle,
  MessageCircle,
  WifiOff,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import api, { CustomerStorage } from '../../services/api.js';
import { formatCurrency, formatDateId } from '../../utils/formatCurrency.js';
import { compressImage } from '../../utils/imageCompress.js';
import { useOnline } from '../../hooks/useOnline.js';
import { getStatusBadgeStyle, getPaymentBadgeStyle } from './Orders.jsx';

export default function OrderDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNewlyCreated = searchParams.get('created') === '1';

  const navigate = useNavigate();
  const { isOnline } = useOnline();

  const [order, setOrder] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState('');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPhone, setCancelPhone] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const loadOrderAndConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [orderRes, configRes] = await Promise.all([
        api.get(`/orders/${id}`),
        api.get('/config'),
      ]);

      const orderData = orderRes.data;
      setOrder(orderData);
      setConfig(configRes.data);

      CustomerStorage.addOrderId(orderData.id);
      const defaultPhone =
        orderData.customers?.phone || CustomerStorage.getCustomerInfo().phone || '';
      setCancelPhone(defaultPhone);
    } catch (err) {
      setError(err.response?.data?.error || 'Detail pesanan tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!CustomerStorage.isLoggedIn()) {
      navigate(`/profil?redirect=${encodeURIComponent(`/pesanan/${id}`)}`, { replace: true });
      return;
    }
    loadOrderAndConfig();
  }, [id, navigate, loadOrderAndConfig]);

  if (!CustomerStorage.isLoggedIn()) {
    return null;
  }

  const handleCopyAccount = () => {
    const acc = config?.payment_info?.bank_account;
    if (!acc) return;
    navigator.clipboard?.writeText(acc);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 1800);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadFeedback('');
  };

  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!selectedFile || !isOnline) return;

    setUploading(true);
    setError('');
    setUploadFeedback('');

    try {
      const compressed = await compressImage(selectedFile);
      const formData = new FormData();
      formData.append('proof', compressed);

      const res = await api.post(`/orders/${id}/payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setOrder(res.data);
      setSelectedFile(null);
      setUploadFeedback('Bukti transfer berhasil diunggah dan sedang menunggu verifikasi penjual.');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Gagal mengunggah bukti pembayaran.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (!isOnline) return;

    setCancelling(true);
    setError('');

    try {
      const res = await api.patch(`/orders/${id}/cancel`, {
        phone: cancelPhone.trim(),
      });
      setOrder(res.data);
      setShowCancelModal(false);
      setUploadFeedback('Pesanan berhasil dibatalkan dan stok buket telah dikembalikan.');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Gagal membatalkan pesanan. Pastikan nomor telepon sesuai dengan data pemesan.'
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="bg-white rounded-2xl border border-[#EAE6DF] h-64 animate-pulse p-6" />
        <div className="bg-white rounded-2xl border border-[#EAE6DF] h-48 animate-pulse p-6" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 space-y-4">
          <h1 className="font-serif text-2xl font-bold text-[#1E3528]">
            Pesanan Tidak Ditemukan
          </h1>
          <p className="text-sm text-[#2F4538] leading-relaxed">{error}</p>
          <Link
            to="/pesanan"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D45D79] text-white text-sm font-semibold min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Pesanan</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadgeStyle(order.status);
  const paymentBadge = getPaymentBadgeStyle(order.payment_status);
  const canUploadProof =
    order.status !== 'dibatalkan' && order.payment_status !== 'terverifikasi';
  const canCancel =
    order.status === 'pending' && order.payment_status !== 'terverifikasi';

  const whatsappText = encodeURIComponent(
    `Halo Bloom & Co., saya ingin mengonfirmasi pesanan #${order.id
      .slice(0, 8)
      .toUpperCase()} atas nama ${order.customers?.name || 'Pelanggan'}.`
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20 space-y-6">
      {/* Tombol Kembali */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/pesanan')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#EAE6DF] text-xs font-semibold text-[#1E3528] hover:border-[#D45D79] min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Daftar Pesanan</span>
        </button>

        <span className="text-xs font-mono text-[#2F4538]">
          ID: {order.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Closure Banner saat baru selesai Checkout (Golden Rule #4) */}
      {isNewlyCreated && order.payment_status === 'belum_bayar' && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-medium flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Pesanan Berhasil Dibuat!</p>
            <p className="mt-1 leading-relaxed">
              Silakan lakukan transfer sesuai nominal tagihan ke rekening resmi di bawah ini, lalu
              unggah foto bukti pembayaran Anda.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {uploadFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* 1. KARTU STATUS PESANAN */}
      <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
              Detail Pesanan Bunga
            </span>
            <h1 className="font-serif text-2xl font-bold text-[#1E3528] leading-tight mb-1">
              Pesanan #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-xs text-[#2F4538]">
              Pemesan: <strong className="text-[#1E3528]">{order.customers?.name}</strong> (
              {order.customers?.phone})
            </p>
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

        {/* Catatan Penolakan Pembayaran (FR-10) */}
        {order.payment_status === 'ditolak' && order.payment_note && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-1">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Pembayaran Ditolak oleh Penjual</span>
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed">
              Catatan: &ldquo;{order.payment_note}&rdquo;
            </p>
            <p className="text-[11px] text-red-700 pt-1">
              Silakan unggah ulang foto bukti transfer yang jelas di bawah ini.
            </p>
          </div>
        )}

        {/* Info Jadwal Ambil & Kartu Ucapan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EAE6DF] text-xs">
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] space-y-1">
            <h3 className="font-sans font-bold text-[#1E3528] flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-[#6B7F59]" />
              <span>Jadwal Pengambilan di Toko</span>
            </h3>
            <p className="text-[#2F4538]">{formatDateId(order.pickup_date)}</p>
            <p className="text-[#D45D79] font-semibold flex items-center gap-2 pt-1">
              <Clock className="w-4 h-4" />
              <span>Pukul {String(order.pickup_time || '').slice(0, 5)} WIB</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] space-y-1">
            <h3 className="font-sans font-bold text-[#1E3528] flex items-center gap-2 mb-1">
              <MessageSquareHeart className="w-4 h-4 text-[#D45D79]" />
              <span>Pesan Kartu Ucapan</span>
            </h3>
            <p className="text-[#2F4538] italic leading-relaxed">
              {order.card_message ? `"${order.card_message}"` : 'Tidak ada pesan kartu ucapan.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. INFORMASI REKENING PEMBAYARAN & LOKASI TOKO DARI GET /api/config (FR-07) */}
      {config && order.status !== 'dibatalkan' && (
        <div className="bg-[#FDF2F4] rounded-2xl border border-[#D45D79]/25 p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#D45D79] shrink-0" />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1E3528]">
                Instruksi Pembayaran Transfer
              </h2>
            </div>
            <span className="text-base sm:text-lg font-bold text-[#D45D79]">
              {formatCurrency(order.total)}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#EAE6DF] p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#6B7F59] font-bold block mb-1">
                Bank {config.payment_info?.bank_name}
              </span>
              <p className="text-lg sm:text-xl font-mono font-bold text-[#1E3528] tracking-wide">
                {config.payment_info?.bank_account}
              </p>
              <p className="text-xs text-[#2F4538] mt-0.5">
                a.n. <strong>{config.payment_info?.bank_holder}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyAccount}
              className="px-4 py-2.5 rounded-full bg-[#FAF8F5] hover:bg-[#EEF1EA] border border-[#EAE6DF] text-xs font-semibold text-[#1E3528] inline-flex items-center gap-2 min-h-[44px] transition"
            >
              {copiedAccount ? (
                <>
                  <Check className="w-4 h-4 text-[#6B7F59]" />
                  <span>Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Rekening</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white/90 rounded-2xl border border-[#EAE6DF] p-4 flex items-start gap-3 text-xs text-[#1E3528]">
            <MapPin className="w-4 h-4 text-[#6B7F59] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-sans font-bold mb-1">
                Lokasi Pengambilan: {config.store_info?.name}
              </h3>
              <p className="text-[#2F4538] leading-relaxed">{config.store_info?.address}</p>
              <p className="text-[#6B7F59] font-semibold mt-1">
                Buka setiap hari mulai pukul {config.store_info?.open_time} WIB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. UNGGAH BUKTI TRANSFER (FR-09) */}
      {canUploadProof && (
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1E3528]">
            {order.payment_proof_url ? 'Perbarui Bukti Transfer' : 'Unggah Bukti Transfer'}
          </h2>

          {order.payment_proof_url && (
            <div className="space-y-2">
              <p className="text-xs text-[#6B7F59] font-semibold">
                Bukti transfer yang telah diunggah:
              </p>
              <a
                href={order.payment_proof_url}
                target="_blank"
                rel="noreferrer"
                className="block w-48 rounded-2xl overflow-hidden border border-[#EAE6DF]"
              >
                <img
                  src={order.payment_proof_url}
                  alt="Bukti Transfer"
                  className="w-full h-48 object-cover"
                />
              </a>
            </div>
          )}

          <form onSubmit={handleUploadProof} className="space-y-4">
            <div>
              <label
                htmlFor="proof-upload"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Pilih foto bukti transfer (JPG, PNG, atau WebP · Maks. 2 MB, otomatis dikompres):
              </label>
              <input
                id="proof-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={!isOnline || uploading}
                className="block w-full text-xs text-[#2F4538] file:mr-3 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#FDF2F4] file:text-[#D45D79] hover:file:bg-[#D45D79] hover:file:text-white transition"
              />
            </div>

            {!isOnline && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>Unggah bukti transfer dinonaktifkan saat perangkat sedang offline.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!isOnline || !selectedFile || uploading}
              className={`px-6 py-3 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 min-h-[44px] transition ${
                !isOnline || !selectedFile || uploading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-[#D45D79] hover:bg-[#B84763] text-white shadow-sm'
              }`}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Upload className="w-4 h-4 shrink-0" />
              )}
              <span>{uploading ? 'Mengompres & Mengunggah...' : 'Kirim Bukti Pembayaran'}</span>
            </button>
          </form>
        </div>
      )}

      {/* 4. RINCIAN ITEM PESANAN */}
      <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial">
        <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1E3528]">
          Rincian Item Buket
        </h2>

        <ul className="divide-y divide-[#EAE6DF]">
          {(order.order_items || []).map((item) => (
            <li key={item.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-sans text-sm font-semibold text-[#1E3528]">
                  {item.products?.name || 'Buket Bunga'}
                </h3>
                <p className="text-xs text-[#2F4538]">
                  {item.quantity} x {formatCurrency(item.price)}
                </p>
              </div>
              <p className="text-sm font-bold text-[#1E3528]">
                {formatCurrency(Number(item.price) * Number(item.quantity))}
              </p>
            </li>
          ))}
        </ul>

        <div className="pt-4 border-t border-[#EAE6DF] flex items-center justify-between">
          <span className="text-sm font-bold text-[#1E3528]">Total Pembayaran</span>
          <span className="text-xl font-bold text-[#D45D79]">
            {formatCurrency(order.total)}
          </span>
        </div>
      </div>

      {/* 5. AKSI KONFIRMASI WHATSAPP (FR-13) & PEMBATALAN PESANAN (FR-11) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <a
          href={`https://wa.me/62895386803538?text=${whatsappText}`}
          target="_blank"
          rel="noreferrer"
          className="px-6 py-3 rounded-full bg-[#6B7F59] hover:bg-[#576947] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition min-h-[44px]"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>Hubungi Penjual via WhatsApp</span>
        </a>

        {canCancel && (
          <button
            type="button"
            disabled={!isOnline}
            onClick={() => setShowCancelModal(true)}
            className={`px-6 py-3 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 min-h-[44px] border transition ${
              !isOnline
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white hover:bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <XCircle className="w-4 h-4 shrink-0" />
            <span>Batalkan Pesanan</span>
          </button>
        )}
      </div>

      {/* Modal Verifikasi Nomor Telepon untuk Pembatalan Pelanggan */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EAE6DF] max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="font-serif text-xl font-bold text-[#1E3528]">
              Konfirmasi Pembatalan Pesanan
            </h2>
            <p className="text-xs sm:text-sm text-[#2F4538] leading-relaxed">
              Masukkan nomor telepon yang Anda gunakan saat membuat pesanan ini. Stok buket akan
              dikembalikan secara otomatis.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label
                  htmlFor="cancel-phone"
                  className="block text-xs font-semibold text-[#1E3528] mb-2"
                >
                  Nomor Telepon Pemesan *
                </label>
                <input
                  id="cancel-phone"
                  type="tel"
                  required
                  value={cancelPhone}
                  onChange={(e) => setCancelPhone(e.target.value)}
                  placeholder="0812xxxx"
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-5 py-2.5 rounded-full bg-gray-100 text-xs font-semibold text-[#1E3528] min-h-[44px]"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={cancelling || !isOnline}
                  className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-2 min-h-[44px]"
                >
                  {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{cancelling ? 'Membatalkan...' : 'Ya, Batalkan Pesanan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
