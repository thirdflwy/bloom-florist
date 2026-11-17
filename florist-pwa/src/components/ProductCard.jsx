import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency.js';
import { useCart } from '../hooks/useCart.js';
import { CustomerStorage } from '../services/api.js';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const isOutOfStock = Number(product.stock || 0) <= 0;
  const categoryName = product.categories?.name || 'Koleksi Buket';

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    if (!CustomerStorage.isLoggedIn()) {
      navigate(`/profil?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <article className="group bg-white rounded-2xl border border-[#EAE6DF] overflow-hidden shadow-editorial hover:shadow-md transition-all duration-300 flex flex-col">
      <Link
        to={`/produk/${product.id}`}
        className="relative block aspect-[4/5] overflow-hidden bg-[#FDF2F4]"
      >
        <img
          src={product.image_url || FALLBACK_IMAGE}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badge Kategori */}
        <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-white/95 backdrop-blur-sm text-[#1E3528] border border-[#EAE6DF]">
          {categoryName}
        </span>

        {/* Badge Stok */}
        {isOutOfStock ? (
          <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-semibold bg-neutral-900/85 text-white">
            Stok Habis
          </span>
        ) : Number(product.stock) <= 5 ? (
          <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#D45D79] text-white">
            Sisa {product.stock}
          </span>
        ) : null}
      </Link>

      {/* Container Padding min 16px (p-4) sesuai Aturan 3C */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-4">
        <div>
          <Link to={`/produk/${product.id}`}>
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#1E3528] group-hover:text-[#D45D79] transition-colors line-clamp-1 leading-snug mb-1">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-[#2F4538] line-clamp-2 leading-relaxed">
            {product.description || 'Rangkaian bunga segar pilihan dengan kartu ucapan gratis.'}
          </p>
        </div>

        <div className="pt-3 flex flex-col gap-3 border-t border-[#EAE6DF]">
          <div className="min-w-0">
            <span className="text-[11px] uppercase tracking-wider text-[#6B7F59] font-semibold block">
              Harga
            </span>
            <span className="text-sm sm:text-base font-bold text-[#1E3528] block truncate">
              {formatCurrency(product.price)}
            </span>
          </div>

          {/* Touch target minimal 44px & full width agar tidak terpotong di grid 2 kolom mobile */}
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            className={`w-full px-3 py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px] transition-all ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : added
                ? 'bg-[#6B7F59] text-white'
                : 'bg-[#D45D79] hover:bg-[#B84763] text-white shadow-sm'
            }`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span>Ditambah</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>+ Keranjang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
