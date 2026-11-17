import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Flower2, ShoppingBag, User, LogOut, Package, ClipboardList } from 'lucide-react';
import { useCart } from '../hooks/useCart.js';
import { AdminSession, CustomerStorage } from '../services/api.js';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [customerInfo, setCustomerInfo] = useState(() => CustomerStorage.getCustomerInfo());

  useEffect(() => {
    const syncCustomer = () => setCustomerInfo(CustomerStorage.getCustomerInfo());
    window.addEventListener('bloom-customer-updated', syncCustomer);
    window.addEventListener('storage', syncCustomer);
    return () => {
      window.removeEventListener('bloom-customer-updated', syncCustomer);
      window.removeEventListener('storage', syncCustomer);
    };
  }, []);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoggedInAdmin = AdminSession.isLoggedIn();

  const handleAdminLogout = () => {
    AdminSession.clearKey();
    navigate('/admin');
  };

  // Header khusus untuk halaman Penjual (/admin/*)
  if (isAdminRoute) {
    return (
      <header className="sticky top-0 z-40 bg-[#1E3528] text-[#FAF8F5] border-b border-[#2F4538] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/admin/pesanan" className="flex items-center gap-3 group min-h-[44px]">
            <div className="w-10 h-10 rounded-full bg-[#D45D79]/20 border border-[#D45D79]/40 flex items-center justify-center">
              <Flower2 className="w-5 h-5 text-[#FDF2F4]" />
            </div>
            <div>
              <span className="font-serif text-lg font-semibold tracking-wide block leading-none">
                Bloom &amp; Co.
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#EEF1EA] block mt-1">
                Panel Penjual
              </span>
            </div>
          </Link>

          {isLoggedInAdmin && location.pathname !== '/admin' ? (
            <nav className="flex items-center gap-2">
              <NavLink
                to="/admin/pesanan"
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition flex items-center gap-2 min-h-[44px] ${
                    isActive
                      ? 'bg-[#D45D79] text-white shadow-sm'
                      : 'text-[#FAF8F5] hover:bg-[#2F4538]'
                  }`
                }
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>Pesanan</span>
              </NavLink>

              <NavLink
                to="/admin/produk"
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition flex items-center gap-2 min-h-[44px] ${
                    isActive
                      ? 'bg-[#D45D79] text-white shadow-sm'
                      : 'text-[#FAF8F5] hover:bg-[#2F4538]'
                  }`
                }
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>Produk</span>
              </NavLink>

              <button
                type="button"
                onClick={handleAdminLogout}
                className="px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#2F4538] hover:bg-red-800 text-[#FAF8F5] transition flex items-center gap-2 min-h-[44px]"
                title="Keluar dari Panel Admin"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </nav>
          ) : (
            <Link
              to="/"
              className="text-xs font-semibold px-4 py-2.5 rounded-full bg-[#2F4538] hover:bg-[#6B7F59] transition inline-flex items-center min-h-[44px]"
            >
              Ke Toko Pelanggan →
            </Link>
          )}
        </div>
      </header>
    );
  }

  // Header editorial untuk halaman Pelanggan
  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EAE6DF]">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 min-h-[44px]">
          <div className="w-10 h-10 rounded-full bg-[#FDF2F4] border border-[#D45D79]/30 flex items-center justify-center text-[#D45D79]">
            <Flower2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif text-xl font-bold text-[#1E3528] tracking-tight block leading-none">
              Bloom &amp; Co.
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#6B7F59] font-semibold block mt-1">
              Botanical Atelier
            </span>
          </div>
        </Link>

        {/* Navigasi tambahan untuk layar desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#2F4538]">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'text-[#D45D79] font-semibold' : 'hover:text-[#D45D79] transition'
            }
          >
            Beranda
          </NavLink>
          <NavLink
            to="/katalog"
            className={({ isActive }) =>
              isActive ? 'text-[#D45D79] font-semibold' : 'hover:text-[#D45D79] transition'
            }
          >
            Katalog
          </NavLink>
          <NavLink
            to="/pesanan"
            className={({ isActive }) =>
              isActive ? 'text-[#D45D79] font-semibold' : 'hover:text-[#D45D79] transition'
            }
          >
            Pesanan Saya
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/profil"
            className={`px-3.5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 min-h-[44px] transition ${
              customerInfo?.name && customerInfo?.phone
                ? 'bg-[#EEF1EA] text-[#1E3528] hover:bg-[#6B7F59] hover:text-white'
                : 'text-[#2F4538] hover:text-[#1E3528] hover:bg-[#EEF1EA]'
            }`}
            title={
              customerInfo?.name
                ? `Profil: ${customerInfo.name}`
                : 'Masuk / Buat Profil Pelanggan'
            }
            aria-label="Profil Pelanggan"
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="max-w-[90px] truncate hidden sm:inline">
              {customerInfo?.name ? customerInfo.name.split(' ')[0] : 'Masuk'}
            </span>
          </Link>

          <Link
            to="/keranjang"
            className="relative w-11 h-11 rounded-full bg-[#FDF2F4] text-[#D45D79] hover:bg-[#D45D79] hover:text-white transition flex items-center justify-center min-h-[44px]"
            aria-label="Keranjang Belanja"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[#1E3528] text-white text-[11px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
