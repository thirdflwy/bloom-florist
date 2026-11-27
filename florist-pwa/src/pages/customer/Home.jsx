import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Flower2,
  Gift,
  Clock,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api.js';
import ProductCard from '../../components/ProductCard.jsx';
import { useOnline } from '../../hooks/useOnline.js';

const CATEGORY_VISUALS = [
  'https://i.pinimg.com/1200x/be/e6/8f/bee68f10a7d141fff2cae1b25ea3fadb.jpg',
  'https://i.pinimg.com/736x/12/65/8c/12658cbd28a4a7d31db5bb1f102d2b1e.jpg',
  'https://i.pinimg.com/736x/17/ff/f7/17fff74ce018d2dba5a09d88683e808c.jpg',
  'https://i.pinimg.com/736x/81/1f/b8/811fb8eba8747bbac1e90fab41997545.jpg',
  'https://i.pinimg.com/736x/7d/4b/d9/7d4bd98fb981677b00b3f99c6c2f3a9c.jpg',
];

export default function Home() {
  const navigate = useNavigate();
  const { isOnline } = useOnline();
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadHomeData() {
      setLoading(true);
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products'),
        ]);
        if (!mounted) return;
        setCategories(catRes.data || []);
        setFeaturedProducts((prodRes.data || []).slice(0, 6));
      } catch {
        // Tetap aman jika offline dan belum ada cache
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadHomeData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="pb-24">
      {/* 1. HERO BANNER EDITORIAL */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FDF2F4] via-[#FAF8F5] to-[#EEF1EA] border-b border-[#EAE6DF]">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-[#D45D79]/30 text-[#D45D79] text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Fresh Flowers · Happy Moments</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1E3528] leading-tight">
              Ungkapkan Perasaan Lebih Indah Lewat Bunga
            </h1>

            <p className="text-sm sm:text-base text-[#2F4538] leading-relaxed max-w-xl">
              Setiap buket dirangkai secara organik dengan bunga potong segar pilihan dan kartu
              ucapan personal gratis untuk setiap momen istimewa Anda.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to="/katalog"
                className="px-6 py-3 rounded-full bg-[#D45D79] hover:bg-[#B84763] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition min-h-[44px]"
              >
                <span>Jelajahi Katalog</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>

              <Link
                to="/pesanan"
                className="px-6 py-3 rounded-full bg-white hover:bg-[#EEF1EA] text-[#1E3528] border border-[#EAE6DF] text-sm font-semibold inline-flex items-center gap-2 transition min-h-[44px]"
              >
                <span>Lacak Pesanan</span>
              </Link>
            </div>

            {/* 3 Badge Keunggulan Toko menggunakan semantic list <ul> */}
            <ul className="pt-6 grid grid-cols-3 gap-2 sm:gap-4 border-t border-[#EAE6DF]">
              <li className="flex flex-col items-center text-center">
                <div className="w-10 h-10 mb-2 rounded-full bg-white border border-[#EAE6DF] flex items-center justify-center text-[#6B7F59] shrink-0">
                  <Flower2 className="w-4 h-4" />
                </div>
                <h3 className="font-sans text-[11px] leading-snug font-medium text-[#1E3528]">
                  Bunga Segar Setiap Hari
                </h3>
              </li>

              <li className="flex flex-col items-center text-center">
                <div className="w-10 h-10 mb-2 rounded-full bg-white border border-[#EAE6DF] flex items-center justify-center text-[#D45D79] shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="font-sans text-[11px] leading-snug font-medium text-[#1E3528]">
                  Kartu Ucapan Gratis
                </h3>
              </li>

              <li className="flex flex-col items-center text-center">
                <div className="w-10 h-10 mb-2 rounded-full bg-white border border-[#EAE6DF] flex items-center justify-center text-[#1E3528] shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-sans text-[11px] leading-snug font-medium text-[#1E3528]">
                  Ambil di Toko Mulai 08.00
                </h3>
              </li>
            </ul>
          </div>

          {/* Visual Hero Buket */}
          <div className="md:col-span-5 relative">
            <div className="relative mx-auto max-w-xs sm:max-w-sm aspect-[4/5] rounded-2xl overflow-hidden border-4 border-white shadow-editorial bg-[#FDF2F4]">
              <img
                src="https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=1000&q=85"
                alt="Buket Bunga Segar Bloom & Co."
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-[#EAE6DF] flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#D45D79] font-bold mb-1">
                    Signature Edition
                  </p>
                  <p className="font-serif text-sm font-bold text-[#1E3528]">
                    Good Things Bloom Here
                  </p>
                </div>
                <Heart className="w-5 h-5 text-[#D45D79] fill-[#D45D79] shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECTION KATEGORI HORIZONTAL ("Bunga untuk Setiap Momen") */}
      <section className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <div className="text-center max-w-lg mx-auto mb-6">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
            Shop By Occasion
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3528] leading-tight">
            Bunga untuk Setiap Momen
          </h2>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/katalog?category=${cat.id}`)}
              className="group shrink-0 w-40 sm:w-44 bg-white rounded-2xl border border-[#EAE6DF] p-3 text-left hover:border-[#D45D79] transition shadow-sm"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-[#FDF2F4] mb-3">
                <img
                  src={CATEGORY_VISUALS[idx % CATEGORY_VISUALS.length]}
                  alt={cat.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-1">
                <h3 className="font-sans text-xs sm:text-sm font-semibold text-[#1E3528] line-clamp-1">
                  {cat.name}
                </h3>
                <ArrowRight className="w-4 h-4 text-[#D45D79] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. SECTION PRODUK UNGGULAN ("Buket Terlaris") */}
      <section className="bg-[#FDF2F4]/70 border-y border-[#EAE6DF] py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
                Best Sellers {!isOnline && '· Data Offline'}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3528] leading-tight">
                Buket Terlaris Pilihan Pelanggan
              </h2>
            </div>

            <Link
              to="/katalog"
              className="self-start sm:self-auto px-4 py-2.5 rounded-full bg-white border border-[#EAE6DF] text-xs font-semibold text-[#1E3528] hover:border-[#D45D79] hover:text-[#D45D79] inline-flex items-center gap-2 min-h-[44px] transition"
            >
              <span>Lihat Semua Bunga</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
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
          ) : featuredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EAE6DF] p-8 text-center">
              <h3 className="font-serif text-lg font-bold text-[#1E3528] mb-1">
                Belum ada produk aktif tersedia.
              </h3>
              <p className="text-xs text-[#2F4538] leading-relaxed">
                Silakan periksa kembali koneksi atau kunjungi halaman katalog.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. BANNER EDITORIAL BAWAH */}
      <section className="max-w-5xl mx-auto px-4 pt-8">
        <div className="rounded-2xl bg-[#1E3528] text-[#FAF8F5] p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center overflow-hidden">
          <div className="md:col-span-8 space-y-2">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#EEF1EA] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#D45D79] shrink-0" />
              <span>Pickup Atelier Service</span>
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
              Pesan Hari Ini, Ambil Segar di Atelier Kami
            </h2>
            <p className="text-xs sm:text-sm text-[#EEF1EA] leading-relaxed max-w-xl">
              Pilih tanggal pengambilan mulai H+1 dan tentukan jam ambil mulai pukul 08.00 pagi.
              Florist kami memastikan bunga tetap segar saat Anda tiba.
            </p>
          </div>
          <div className="md:col-span-4 flex md:justify-end">
            <Link
              to="/katalog"
              className="px-6 py-3 rounded-full bg-[#FAF8F5] text-[#1E3528] hover:bg-[#FDF2F4] text-sm font-semibold inline-flex items-center gap-2 min-h-[44px] transition"
            >
              <span>Mulai Memesan</span>
              <ArrowRight className="w-4 h-4 text-[#D45D79] shrink-0" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
