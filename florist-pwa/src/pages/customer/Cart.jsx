import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  Flower2,
  WifiOff,
} from 'lucide-react';
import { useCart } from '../../hooks/useCart.js';
import { useOnline } from '../../hooks/useOnline.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { CustomerStorage } from '../../services/api.js';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80';

export default function Cart() {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, updateQuantity, removeFromCart } = useCart();
  const { isOnline } = useOnline();

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 pb-24 text-center">
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 space-y-4 shadow-editorial">
          <div className="w-16 h-16 rounded-full bg-[#FDF2F4] text-[#D45D79] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E3528]">
            Keranjang Bunga Masih Kosong
          </h1>
          <p className="text-sm text-[#2F4538] max-w-sm mx-auto leading-relaxed">
            Pilih rangkaian buket segar favorit Anda di katalog dan tambahkan kartu ucapan spesial.
          </p>
          <div className="pt-2">
            <Link
              to="/katalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D45D79] hover:bg-[#B84763] text-white text-sm font-semibold min-h-[44px] transition"
            >
              <Flower2 className="w-4 h-4 shrink-0" />
              <span>Lihat Katalog Bunga</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
      <div className="mb-6">
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
          Keranjang Belanja
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3528] leading-tight">
          Rangkaian Pilihan Anda ({totalItems} Item)
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daftar Item */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="sr-only">Daftar Buket di Keranjang</h2>
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#EAE6DF] p-4 flex gap-4 items-center shadow-sm"
            >
              <Link
                to={`/produk/${item.id}`}
                className="w-20 h-24 rounded-xl overflow-hidden bg-[#FDF2F4] shrink-0"
              >
                <img
                  src={item.image_url || FALLBACK_IMAGE}
                  alt={item.name}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                  className="w-full h-full object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-[#6B7F59] font-bold block mb-1">
                  {item.category_name || 'Buket Bunga'}
                </span>
                <Link to={`/produk/${item.id}`}>
                  <h3 className="font-serif text-base font-bold text-[#1E3528] truncate hover:text-[#D45D79] mb-1">
                    {item.name}
                  </h3>
                </Link>
                <p className="text-sm font-bold text-[#D45D79]">
                  {formatCurrency(item.price)}
                </p>

                {/* Kontrol jumlah & hapus — tinggi sentuh minimal 44px */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center border border-[#EAE6DF] rounded-full bg-[#FAF8F5] p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E3528] hover:bg-white transition"
                      aria-label="Kurangi jumlah"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-[#1E3528]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= Number(item.stock || 99)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E3528] hover:bg-white disabled:opacity-40 transition"
                      aria-label="Tambah jumlah"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="w-11 h-11 rounded-full text-red-600 hover:bg-red-50 flex items-center justify-center transition"
                    aria-label={`Hapus ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ringkasan Total */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial sticky top-20">
            <h2 className="font-serif text-xl font-bold text-[#1E3528]">
              Ringkasan Pesanan
            </h2>

            <div className="space-y-2 text-sm border-y border-[#EAE6DF] py-4">
              <div className="flex justify-between text-[#2F4538]">
                <span>Total Buket ({totalItems} item)</span>
                <span className="font-semibold">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-[#2F4538]">
                <span>Kartu Ucapan Personal</span>
                <span className="text-[#6B7F59] font-semibold">Gratis</span>
              </div>
              <div className="flex justify-between text-[#2F4538]">
                <span>Metode Pengambilan</span>
                <span className="font-semibold">Ambil di Toko</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#1E3528]">Estimasi Total</span>
              <span className="text-xl font-bold text-[#D45D79]">
                {formatCurrency(totalPrice)}
              </span>
            </div>

            {!isOnline && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>Checkout membutuhkan koneksi internet aktif.</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (!CustomerStorage.isLoggedIn()) {
                  navigate('/profil?redirect=%2Fcheckout');
                  return;
                }
                navigate('/checkout');
              }}
              disabled={!isOnline}
              className={`w-full py-3.5 px-6 rounded-full text-sm font-semibold flex items-center justify-center gap-2 min-h-[48px] transition ${
                !isOnline
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-[#D45D79] hover:bg-[#B84763] text-white shadow-sm'
              }`}
            >
              <span>
                {CustomerStorage.isLoggedIn()
                  ? 'Lanjut ke Checkout'
                  : 'Masuk Profil untuk Checkout'}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
