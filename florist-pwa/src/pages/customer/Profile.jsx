import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Flower2,
  MapPin,
  Clock,
  Building2,
  Wifi,
  WifiOff,
  Download,
  UserCheck,
  User,
  Phone,
  Mail,
  Home,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import api, { CustomerStorage, getApiErrorMessage } from '../../services/api.js';
import { useOnline } from '../../hooks/useOnline.js';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectTarget = searchParams.get('redirect') || '';

  const { isOnline, canInstall, triggerInstall } = useOnline();
  const [config, setConfig] = useState(null);

  const [customer, setCustomer] = useState(() => CustomerStorage.getCustomerInfo());
  const [isLoggedIn, setIsLoggedIn] = useState(() => CustomerStorage.isLoggedIn());
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    password: '',
    phone: '',
    email: '',
    address: '',
  });

  const [editForm, setEditForm] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    password: '',
  });

  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  useEffect(() => {
    api
      .get('/config')
      .then((res) => setConfig(res.data))
      .catch(() => {});

    // Sinkronkan ulang profil pelanggan dari database jika sudah login/tersimpan
    const rawSaved = (() => {
      try {
        return JSON.parse(localStorage.getItem('bloom_saved_customer') || 'null');
      } catch {
        return null;
      }
    })();

    if (rawSaved && (rawSaved.id || rawSaved.name)) {
      api
        .get('/customers/me', {
          params: {
            id: rawSaved.id || undefined,
            name: rawSaved.name || undefined,
          },
        })
        .then((res) => {
          if (res.data) {
            const synced = CustomerStorage.saveCustomerInfo({
              id: res.data.id,
              name: res.data.name || '',
              phone: res.data.phone || '',
              email: res.data.email || '',
              address: res.data.address || '',
              has_password: Boolean(res.data.has_password ?? true),
            });
            setCustomer(synced);
            setIsLoggedIn(Boolean(synced.phone && synced.name));
          }
        })
        .catch(() => {});
    }
  }, []);

  const completeAuthSuccess = (resData, message) => {
    const saved = CustomerStorage.saveCustomerInfo({
      id: resData.id,
      name: resData.name || '',
      phone: resData.phone || '',
      email: resData.email || '',
      address: resData.address || '',
      has_password: Boolean(resData.has_password ?? true),
    });
    setCustomer(saved);
    setIsLoggedIn(true);
    setIsEditingProfile(false);
    setSavedNotice(message);

    if (redirectTarget) {
      setTimeout(() => {
        navigate(redirectTarget, { replace: true });
      }, 600);
    }
  };

  // Handler Masuk (Nama / Nomor Telepon + Password)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSavedNotice('');

    if (!isOnline) {
      setAuthError('Anda sedang offline. Sambungkan internet untuk masuk ke akun.');
      return;
    }

    if (!loginForm.identifier.trim() || !loginForm.password) {
      setAuthError('Masukkan nama atau nomor telepon beserta password Anda.');
      return;
    }

    setLoadingAuth(true);
    try {
      const res = await api.post('/customers/login', {
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });
      setLoginForm({ identifier: '', password: '' });
      completeAuthSuccess(res.data, 'Berhasil masuk ke akun Anda.');
    } catch (err) {
      setAuthError(
        getApiErrorMessage(err, 'Gagal masuk. Periksa nama/nomor telepon dan password Anda.')
      );
    } finally {
      setLoadingAuth(false);
    }
  };

  // Handler Pendaftaran (Nama, Password, No Telepon, Email, Alamat Opsional)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSavedNotice('');

    if (!isOnline) {
      setAuthError('Anda sedang offline. Sambungkan internet untuk mendaftar akun.');
      return;
    }

    if (!registerForm.name.trim()) {
      setAuthError('Nama lengkap wajib diisi.');
      return;
    }
    if (registerForm.password.length < 6) {
      setAuthError('Password minimal 6 karakter.');
      return;
    }
    if (!registerForm.phone.trim()) {
      setAuthError('Nomor telepon wajib diisi.');
      return;
    }
    if (!registerForm.email.trim() || !registerForm.email.includes('@')) {
      setAuthError('Alamat email wajib diisi dengan format yang valid.');
      return;
    }

    setLoadingAuth(true);
    try {
      const res = await api.post('/customers/register', {
        name: registerForm.name.trim(),
        password: registerForm.password,
        phone: registerForm.phone.trim(),
        email: registerForm.email.trim(),
        address: registerForm.address.trim(),
      });
      setRegisterForm({ name: '', password: '', phone: '', email: '', address: '' });
      completeAuthSuccess(res.data, 'Pendaftaran berhasil! Akun Anda kini aktif untuk memesan.');
    } catch (err) {
      setAuthError(
        getApiErrorMessage(err, 'Gagal mendaftarkan akun. Periksa kembali data Anda.')
      );
    } finally {
      setLoadingAuth(false);
    }
  };

  // Handler Ubah Profil untuk Akun yang Sudah Login
  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSavedNotice('');

    if (!editForm.name.trim()) {
      setAuthError('Nama lengkap tidak boleh kosong.');
      return;
    }

    if (editForm.password && editForm.password.length < 6) {
      setAuthError('Password baru minimal 6 karakter.');
      return;
    }

    setLoadingAuth(true);
    try {
      let updatedData = {
        id: customer.id,
        name: editForm.name.trim(),
        phone: customer.phone,
        email: editForm.email.trim(),
        address: editForm.address.trim(),
        has_password: Boolean(editForm.password || customer.has_password),
      };

      if (isOnline) {
        const res = await api.put('/customers/profile', {
          phone: customer.phone,
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          address: editForm.address.trim(),
          password: editForm.password || undefined,
        });
        if (res.data) updatedData = res.data;
      }

      const saved = CustomerStorage.saveCustomerInfo(updatedData);
      setCustomer(saved);
      setEditForm((p) => ({ ...p, password: '' }));
      setIsEditingProfile(false);
      setShowPassword(false);
      setSavedNotice('Perubahan profil berhasil disimpan.');
    } catch (err) {
      setAuthError(getApiErrorMessage(err, 'Gagal memperbarui profil.'));
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogoutCustomer = () => {
    CustomerStorage.clearCustomerInfo();
    setCustomer({ id: null, name: '', phone: '', email: '', address: '' });
    setLoginForm({ identifier: '', password: '' });
    setRegisterForm({ name: '', password: '', phone: '', email: '', address: '' });
    setIsLoggedIn(false);
    setIsEditingProfile(false);
    setAuthMode('login');
    setAuthError('');
    setSavedNotice('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* 1. KARTU AKUN / LOGIN & DAFTAR PELANGGAN */}
      <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 sm:p-8 space-y-6 shadow-editorial">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF2F4] border border-[#D45D79]/30 text-[#D45D79] flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
                {isLoggedIn
                  ? 'Profil Pelanggan Aktif'
                  : authMode === 'login'
                  ? 'Masuk Akun Pelanggan'
                  : 'Pendaftaran Akun Baru'}
              </span>
              <h1 className="font-serif text-2xl font-bold text-[#1E3528] leading-tight">
                {isLoggedIn
                  ? `Halo, ${customer.name}`
                  : authMode === 'login'
                  ? 'Masuk ke Akun Anda'
                  : 'Daftar Akun Bloom & Co.'}
              </h1>
            </div>
          </div>

          {isLoggedIn && !isEditingProfile && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditForm({
                    name: customer.name || '',
                    phone: customer.phone || '',
                    email: customer.email || '',
                    address: customer.address || '',
                    password: '',
                  });
                  setShowPassword(false);
                  setAuthError('');
                  setSavedNotice('');
                  setIsEditingProfile(true);
                }}
                className="px-4 py-2.5 rounded-full bg-[#FAF8F5] hover:bg-[#EEF1EA] border border-[#EAE6DF] text-xs font-semibold text-[#1E3528] min-h-[44px] transition"
              >
                Ubah Profil
              </button>
              <button
                type="button"
                onClick={handleLogoutCustomer}
                className="px-4 py-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold inline-flex items-center gap-2 min-h-[44px] transition"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>

        {/* Pilihan Tab Masuk / Daftar ketika belum login */}
        {!isLoggedIn && (
          <div className="inline-flex p-1 rounded-full bg-[#FAF8F5] border border-[#EAE6DF] gap-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
                setShowPassword(false);
              }}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold min-h-[44px] transition ${
                authMode === 'login'
                  ? 'bg-[#1E3528] text-white shadow-sm'
                  : 'text-[#2F4538] hover:text-[#1E3528]'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
                setShowPassword(false);
              }}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold min-h-[44px] transition ${
                authMode === 'register'
                  ? 'bg-[#D45D79] text-white shadow-sm'
                  : 'text-[#2F4538] hover:text-[#1E3528]'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>
        )}

        {redirectTarget && !isLoggedIn && (
          <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#D45D79]/30 text-[#1E3528] text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#D45D79] shrink-0" />
            <span>
              {redirectTarget.startsWith('/pesanan')
                ? 'Silakan masuk atau daftar terlebih dahulu untuk mengakses halaman Pesanan Saya.'
                : 'Silakan masuk atau daftar terlebih dahulu untuk melanjutkan pemesanan.'}
            </span>
          </div>
        )}

        {authError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {savedNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* A. TAMPILAN PROFIL SAAT SUDAH LOGIN */}
        {isLoggedIn && !isEditingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] space-y-1">
                <h3 className="font-sans text-[10px] uppercase tracking-wider text-[#6B7F59] font-bold">
                  Nama Pemesan
                </h3>
                <p className="text-sm font-bold text-[#1E3528]">{customer.name}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] space-y-1">
                <h3 className="font-sans text-[10px] uppercase tracking-wider text-[#6B7F59] font-bold">
                  Nomor Telepon / WhatsApp
                </h3>
                <p className="text-sm font-bold text-[#1E3528]">{customer.phone}</p>
              </div>

              {customer.email && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] space-y-1">
                  <h3 className="font-sans text-[10px] uppercase tracking-wider text-[#6B7F59] font-bold">
                    Email
                  </h3>
                  <p className="text-sm text-[#1E3528]">{customer.email}</p>
                </div>
              )}

              {customer.address && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] space-y-1">
                  <h3 className="font-sans text-[10px] uppercase tracking-wider text-[#6B7F59] font-bold">
                    Alamat
                  </h3>
                  <p className="text-sm text-[#1E3528]">{customer.address}</p>
                </div>
              )}

              <div className="sm:col-span-2 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-sans text-[10px] uppercase tracking-wider text-[#6B7F59] font-bold flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-[#D45D79]" />
                    <span>Password Akun</span>
                  </h3>
                  <p className="text-base font-bold tracking-[0.25em] text-[#1E3528] select-none">
                    ••••••••••••
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({
                      name: customer.name || '',
                      phone: customer.phone || '',
                      email: customer.email || '',
                      address: customer.address || '',
                      password: '',
                    });
                    setShowPassword(false);
                    setAuthError('');
                    setSavedNotice('');
                    setIsEditingProfile(true);
                  }}
                  className="px-4 py-2 rounded-full bg-white hover:bg-[#EEF1EA] border border-[#EAE6DF] text-xs font-semibold text-[#1E3528] min-h-[40px] shrink-0 transition"
                >
                  Ubah Password
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/katalog"
                className="px-6 py-3 rounded-full bg-[#D45D79] hover:bg-[#B84763] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 min-h-[44px] transition"
              >
                <span>Mulai Memesan Bunga</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                to="/pesanan"
                className="px-6 py-3 rounded-full bg-[#EEF1EA] hover:bg-[#6B7F59] hover:text-white text-[#1E3528] text-xs sm:text-sm font-semibold inline-flex items-center min-h-[44px] transition"
              >
                Lihat Riwayat Pesanan Saya
              </Link>
            </div>
          </div>
        ) : isLoggedIn && isEditingProfile ? (
          /* B. FORM UBAH PROFIL AKUN YANG SUDAH LOGIN */
          <form onSubmit={handleEditProfileSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-name"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Nama Lengkap *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-phone"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Nomor Telepon (Terdaftar)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-phone"
                  type="tel"
                  disabled
                  value={editForm.phone}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 border border-[#EAE6DF] text-sm text-[#2F4538] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-email"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="edit-address"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Alamat (Opsional)
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-address"
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Kota / Alamat singkat"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="edit-password"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Password Baru (Opsional · Min. 6 karakter)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  value={editForm.password}
                  onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Kosongkan jika tidak ingin mengganti password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#2F4538] hover:bg-[#EEF1EA]"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={loadingAuth}
                className="px-6 py-3 rounded-full bg-[#D45D79] hover:bg-[#B84763] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 min-h-[44px] transition shadow-sm"
              >
                {loadingAuth ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{loadingAuth ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-5 py-2.5 rounded-full bg-gray-100 text-xs font-semibold text-[#1E3528] min-h-[44px]"
              >
                Batal
              </button>
            </div>
          </form>
        ) : authMode === 'login' ? (
          /* C. FORM MASUK (NAMA / NO TELEPON + PASSWORD) */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-[#1E3528] mb-2"
                >
                  Nama Lengkap atau Nomor Telepon *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    value={loginForm.identifier}
                    onChange={(e) =>
                      setLoginForm((p) => ({ ...p, identifier: e.target.value }))
                    }
                    placeholder="Contoh: Nadira Putri atau 0812..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#1E3528] mb-2"
                >
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="Masukkan password akun"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#2F4538] hover:bg-[#EEF1EA]"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                disabled={loadingAuth}
                className="px-6 py-3 rounded-full bg-[#D45D79] hover:bg-[#B84763] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 min-h-[44px] transition shadow-sm"
              >
                {loadingAuth ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 shrink-0" />
                )}
                <span>{loadingAuth ? 'Memeriksa Akun...' : 'Masuk ke Akun'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                  setShowPassword(false);
                }}
                className="text-xs font-semibold text-[#6B7F59] hover:text-[#1E3528] py-2"
              >
                Belum punya akun? <span className="underline text-[#D45D79]">Daftar di sini</span>
              </button>
            </div>
          </form>
        ) : (
          /* D. FORM PENDAFTARAN (NAMA, PASSWORD, NO, EMAIL, ALAMAT OPSIONAL) */
          <form onSubmit={handleRegisterSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Nama Lengkap *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Contoh: Nadira Putri"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Password (Min. 6 karakter) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#2F4538] hover:bg-[#EEF1EA]"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Nomor Telepon / WhatsApp *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="reg-address"
                className="block text-xs font-semibold text-[#1E3528] mb-2"
              >
                Alamat (Opsional)
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-[#6B7F59] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-address"
                  type="text"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Kota / Alamat singkat"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-sm focus:outline-none focus:border-[#D45D79] min-h-[44px]"
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                disabled={loadingAuth}
                className="px-6 py-3 rounded-full bg-[#D45D79] hover:bg-[#B84763] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 min-h-[44px] transition shadow-sm"
              >
                {loadingAuth ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 shrink-0" />
                )}
                <span>{loadingAuth ? 'Mendaftarkan Akun...' : 'Daftar & Masuk'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setShowPassword(false);
                }}
                className="text-xs font-semibold text-[#6B7F59] hover:text-[#1E3528] py-2"
              >
                Sudah punya akun? <span className="underline text-[#D45D79]">Masuk di sini</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. PROFIL & TENTANG TOKO (DARI GET /api/config) */}
      <div className="bg-gradient-to-br from-[#FDF2F4] via-white to-[#EEF1EA] rounded-2xl border border-[#EAE6DF] p-6 sm:p-8 shadow-editorial">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1E3528] text-[#FAF8F5] flex items-center justify-center shadow-sm shrink-0">
              <Flower2 className="w-7 h-7 text-[#D45D79]" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#D45D79] font-bold block mb-1">
                Botanical Florist PWA · v1.2
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3528] leading-tight">
                {config?.store_info?.name || 'Bloom & Co. Botanical Atelier'}
              </h2>
            </div>
          </div>

          {/* Indikator Status Online/Offline & Tombol Instal PWA (PWA-06) */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border min-h-[40px] ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span>{isOnline ? 'Terhubung (Online)' : 'Terputus (Offline)'}</span>
            </span>

            {canInstall && (
              <button
                type="button"
                onClick={triggerInstall}
                className="px-5 py-2.5 rounded-full bg-[#D45D79] hover:bg-[#B84763] text-white text-xs font-semibold inline-flex items-center gap-2 min-h-[44px] shadow-sm transition"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Instal Aplikasi</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#2F4538] leading-relaxed mt-4">
          Sistem Informasi Penjualan Produk Florist Berbasis Progressive Web App (PWA). Dirancang
          untuk memudahkan pemesanan rangkaian buket bunga segar dengan pemilihan jadwal ambil di
          toko dan kartu ucapan personal.
        </p>

        {config && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#EAE6DF] text-xs">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#D45D79] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-sans font-bold text-[#1E3528] mb-1">Alamat Atelier</h3>
                <p className="text-[#2F4538] leading-relaxed">{config.store_info?.address}</p>
                <p className="text-[#6B7F59] font-semibold mt-1 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Jam Operasional Ambil: Mulai {config.store_info?.open_time} WIB</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-[#6B7F59] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-sans font-bold text-[#1E3528] mb-1">Rekening Resmi Toko</h3>
                <p className="text-[#2F4538]">
                  {config.payment_info?.bank_name} —{' '}
                  <strong className="font-mono">{config.payment_info?.bank_account}</strong>
                </p>
                <p className="text-[#2F4538] mt-0.5">a.n. {config.payment_info?.bank_holder}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
