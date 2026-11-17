import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  Check,
  Flower2,
  Clock,
  Gift,
} from 'lucide-react';
import api, { CustomerStorage } from '../../services/api.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { useCart } from '../../hooks/useCart.js';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=900&q=80';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/products/${id}`);
        if (!mounted) return;
        setProduct(res.data);
      } catch (err) {
        if (!mounted) return;
        setError(
          err.response?.data?.error || 'Produk tidak ditemukan atau sedang tidak aktif.'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 animate-pulse grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-[4/5] rounded-2xl bg-[#EEF1EA]" />
          <div className="space-y-4 py-4">
            <div className="h-5 bg-[#EEF1EA] rounded w-1/3" />
            <div className="h-8 bg-[#EEF1EA] rounded w-3/4" />
            <div className="h-6 bg-[#EEF1EA] rounded w-1/2" />
            <div className="h-24 bg-[#EEF1EA] rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 space-y-4">
          <h1 className="font-serif text-2xl font-bold text-[#1E3528]">
            Buket Tidak Tersedia
          </h1>
          <p className="text-sm text-[#2F4538] leading-relaxed">{error}</p>
          <Link
            to="/katalog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D45D79] text-white text-sm font-semibold min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog</span>
          </Link>
        </div>
      </div>
    );
  }

  const maxStock = Number(product.stock || 0);
  const existingInCart = items.find((i) => i.id === product.id)?.quantity || 0;
  const remainingAddable = Math.max(0, maxStock - existingInCart);
  const isOutOfStock = maxStock <= 0;

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    const cap = remainingAddable > 0 ? remainingAddable : maxStock;
    setQuantity((prev) => Math.min(cap, prev + 1));
  };

  const handleAddToCart = () => {
    if (isOutOfStock || quantity <= 0) return;

    if (!CustomerStorage.isLoggedIn()) {
      navigate(`/profil?redirect=${encodeURIComponent(`/produk/${id}`)}`);
      return;
    }

    addToCart(product, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
      {/* Navigasi Kembali */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#EAE6DF] text-xs sm:text-sm font-semibold text-[#1E3528] hover:border-[#D45D79] transition min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Kembali</span>
        </button>

        <Link
          to="/keranjang"
          className="px-4 py-2.5 rounded-full bg-[#FDF2F4] text-xs font-semibold text-[#D45D79] hover:bg-[#D45D79] hover:text-white inline-flex items-center min-h-[44px] transition"
        >
          Lihat Keranjang →
        </Link>
      </div>

      {/* Konten Detail Produk */}
      <div className="bg-white rounded-2xl border border-[#EAE6DF] overflow-hidden shadow-editorial grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-6 bg-[#FDF2F4] relative aspect-[4/5] md:aspect-auto">
          <img
            src={product.image_url || FALLBACK_IMAGE}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-xs font-semibold text-[#1E3528] border border-[#EAE6DF]">
            {product.categories?.name || 'Buket Bunga'}
          </span>
        </div>

        <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 text-xs text-[#6B7F59] font-semibold">
              <span>SKU: {product.sku || 'BLM-COLLECTION'}</span>
              <span
                className={`px-3 py-1 rounded-full font-semibold ${
                  isOutOfStock
                    ? 'bg-red-100 text-red-700'
                    : 'bg-[#EEF1EA] text-[#1E3528]'
                }`}
              >
                {isOutOfStock ? 'Stok Habis' : `Stok Tersedia: ${maxStock}`}
              </span>
            </div>

            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3528] leading-tight mb-2">
                {product.name}
              </h1>
              <p className="text-2xl font-bold text-[#D45D79]">
                {formatCurrency(product.price)}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-base font-bold text-[#1E3528]">
                Deskripsi Rangkaian
              </h2>
              <p className="text-sm text-[#2F4538] leading-relaxed">
                {product.description ||
                  'Buket bunga segar dirangkai secara eksklusif oleh florist profesional Bloom & Co.'}
              </p>
            </div>

            {/* Info Tambahan sebagai semantic list <ul> */}
            <div className="pt-4 border-t border-[#EAE6DF]">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#6B7F59] mb-2">
                Keunggulan Pemesanan
              </h3>
              <ul className="space-y-2 text-xs text-[#2F4538]">
                <li className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#D45D79] shrink-0" />
                  <span>Termasuk kartu ucapan cetak gratis (diisi saat checkout)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#6B7F59] shrink-0" />
                  <span>Pengambilan di toko mulai pukul 08.00 pagi (minimal H+1)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Flower2 className="w-4 h-4 text-[#1E3528] shrink-0" />
                  <span>Jaminan kesegaran bunga saat diambil di atelier</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pemilih Jumlah & Tombol Tambah ke Keranjang (FR-03) */}
          <div className="space-y-4 pt-4 border-t border-[#EAE6DF]">
            {existingInCart > 0 && (
              <p className="text-xs text-[#6B7F59] font-semibold">
                Sudah ada {existingInCart} buket ini di keranjang Anda.
              </p>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-[#EAE6DF] rounded-full bg-[#FAF8F5] p-1">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={isOutOfStock || quantity <= 1}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[#1E3528] hover:bg-white disabled:opacity-40 transition"
                  aria-label="Kurangi jumlah"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold text-[#1E3528]">
                  {isOutOfStock ? 0 : quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={
                    isOutOfStock ||
                    quantity >= (remainingAddable > 0 ? remainingAddable : maxStock)
                  }
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[#1E3528] hover:bg-white disabled:opacity-40 transition"
                  aria-label="Tambah jumlah"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || remainingAddable <= 0}
                className={`flex-1 py-3.5 px-6 rounded-full text-sm font-semibold flex items-center justify-center gap-2 min-h-[48px] transition ${
                  isOutOfStock || remainingAddable <= 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : addedFeedback
                    ? 'bg-[#6B7F59] text-white'
                    : 'bg-[#D45D79] hover:bg-[#B84763] text-white shadow-sm'
                }`}
              >
                {addedFeedback ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Berhasil Ditambahkan</span>
                  </>
                ) : remainingAddable <= 0 && !isOutOfStock ? (
                  <span>Batas Stok di Keranjang Tercapai</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>Tambah ke Keranjang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
