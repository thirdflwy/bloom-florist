import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { useCart } from '../hooks/useCart.js';

/**
 * Bottom Navigation Bar 5 Tab (Beranda, Katalog, Keranjang, Pesanan, Profil).
 * Hanya tampil pada halaman utama pelanggan sesuai tabel 4.1 PRD v1.2:
 * /, /katalog, /keranjang, /pesanan, /profil
 * (Tidak tampil di /admin/*, /produk/:id, /checkout, /pesanan/:id)
 */
const VISIBLE_PATHS = new Set(['/', '/katalog', '/keranjang', '/pesanan', '/profil']);

export default function BottomNav() {
  const location = useLocation();
  const { totalItems } = useCart();

  if (!VISIBLE_PATHS.has(location.pathname)) {
    return null;
  }

  const tabs = [
    { to: '/', label: 'Beranda', icon: Home, end: true },
    { to: '/katalog', label: 'Katalog', icon: Grid },
    { to: '/keranjang', label: 'Keranjang', icon: ShoppingBag, badge: totalItems },
    { to: '/pesanan', label: 'Pesanan', icon: ClipboardList },
    { to: '/profil', label: 'Profil', icon: User },
  ];

  return (
    <nav
      aria-label="Navigasi Utama Bawah"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE6DF] shadow-[0_-4px_20px_rgba(30,53,40,0.06)]"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 px-1">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                  isActive
                    ? 'text-[#D45D79] font-semibold'
                    : 'text-[#2F4538]/70 hover:text-[#1E3528]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 w-8 h-0.5 rounded-full bg-[#D45D79]" />
                  )}
                  <div className="relative">
                    <IconComponent className="w-5 h-5" strokeWidth={isActive ? 2.3 : 1.9} />
                    {tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D45D79] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] leading-none">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
