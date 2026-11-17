import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import api, { AdminSession } from '../../services/api.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [adminKey, setAdminKey] = useState(() => AdminSession.getKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (AdminSession.isLoggedIn()) {
      api
        .get('/admin/ping')
        .then(() => navigate('/admin/pesanan', { replace: true }))
        .catch(() => AdminSession.clearKey());
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setError('Masukkan kunci admin terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      AdminSession.setKey(adminKey.trim());
      await api.get('/admin/ping');
      navigate('/admin/pesanan', { replace: true });
    } catch (err) {
      AdminSession.clearKey();
      setError(
        err.response?.data?.error ||
          'Admin key tidak valid atau tidak dapat terhubung ke server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 sm:p-8 space-y-6 shadow-editorial">
        <div className="w-12 h-12 rounded-2xl bg-[#1E3528] text-[#FAF8F5] flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-[#D45D79]" />
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
            Portal Internal Penjual
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#1E3528] leading-tight mb-1">
            Masuk Panel Admin
          </h1>
          <p className="text-xs sm:text-sm text-[#2F4538] leading-relaxed">
            Masukkan <code className="font-mono text-[#1E3528] font-semibold">ADMIN_KEY</code> toko
            untuk memverifikasi pembayaran dan mengelola katalog buket.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-key-input"
              className="block text-xs font-semibold text-[#1E3528] mb-2"
            >
              Admin Secret Key *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-key-input"
                type="password"
                required
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Masukkan kunci rahasia admin..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-[#D45D79] hover:bg-[#B84763] text-white text-sm font-semibold flex items-center justify-center gap-2 min-h-[48px] transition shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <ArrowRight className="w-4 h-4 shrink-0" />
            )}
            <span>{loading ? 'Memverifikasi Kunci...' : 'Masuk ke Panel Penjual'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
