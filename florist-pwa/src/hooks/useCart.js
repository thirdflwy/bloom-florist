import { useState, useEffect, useCallback } from 'react';

const CART_STORAGE_KEY = 'bloom_florist_cart';
const CART_EVENT = 'bloom-cart-updated';

function readCartFromStorage() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCartToStorage(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

/**
 * Custom hook manajemen keranjang belanja di localStorage (FR-04).
 * Menyinkronkan perubahan antar komponen (seperti badge pada BottomNav & Navbar).
 */
export function useCart() {
  const [items, setItems] = useState(() => readCartFromStorage());

  useEffect(() => {
    const syncCart = () => {
      setItems(readCartFromStorage());
    };

    window.addEventListener(CART_EVENT, syncCart);
    window.addEventListener('storage', syncCart);
    return () => {
      window.removeEventListener(CART_EVENT, syncCart);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    if (!product || !product.id) return;
    const current = readCartFromStorage();
    const maxStock = Number(product.stock ?? 0);
    if (maxStock <= 0) return;

    const existingIndex = current.findIndex((item) => item.id === product.id);
    let nextItems;

    if (existingIndex > -1) {
      const existing = current[existingIndex];
      const newQty = Math.min(existing.quantity + Number(quantity), maxStock);
      nextItems = current.map((item, idx) =>
        idx === existingIndex
          ? {
              ...item,
              name: product.name,
              price: Number(product.price),
              image_url: product.image_url,
              stock: maxStock,
              category_name: product.categories?.name || item.category_name,
              quantity: newQty,
            }
          : item
      );
    } else {
      const initialQty = Math.min(Math.max(1, Number(quantity)), maxStock);
      nextItems = [
        ...current,
        {
          id: product.id,
          product_id: product.id,
          name: product.name,
          price: Number(product.price),
          image_url: product.image_url,
          stock: maxStock,
          category_name: product.categories?.name || 'Buket Pilihan',
          quantity: initialQty,
        },
      ];
    }

    writeCartToStorage(nextItems);
    setItems(nextItems);
  }, []);

  const updateQuantity = useCallback((productId, newQuantity) => {
    const current = readCartFromStorage();
    const qty = Number(newQuantity);

    if (qty <= 0) {
      const filtered = current.filter((item) => item.id !== productId);
      writeCartToStorage(filtered);
      setItems(filtered);
      return;
    }

    const nextItems = current.map((item) => {
      if (item.id !== productId) return item;
      const maxStock = Number(item.stock ?? 99);
      return {
        ...item,
        quantity: Math.min(qty, maxStock),
      };
    });

    writeCartToStorage(nextItems);
    setItems(nextItems);
  }, []);

  const removeFromCart = useCallback((productId) => {
    const current = readCartFromStorage();
    const nextItems = current.filter((item) => item.id !== productId);
    writeCartToStorage(nextItems);
    setItems(nextItems);
  }, []);

  const clearCart = useCallback(() => {
    writeCartToStorage([]);
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  return {
    items,
    totalItems,
    totalPrice,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}
