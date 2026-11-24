import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit3,
  PowerOff,
  RotateCcw,
  Upload,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  X,
  Loader2,
} from 'lucide-react';
import api, { AdminSession } from '../../services/api.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { compressImage } from '../../utils/imageCompress.js';
import { useOnline } from '../../hooks/useOnline.js';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=500&q=80';

const INITIAL_FORM = {
  name: '',
  category_id: '',
  price: '',
  stock: '',
  description: '',
};

export default function AdminProducts() {
  const navigate = useNavigate();
  const { isOnline } = useOnline();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('semua'); // 'semua' | category_id | 'nonaktif'
  const [form, setForm] = useState(INITIAL_FORM);
  const [imageFile, setImageFile] = useState(null);

  const loadData = useCallback(async () => {
    if (!AdminSession.isLoggedIn()) {
      navigate('/admin', { replace: true });
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/admin/products'),
        api.get('/categories'),
      ]);
      const cats = catRes.data || [];
      setProducts(prodRes.data || []);
      setCategories(cats);
      if (cats.length > 0) {
        setForm((prev) => ({
          ...prev,
          category_id: prev.category_id || cats[0].id,
        }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        AdminSession.clearKey();
        navigate('/admin', { replace: true });
        return;
      }
      setError(err.response?.data?.error || 'Gagal memuat katalog produk admin.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...INITIAL_FORM,
      category_id: categories[0]?.id || '',
    });
    setImageFile(null);
  };

  const handleStartEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      category_id: product.category_id || categories[0]?.id || '',
      price: String(product.price ?? 0),
      stock: String(product.stock ?? 0),
      description: product.description || '',
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) return;

    setSubmitting(true);
    setError('');
    setFeedback('');

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('category_id', form.category_id);
      formData.append('price', String(Number(form.price)));
      formData.append('stock', String(Number(form.stock)));
      formData.append('description', form.description.trim());

      if (imageFile) {
        const compressed = await compressImage(imageFile);
        formData.append('image', compressed);
      }

      if (editingId) {
        await api.put(`/products/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setFeedback('Data produk berhasil diperbarui.');
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setFeedback('Produk baru berhasil ditambahkan ke katalog.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Gagal menyimpan data produk.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Nonaktifkan produk / Soft delete (FR-28) dengan konfirmasi eksplisit
  const handleDeactivate = async (product) => {
    if (!isOnline) return;
    setTogglingId(product.id);
    setError('');
    setFeedback('');

    try {
      await api.delete(`/products/${product.id}`);
      setConfirmDeactivateId(null);
      setFeedback(`Produk "${product.name}" dinonaktifkan dari katalog publik.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menonaktifkan produk.');
    } finally {
      setTogglingId(null);
    }
  };

  // Aktifkan kembali produk nonaktif (FR-28)
  const handleReactivate = async (product) => {
    if (!isOnline) return;
    setTogglingId(product.id);
    setError('');
    setFeedback('');

    try {
      await api.put(`/products/${product.id}`, { is_available: true });
      setFeedback(`Produk "${product.name}" kembali aktif di katalog publik.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengaktifkan kembali produk.');
    } finally {
      setTogglingId(null);
    }
  };

  const activeProducts = products.filter((p) => p.is_available);
  const inactiveProducts = products.filter((p) => !p.is_available);

  const visibleActiveProducts =
    selectedFilter === 'nonaktif'
      ? []
      : selectedFilter === 'semua'
      ? activeProducts
      : activeProducts.filter((p) => p.category_id === selectedFilter);

  const visibleInactiveProducts =
    selectedFilter === 'semua' || selectedFilter === 'nonaktif' ? inactiveProducts : [];

  const renderProductCard = (prod) => {
    const isBusy = togglingId === prod.id;
    const isConfirming = confirmDeactivateId === prod.id;

    return (
      <div
        key={prod.id}
        className={`rounded-2xl border p-4 flex gap-4 items-center transition ${
          prod.is_available
            ? 'bg-white border-[#EAE6DF]'
            : 'bg-gray-50 border-gray-300 opacity-85'
        }`}
      >
        <div className="w-20 h-24 rounded-xl overflow-hidden bg-[#FDF2F4] shrink-0">
          <img
            src={prod.image_url || FALLBACK_IMAGE}
            alt={prod.name}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                prod.is_available
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {prod.is_available ? 'Aktif' : 'Nonaktif'}
            </span>
            <span className="text-[11px] text-[#6B7F59] font-semibold truncate">
              {prod.categories?.name || 'Kategori'}
            </span>
          </div>

          <h3 className="font-serif text-base font-bold text-[#1E3528] truncate">
            {prod.name}
          </h3>

          <div className="flex items-center gap-4 text-xs">
            <span className="font-bold text-[#D45D79]">
              {formatCurrency(prod.price)}
            </span>
            <span className="text-[#2F4538]">Stok: {prod.stock}</span>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!isOnline || isBusy}
              onClick={() => handleStartEdit(prod)}
              className="px-4 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#EEF1EA] border border-[#EAE6DF] text-xs font-semibold text-[#1E3528] inline-flex items-center gap-2 min-h-[44px]"
            >
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              <span>Ubah</span>
            </button>

            {prod.is_available ? (
              isConfirming ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!isOnline || isBusy}
                    onClick={() => handleDeactivate(prod)}
                    className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-2 min-h-[44px]"
                  >
                    {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Ya, Nonaktifkan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeactivateId(null)}
                    className="px-3 py-2 rounded-full bg-gray-100 text-xs font-semibold text-[#1E3528] min-h-[44px]"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!isOnline || isBusy}
                  onClick={() => setConfirmDeactivateId(prod.id)}
                  className="px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold inline-flex items-center gap-2 min-h-[44px]"
                >
                  <PowerOff className="w-3.5 h-3.5 shrink-0" />
                  <span>Nonaktifkan</span>
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={!isOnline || isBusy}
                onClick={() => handleReactivate(prod)}
                className="px-4 py-2 rounded-full bg-[#6B7F59] hover:bg-[#576947] text-white text-xs font-semibold inline-flex items-center gap-2 min-h-[44px]"
              >
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>Aktifkan Kembali</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-20 space-y-6">
      <div>
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
          Manajemen Katalog Buket
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3528] leading-tight">
          Kelola Produk &amp; Unggah Foto
        </h1>
      </div>

      {!isOnline && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Mode Offline: Tambah, ubah, dan nonaktifkan produk dinonaktifkan sementara.</span>
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

      {/* FORM TAMBAH / UBAH PRODUK (FR-26 & FR-27) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-[#EAE6DF] p-6 space-y-4 shadow-editorial"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-xl font-bold text-[#1E3528]">
            {editingId ? 'Ubah Produk Buket' : 'Tambah Produk Buket Baru'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-full bg-gray-100 text-xs font-semibold text-[#1E3528] inline-flex items-center gap-2 min-h-[44px]"
            >
              <X className="w-4 h-4" />
              <span>Batal Edit</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="prod-name"
              className="block text-xs font-semibold text-[#1E3528] mb-2"
            >
              Nama Buket Bunga *
            </label>
            <input
              id="prod-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Contoh: Royal Blush Peony Bouquet"
              className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor="prod-cat"
              className="block text-xs font-semibold text-[#1E3528] mb-2"
            >
              Kategori Momen *
            </label>
            <select
              id="prod-cat"
              required
              value={form.category_id}
              onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm min-h-[44px]"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="prod-price"
              className="block text-xs font-semibold text-[#1E3528] mb-2"
            >
              Harga (Rupiah) *
            </label>
            <input
              id="prod-price"
              type="number"
              min="0"
              required
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              placeholder="Contoh: 285000"
              className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor="prod-stock"
              className="block text-xs font-semibold text-[#1E3528] mb-2"
            >
              Stok Tersedia *
            </label>
            <input
              id="prod-stock"
              type="number"
              min="0"
              step="1"
              required
              value={form.stock}
              onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
              placeholder="Contoh: 15"
              className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm min-h-[44px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="prod-desc"
              className="block text-xs font-semibold text-[#1E3528] mb-2"
            >
              Deskripsi Buket
            </label>
            <textarea
              id="prod-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Komposisi bunga, jenis wrapping, dan nuansa buket..."
              className="w-full p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="prod-image"
              className="block text-xs font-semibold text-[#1E3528] mb-2"
            >
              Foto Produk Buket (JPG, PNG, WebP · Maks. 2 MB, otomatis dikompres di klien)
            </label>
            <input
              id="prod-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-[#2F4538] file:mr-3 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#FDF2F4] file:text-[#D45D79]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!isOnline || submitting}
          className="px-6 py-3 rounded-full bg-[#D45D79] hover:bg-[#B84763] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 min-h-[44px] transition shadow-sm"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : editingId ? (
            <Upload className="w-4 h-4 shrink-0" />
          ) : (
            <Plus className="w-4 h-4 shrink-0" />
          )}
          <span>
            {submitting
              ? 'Menyimpan Produk...'
              : editingId
              ? 'Simpan Perubahan Produk'
              : 'Tambah Produk ke Katalog'}
          </span>
        </button>
      </form>

      {/* DAFTAR SEMUA PRODUK TERMASUK NONAKTIF (FR-28) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl font-bold text-[#1E3528]">
            Daftar Produk ({products.length})
          </h2>
        </div>

        {/* Filter Kategori Produk + Kategori Nonaktif */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedFilter('semua')}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold shrink-0 transition min-h-[44px] ${
              selectedFilter === 'semua'
                ? 'bg-[#1E3528] text-white shadow-sm'
                : 'bg-white text-[#2F4538] border border-[#EAE6DF] hover:border-[#1E3528]'
            }`}
          >
            Semua ({products.length})
          </button>

          {categories.map((cat) => {
            const count = activeProducts.filter((p) => p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedFilter(cat.id)}
                className={`px-4 py-2.5 rounded-full text-xs font-semibold shrink-0 transition min-h-[44px] ${
                  selectedFilter === cat.id
                    ? 'bg-[#D45D79] text-white shadow-sm'
                    : 'bg-white text-[#2F4538] border border-[#EAE6DF] hover:border-[#D45D79]'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedFilter('nonaktif')}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold shrink-0 transition min-h-[44px] ${
              selectedFilter === 'nonaktif'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'bg-white text-neutral-700 border border-neutral-300 hover:border-neutral-800'
            }`}
          >
            Nonaktif ({inactiveProducts.length})
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-[#EAE6DF] h-32 animate-pulse p-4"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Produk Aktif */}
            {selectedFilter !== 'nonaktif' && (
              <div className="space-y-3">
                {visibleActiveProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 text-center text-xs text-[#2F4538]">
                    Tidak ada produk aktif pada kategori ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleActiveProducts.map((prod) => renderProductCard(prod))}
                  </div>
                )}
              </div>
            )}

            {/* Kategori Nonaktif — selalu berada di paling bawah */}
            {visibleInactiveProducts.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#EAE6DF]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-serif text-lg font-bold text-neutral-700">
                    Kategori Nonaktif ({visibleInactiveProducts.length})
                  </h3>
                  <span className="text-[11px] font-medium text-neutral-500">
                    Tidak tampil di katalog pelanggan
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleInactiveProducts.map((prod) => renderProductCard(prod))}
                </div>
              </div>
            )}

            {selectedFilter === 'nonaktif' && visibleInactiveProducts.length === 0 && (
              <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 text-center text-xs text-[#2F4538]">
                Belum ada produk yang dinonaktifkan.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
