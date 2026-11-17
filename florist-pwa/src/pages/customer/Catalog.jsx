import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SlidersHorizontal, WifiOff } from 'lucide-react';
import api from '../../services/api.js';
import ProductCard from '../../components/ProductCard.jsx';
import { useOnline } from '../../hooks/useOnline.js';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'semua';

  const { isOnline } = useOnline();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const catFromUrl = searchParams.get('category') || 'semua';
    setSelectedCategory(catFromUrl);
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    async function fetchCatalog() {
      setLoading(true);
      setError('');
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products'),
        ]);
        if (!mounted) return;
        setCategories(catRes.data || []);
        setProducts(prodRes.data || []);
      } catch (err) {
        if (!mounted) return;
        setError(
          err.response?.data?.error ||
            'Gagal memuat katalog bunga. Pastikan koneksi internet aktif.'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    if (catId === 'semua') {
      searchParams.delete('category');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ category: catId }, { replace: true });
    }
  };

  // Filter berdasarkan kategori dan pencarian nama produk (FR-02)
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchCat =
        selectedCategory === 'semua' || item.category_id === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        item.name?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
      {/* Header Katalog */}
      <div className="bg-[#FDF2F4] rounded-2xl p-6 border border-[#EAE6DF] mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
              Koleksi Buket Segar
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3528] leading-tight">
              Katalog Bunga Bloom &amp; Co.
            </h1>
          </div>

          {!isOnline && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>Menampilkan Data Cache Offline</span>
            </span>
          )}
        </div>

        {/* Input Pencarian Nama Buket */}
        <div className="mt-4 relative">
          <label htmlFor="catalog-search" className="sr-only">
            Cari nama buket bunga
          </label>
          <Search className="w-4 h-4 text-[#2F4538] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="catalog-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mawar, lily, matahari, wisuda..."
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

      {/* Filter Kategori Pill — min-h-[44px] & gap-2 (8px) sesuai Aturan 3C */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#2F4538] pr-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-[#6B7F59]" />
          <span>Kategori:</span>
        </span>

        <button
          type="button"
          onClick={() => handleSelectCategory('semua')}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold shrink-0 transition min-h-[44px] ${
            selectedCategory === 'semua'
              ? 'bg-[#1E3528] text-white shadow-sm'
              : 'bg-white text-[#2F4538] border border-[#EAE6DF] hover:border-[#1E3528]'
          }`}
        >
          Semua Koleksi ({products.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleSelectCategory(cat.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold shrink-0 transition min-h-[44px] ${
              selectedCategory === cat.id
                ? 'bg-[#D45D79] text-white shadow-sm'
                : 'bg-white text-[#2F4538] border border-[#EAE6DF] hover:border-[#D45D79]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Daftar Produk */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#EAE6DF] h-72 animate-pulse p-4"
            >
              <div className="w-full h-44 bg-[#EEF1EA] rounded-xl mb-3" />
              <div className="h-4 bg-[#EEF1EA] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[#EEF1EA] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 text-center">
          <h2 className="font-serif text-lg font-bold text-[#1E3528]">{error}</h2>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 text-center space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#1E3528]">
            Buket yang Anda cari tidak ditemukan
          </h2>
          <p className="text-xs sm:text-sm text-[#2F4538] leading-relaxed">
            Coba kata kunci lain atau tampilkan seluruh kategori bunga.
          </p>
          <button
            type="button"
            onClick={() => {
              handleSelectCategory('semua');
              setSearchQuery('');
            }}
            className="px-6 py-3 rounded-full bg-[#D45D79] text-white text-xs font-semibold min-h-[44px]"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
