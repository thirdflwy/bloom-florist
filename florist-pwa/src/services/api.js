import axios from 'axios';

const ADMIN_KEY_STORAGE = 'bloom_admin_key';
const SAVED_ORDERS_STORAGE = 'bloom_saved_order_ids';
const SAVED_CUSTOMER_STORAGE = 'bloom_saved_customer';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

// Interceptor: otomatis menyisipkan header x-admin-key dari sessionStorage bila tersedia
api.interceptors.request.use((config) => {
  const adminKey = sessionStorage.getItem(ADMIN_KEY_STORAGE);
  if (adminKey) {
    config.headers['x-admin-key'] = adminKey;
  }
  return config;
});

/**
 * Menerjemahkan error Axios menjadi pesan bahasa Indonesia yang jelas.
 * Membedakan server tidak terjangkau, timeout, dan error dari API.
 */
export function getApiErrorMessage(err, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.code === 'ECONNABORTED') {
    return 'Server terlalu lama merespons. Periksa koneksi Anda lalu coba lagi.';
  }
  if (err?.request && !err?.response) {
    return `Tidak dapat terhubung ke server API (${baseURL}). Pastikan backend florist-api sedang berjalan (npm run dev) dan koneksi internet aktif.`;
  }
  if (err?.response?.status >= 500) {
    return 'Server sedang mengalami gangguan. Silakan coba beberapa saat lagi.';
  }
  return fallback;
}

// Helper penyimpanan Admin Key di sessionStorage (FR-20)
export const AdminSession = {
  getKey() {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) || '';
  },
  setKey(key) {
    sessionStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
  },
  clearKey() {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  },
  isLoggedIn() {
    return Boolean(sessionStorage.getItem(ADMIN_KEY_STORAGE));
  },
};

// Helper penyimpanan riwayat pesanan & nomor telepon pelanggan di localStorage (FR-08)
export const CustomerStorage = {
  getOrderIds() {
    try {
      const raw = localStorage.getItem(SAVED_ORDERS_STORAGE);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  addOrderId(orderId) {
    if (!orderId) return;
    const current = this.getOrderIds();
    if (!current.includes(orderId)) {
      const next = [orderId, ...current].slice(0, 50);
      localStorage.setItem(SAVED_ORDERS_STORAGE, JSON.stringify(next));
    }
  },

  getCustomerInfo() {
    try {
      const raw = localStorage.getItem(SAVED_CUSTOMER_STORAGE);
      if (!raw) {
        return { id: null, name: '', phone: '', email: '', address: '', has_password: false };
      }
      const parsed = JSON.parse(raw);
      const hasLettersInPhone = parsed.phone && /[a-zA-Z]/.test(String(parsed.phone));
      return {
        id: parsed.id || null,
        name: parsed.name || '',
        phone: hasLettersInPhone ? '' : parsed.phone || '',
        email: parsed.email || '',
        address: parsed.address || '',
        has_password: Boolean(parsed.has_password),
      };
    } catch {
      return { id: null, name: '', phone: '', email: '', address: '', has_password: false };
    }
  },

  isLoggedIn() {
    const info = this.getCustomerInfo();
    return Boolean(info?.phone && info?.name);
  },

  saveCustomerInfo({ id, name, phone, email, address, has_password }) {
    const existing = this.getCustomerInfo();
    const isPhoneValid =
      phone !== undefined &&
      !/[a-zA-Z]/.test(String(phone)) &&
      String(phone).replace(/\D/g, '').length >= 9;

    const updated = {
      id: id !== undefined ? id : existing.id,
      name: name !== undefined ? name : existing.name,
      phone: isPhoneValid ? String(phone).trim() : existing.phone,
      email: email !== undefined ? email : existing.email,
      address: address !== undefined ? address : existing.address,
      has_password: has_password !== undefined ? has_password : existing.has_password,
    };
    localStorage.setItem(SAVED_CUSTOMER_STORAGE, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('bloom-customer-updated'));
    return updated;
  },

  clearCustomerInfo() {
    localStorage.removeItem(SAVED_CUSTOMER_STORAGE);
    localStorage.removeItem(SAVED_ORDERS_STORAGE);
    window.dispatchEvent(new CustomEvent('bloom-customer-updated'));
  },
};

export default api;
