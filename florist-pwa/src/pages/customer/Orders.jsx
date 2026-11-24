import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  X,
  Calendar,
  Clock,
  ArrowRight,
  Flower2,
} from 'lucide-react';
import api, { CustomerStorage, getApiErrorMessage } from '../../services/api.js';
import { formatCurrency, formatDateId } from '../../utils/formatCurrency.js';

export function getStatusBadgeStyle(status) {
  switch (status) {
    case 'pending':
      return { label: 'Menunggu', className: 'bg-amber-100 text-amber-900 border-amber-200' };
    case 'diproses':
      return { label: 'Sedang Dirangkai', className: 'bg-blue-100 text-blue-900 border-blue-200' };
    case 'siap_diambil':
      return {
        label: 'Siap Diambil di Toko',
        className: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      };
    case 'selesai':
      return { label: 'Selesai', className: 'bg-[#EEF1EA] text-[#1E3528] border-[#6B7F59]/30' };
    case 'dibatalkan':
      return { label: 'Dibatalkan', className: 'bg-red-100 text-red-800 border-red-200' };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
}

export function getPaymentBadgeStyle(paymentStatus) {
  switch (paymentStatus) {
    case 'belum_bayar':
      return { label: 'Belum Bayar', className: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'menunggu_verifikasi':
      return {
        label: 'Menunggu Verifikasi',
        className: 'bg-purple-100 text-purple-900 border-purple-200',
      };
    case 'terverifikasi':
      return {
        label: 'Pembayaran Terverifikasi',
        className: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      };
    case 'ditolak':
      return { label: 'Bukti Ditolak', className: 'bg-red-100 text-red-800 border-red-200' };
    default:
      return { label: paymentStatus, className: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
}

export default function Orders() {
  const navigate = useNavigate();
  const isLoggedIn = CustomerStorage.isLoggedIn();
  const savedCustomer = CustomerStorage.getCustomerInfo();
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async (phoneToQuery) => {
    if (!CustomerStorage.isLoggedIn()) return;

    const savedIds = CustomerStorage.getOrderIds();
    const cleanPhone = (phoneToQuery || '').trim();

    if (!cleanPhone && savedIds.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const params = {};
      if (cleanPhone) params.phone = cleanPhone;
      if (savedIds.length > 0) params.ids = savedIds.join(',');

      const res = await api.get('/orders', { params });
      const fetched = res.data || [];
      setOrders(fetched);

      // Sinkronkan ID pesanan yang ditemukan ke localStorage
      fetched.forEach((o) => CustomerStorage.addOrderId(o.id));
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          'Gagal memuat riwayat pesanan. Pastikan perangkat terhubung ke internet.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/profil?redirect=%2Fpesanan', { replace: true });
      return;
    }
    fetchOrders(savedCustomer.phone);
  }, [isLoggedIn, navigate, fetchOrders, savedCustomer.phone]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) => {
      const fullId = String(order.id || '').toLowerCase();
      const shortId = fullId.slice(0, 8);
      const matchOrderId = fullId.includes(q) || shortId.includes(q) || `#${shortId}`.includes(q);

      const matchProductName = (order.order_items || []).some((item) =>
        String(item.products?.name || '')
          .toLowerCase()
          .includes(q)
      );

      return matchOrderId || matchProductName;
    });
  }, [orders, searchQuery]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <div className="bg-[#FDF2F4] rounded-2xl p-6 border border-[#EAE6DF] mb-6">
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
          Riwayat Transaksi · {savedCustomer.name}
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3528] leading-tight mb-1">
          Pesanan Saya
        </h1>
        <p className="text-xs sm:text-sm text-[#2F4538] leading-relaxed">
          Cari riwayat pesanan Anda berdasarkan nama buket atau ID pesanan.
        </p>

        {/* Form Pencarian Nama Produk atau ID Pesanan */}
        <div className="mt-4 relative">
          <label htmlFor="order-search" className="sr-only">
            Cari nama produk atau ID pesanan
          </label>
          <Search className="w-4 h-4 text-[#6B7F59] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="order-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama bunga atau ID pesanan (contoh: Mawar, #A1B2...)"
            className="w-full pl-11 pr-11 py-3 rounded-full bg-white border border-[#EAE6DF] text-sm text-[#1E3528] placeholder:text-[#2F4538]/60 focus:outline-none focus:border-[#D45D79] min-h-[44px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full hover:bg-[#EEF1EA] text-[#2F4538] flex items-center justify-center"
              aria-label="Bersihkan pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#EAE6DF] p-6 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 text-center space-y-4 shadow-editorial">
          <div className="w-14 h-14 rounded-full bg-[#EEF1EA] text-[#6B7F59] flex items-center justify-center mx-auto">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1E3528]">
            {orders.length === 0
              ? 'Belum Ada Riwayat Pesanan'
              : 'Pesanan Tidak Ditemukan'}
          </h2>
          <p className="text-xs sm:text-sm text-[#2F4538] max-w-md mx-auto leading-relaxed">
            {orders.length === 0
              ? 'Anda belum memiliki pesanan pada akun ini. Yuk pilih buket bunga segar di katalog!'
              : 'Tidak ada pesanan yang cocok dengan kata kunci atau ID pesanan tersebut.'}
          </p>
          {orders.length === 0 ? (
            <Link
              to="/katalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D45D79] text-white text-xs sm:text-sm font-semibold min-h-[44px]"
            >
              <Flower2 className="w-4 h-4 shrink-0" />
              <span>Pesan Buket Sekarang</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D45D79] text-white text-xs sm:text-sm font-semibold min-h-[44px]"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="sr-only">Daftar Riwayat Pesanan</h2>
          {filteredOrders.map((order) => {
            const statusBadge = getStatusBadgeStyle(order.status);
            const paymentBadge = getPaymentBadgeStyle(order.payment_status);
            const itemCount = (order.order_items || []).reduce(
              (s, i) => s + Number(i.quantity || 0),
              0
            );
            const firstItemName =
              order.order_items?.[0]?.products?.name || 'Rangkaian Buket Bunga';

            return (
              <Link
                key={order.id}
                to={`/pesanan/${order.id}`}
                className="block bg-white rounded-2xl border border-[#EAE6DF] p-5 hover:border-[#D45D79] transition shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#EAE6DF]">
                  <div>
                    <span className="text-[11px] font-mono text-[#2F4538] block mb-1">
                      ID #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#1E3528]">
                      {firstItemName}
                      {order.order_items?.length > 1 &&
                        ` +${order.order_items.length - 1} lainnya`}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${statusBadge.className}`}
                    >
                      {statusBadge.label}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${paymentBadge.className}`}
                    >
                      {paymentBadge.label}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#2F4538]">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#6B7F59]" />
                      <span>Ambil: {formatDateId(order.pickup_date)}</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#D45D79]" />
                      <span>Pukul {String(order.pickup_time || '').slice(0, 5)} WIB</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-[#2F4538] block">
                        Total ({itemCount} item)
                      </span>
                      <span className="text-sm font-bold text-[#D45D79]">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#D45D79]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
