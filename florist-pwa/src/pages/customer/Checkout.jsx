import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageSquareHeart,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  WifiOff,
  Loader2,
} from 'lucide-react';
import api, { CustomerStorage } from '../../services/api.js';
import { useCart } from '../../hooks/useCart.js';
import { useOnline } from '../../hooks/useOnline.js';
import { formatCurrency, getMinPickupDate } from '../../utils/formatCurrency.js';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { isOnline } = useOnline();

  const savedCustomer = CustomerStorage.getCustomerInfo();
  const minDate = getMinPickupDate();

  const [form, setForm] = useState({
    customer_name: savedCustomer.name || '',
    customer_phone: savedCustomer.phone || '',
    pickup_date: minDate,
    pickup_time: '09:00',
    card_message: '',
  });

  const [storeInfo, setStoreInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!CustomerStorage.isLoggedIn()) {
      navigate('/profil?redirect=%2Fcheckout', { replace: true });
      return;
    }

    api
      .get('/config')
      .then((res) => setStoreInfo(res.data?.store_info || null))
      .catch(() => {});
  }, [navigate]);

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 space-y-4">
          <h1 className="font-serif text-2xl font-bold text-[#1E3528]">
            Keranjang Anda Kosong
          </h1>
          <p className="text-sm text-[#2F4538] leading-relaxed">
            Silakan pilih buket bunga terlebih dahulu sebelum melakukan checkout.
          </p>
          <Link
            to="/katalog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D45D79] text-white text-sm font-semibold min-h-[44px]"
          >
            <span>Ke Katalog</span>
          </Link>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) {
      setError('Anda sedang offline. Sambungkan internet untuk membuat pesanan.');
      return;
    }

    if (form.pickup_date < minDate) {
      setError('Tanggal pengambilan minimal H+1 (besok).');
      return;
    }

    if (form.pickup_time < '08:00') {
      setError('Jam pengambilan minimal mulai pukul 08:00 pagi.');
      return;
    }

    if (form.card_message.length > 200) {
      setError('Kartu ucapan maksimal 200 karakter.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        pickup_date: form.pickup_date,
        pickup_time: form.pickup_time,
        card_message: form.card_message.trim(),
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      };

      const res = await api.post('/orders', payload);
      const createdOrder = res.data;

      // Simpan ID pesanan & profil pelanggan ke localStorage (FR-08)
      CustomerStorage.addOrderId(createdOrder.id);
      CustomerStorage.saveCustomerInfo({
        name: form.customer_name.trim(),
        phone: form.customer_phone.trim(),
      });

      clearCart();
      navigate(`/pesanan/${createdOrder.id}?created=1`, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Gagal membuat pesanan. Periksa kembali ketersediaan stok atau data Anda.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/keranjang')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#EAE6DF] text-xs font-semibold text-[#1E3528] hover:border-[#D45D79] min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Kembali ke Keranjang</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Checkout */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
                Langkah Terakhir
              </span>
              <h1 className="font-serif text-2xl font-bold text-[#1E3528] leading-tight">
                Data Pemesan &amp; Jadwal Ambil
              </h1>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Nama Pemesan */}
            <div>
              <label
                htmlFor="customer_name"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Nama Lengkap Pemesan *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="customer_name"
                  name="customer_name"
                  type="text"
                  required
                  value={form.customer_name}
                  onChange={handleChange}
                  placeholder="Contoh: Nadira Putri"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>
            </div>

            {/* Nomor Telepon */}
            <div>
              <label
                htmlFor="customer_phone"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Nomor WhatsApp / Telepon Aktif *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="customer_phone"
                  name="customer_phone"
                  type="tel"
                  required
                  value={form.customer_phone}
                  onChange={handleChange}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>
              <p className="text-[11px] text-[#2F4538] mt-1 leading-relaxed">
                Digunakan untuk melacak pesanan dan verifikasi pembatalan pesanan.
              </p>
            </div>

            {/* Tanggal dan Jam Pengambilan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="pickup_date"
                  className="block text-xs font-semibold text-[#1E3528] mb-2"
                >
                  Tanggal Ambil di Toko (Min. H+1) *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="pickup_date"
                    name="pickup_date"
                    type="date"
                    required
                    min={minDate}
                    value={form.pickup_date}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="pickup_time"
                  className="block text-xs font-semibold text-[#1E3528] mb-2"
                >
                  Jam Pengambilan (Mulai 08:00) *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="pickup_time"
                    name="pickup_time"
                    type="time"
                    required
                    min="08:00"
                    value={form.pickup_time}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Lokasi Pengambilan Toko */}
            {storeInfo && (
              <div className="p-4 rounded-2xl bg-[#EEF1EA] border border-[#6B7F59]/25 flex items-start gap-3 text-xs text-[#1E3528]">
                <MapPin className="w-4 h-4 text-[#6B7F59] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-sans font-bold mb-1">{storeInfo.name}</h3>
                  <p className="text-[#2F4538] leading-relaxed">{storeInfo.address}</p>
                  <p className="text-[#6B7F59] font-semibold mt-1">
                    Jam Buka Pengambilan: Mulai pukul {storeInfo.open_time} WIB
                  </p>
                </div>
              </div>
            )}

            {/* Kartu Ucapan */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="card_message"
                  className="text-xs font-semibold text-[#1E3528] flex items-center gap-2"
                >
                  <MessageSquareHeart className="w-4 h-4 text-[#D45D79]" />
                  <span>Isi Kartu Ucapan (Opsional)</span>
                </label>
                <span className="text-[11px] text-[#2F4538] font-medium">
                  {form.card_message.length}/200
                </span>
              </div>
              <textarea
                id="card_message"
                name="card_message"
                rows={3}
                maxLength={200}
                value={form.card_message}
                onChange={handleChange}
                placeholder="Tuliskan pesan manis untuk penerima buket..."
                className="w-full p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79]"
              />
            </div>

            {!isOnline && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>Tombol buat pesanan dinonaktifkan karena perangkat sedang offline.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!isOnline || submitting}
              className={`w-full py-3.5 px-6 rounded-full text-sm font-semibold flex items-center justify-center gap-2 min-h-[48px] transition ${
                !isOnline || submitting
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-[#D45D79] hover:bg-[#B84763] text-white shadow-sm'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{submitting ? 'Memproses Pesanan...' : 'Buat Pesanan Sekarang'}</span>
            </button>
          </div>
        </form>

        {/* Ringkasan Item */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial">
            <h2 className="font-serif text-xl font-bold text-[#1E3528]">
              Ringkasan Buket
            </h2>

            <ul className="divide-y divide-[#EAE6DF]">
              {items.map((item) => (
                <li key={item.id} className="py-3 flex justify-between gap-3 text-sm">
                  <div>
                    <h3 className="font-sans font-semibold text-[#1E3528]">{item.name}</h3>
                    <p className="text-xs text-[#2F4538]">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold text-[#1E3528]">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-[#EAE6DF] flex items-center justify-between">
              <span className="text-sm font-bold text-[#1E3528]">Total Pembayaran</span>
              <span className="text-xl font-bold text-[#D45D79]">
                {formatCurrency(totalPrice)}
              </span>
            </div>
            <p className="text-[11px] text-[#2F4538] leading-relaxed">
              * Total akhir dihitung dan divalidasi langsung oleh server dari database saat pesanan
              dibuat. Informasi rekening bank akan tampil setelah pesanan berhasil dibuat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
