import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  RefreshCw,
  Calendar,
  Clock,
  ArrowRight,
  User,
  TrendingUp,
  Award,
} from 'lucide-react';
import api, { AdminSession } from '../../services/api.js';
import { formatCurrency, formatDateId } from '../../utils/formatCurrency.js';
import { getStatusBadgeStyle, getPaymentBadgeStyle } from '../customer/Orders.jsx';

const PAYMENT_FILTERS = [
  { value: 'menunggu_verifikasi', label: 'Menunggu Verifikasi' },
  { value: 'semua', label: 'Semua Pesanan' },
  { value: 'belum_bayar', label: 'Belum Bayar' },
  { value: 'terverifikasi', label: 'Terverifikasi' },
  { value: 'ditolak', label: 'Ditolak' },
];

export default function AdminOrders() {
  const navigate = useNavigate();
  const [paymentFilter, setPaymentFilter] = useState('menunggu_verifikasi');
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminOrders = useCallback(async () => {
    if (!AdminSession.isLoggedIn()) {
      navigate('/admin', { replace: true });
      return;
    }

    setLoading(true);
    setError('');
    try {
      const params = {};
      if (paymentFilter !== 'semua') {
        params.payment_status = paymentFilter;
      }
      const [ordersRes, summaryRes] = await Promise.all([
        api.get('/admin/orders', { params }),
        api.get('/orders/summary').catch(() => ({ data: null })),
      ]);
      setOrders(ordersRes.data || []);
      setSummary(summaryRes.data || null);
    } catch (err) {
      if (err.response?.status === 401) {
        AdminSession.clearKey();
        navigate('/admin', { replace: true });
        return;
      }
      setError(err.response?.data?.error || 'Gagal memuat daftar pesanan admin.');
    } finally {
      setLoading(false);
    }
  }, [paymentFilter, navigate]);

  useEffect(() => {
    fetchAdminOrders();
  }, [fetchAdminOrders]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-20 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
            Manajemen Transaksi
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3528] leading-tight">
            Daftar Pesanan Pelanggan
          </h1>
        </div>

        <button
          type="button"
          onClick={fetchAdminOrders}
          className="px-4 py-2.5 rounded-full bg-white border border-[#EAE6DF] text-xs font-semibold text-[#1E3528] hover:border-[#D45D79] inline-flex items-center gap-2 min-h-[44px] transition"
        >
          <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Ringkasan Penjualan Toko (Dipindahkan dari Profil Pembeli ke Panel Penjual) */}
      {summary && (
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#D45D79] shrink-0" />
            <h2 className="font-serif text-xl font-bold text-[#1E3528]">
              Ringkasan Penjualan Toko
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF]">
              <h3 className="font-sans text-[11px] uppercase tracking-wider text-[#6B7F59] font-bold">
                Total Pesanan Selesai
              </h3>
              <p className="text-2xl font-bold text-[#1E3528] mt-1">
                {summary.total_completed_orders} Pesanan
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#D45D79]/20">
              <h3 className="font-sans text-[11px] uppercase tracking-wider text-[#D45D79] font-bold">
                Total Omzet Selesai
              </h3>
              <p className="text-xl sm:text-2xl font-bold text-[#1E3528] mt-1">
                {formatCurrency(summary.total_revenue)}
              </p>
            </div>
          </div>

          {summary.top_products?.length > 0 && (
            <div className="pt-2 space-y-2">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#2F4538] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#D45D79]" />
                <span>3 Buket Terlaris</span>
              </h3>
              <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {summary.top_products.map((prod, idx) => (
                  <li
                    key={prod.id}
                    className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] flex items-center gap-3"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#1E3528] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1E3528] truncate">{prod.name}</p>
                      <p className="text-[11px] text-[#6B7F59] font-semibold">
                        Terjual {prod.total_sold} buket
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Filter Status Pembayaran (FR-21) — min-h-[44px] & gap-2 (8px) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {PAYMENT_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setPaymentFilter(f.value)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold shrink-0 transition min-h-[44px] ${
              paymentFilter === f.value
                ? 'bg-[#1E3528] text-white shadow-sm'
                : 'bg-white text-[#2F4538] border border-[#EAE6DF] hover:border-[#1E3528]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#EAE6DF] h-28 animate-pulse p-6"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 text-center text-red-700 text-sm font-medium">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 text-center space-y-2">
          <ClipboardList className="w-8 h-8 text-[#6B7F59] mx-auto" />
          <h2 className="font-serif text-lg font-bold text-[#1E3528]">
            Tidak Ada Pesanan pada Filter Ini
          </h2>
          <p className="text-xs text-[#2F4538] leading-relaxed">
            Pilih tab &ldquo;Semua Pesanan&rdquo; untuk melihat seluruh transaksi yang masuk.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="sr-only">Daftar Pesanan Masuk</h2>
          {orders.map((order) => {
            const statusBadge = getStatusBadgeStyle(order.status);
            const paymentBadge = getPaymentBadgeStyle(order.payment_status);

            return (
              <Link
                key={order.id}
                to={`/admin/pesanan/${order.id}`}
                className="block bg-white rounded-2xl border border-[#EAE6DF] p-5 hover:border-[#D45D79] transition shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#EAE6DF]">
                  <div>
                    <span className="text-[11px] font-mono text-[#2F4538] block mb-1">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#1E3528] flex items-center gap-2">
                      <User className="w-4 h-4 text-[#6B7F59] shrink-0" />
                      <span>{order.customers?.name || 'Pelanggan'}</span>
                      <span className="text-xs font-sans font-normal text-[#2F4538]">
                        ({order.customers?.phone || '-'})
                      </span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
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
                    <span className="text-sm font-bold text-[#D45D79]">
                      {formatCurrency(order.total)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#1E3528]" />
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
