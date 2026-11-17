import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import BottomNav from './components/BottomNav.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';

// Halaman Pelanggan (8 Halaman)
import Home from './pages/customer/Home.jsx';
import Catalog from './pages/customer/Catalog.jsx';
import ProductDetail from './pages/customer/ProductDetail.jsx';
import Cart from './pages/customer/Cart.jsx';
import Checkout from './pages/customer/Checkout.jsx';
import Orders from './pages/customer/Orders.jsx';
import OrderDetail from './pages/customer/OrderDetail.jsx';
import Profile from './pages/customer/Profile.jsx';

// Halaman Penjual / Admin (4 Halaman)
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminOrderDetail from './pages/admin/AdminOrderDetail.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1E3528]">
      <OfflineBanner />
      <Navbar />

      <main className="flex-1">
        <Routes>
          {/* Sisi Pelanggan */}
          <Route path="/" element={<Home />} />
          <Route path="/katalog" element={<Catalog />} />
          <Route path="/produk/:id" element={<ProductDetail />} />
          <Route path="/keranjang" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pesanan" element={<Orders />} />
          <Route path="/pesanan/:id" element={<OrderDetail />} />
          <Route path="/profil" element={<Profile />} />

          {/* Sisi Penjual (Admin) */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/pesanan" element={<AdminOrders />} />
          <Route path="/admin/pesanan/:id" element={<AdminOrderDetail />} />
          <Route path="/admin/produk" element={<AdminProducts />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}
