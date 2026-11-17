import { supabase } from '../config/supabaseClient.js';
import { normalizePhone } from './customerModel.js';

const PROOF_BUCKET = 'payment-proofs';

export const OrderModel = {
  /**
   * Membuat pesanan baru secara atomik melalui RPC `create_order`
   */
  async createViaRpc({
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    pickup_date,
    pickup_time,
    card_message,
    items,
  }) {
    const normalizedPhone = normalizePhone(customer_phone);

    const { data, error } = await supabase.rpc('create_order', {
      p_customer_name: customer_name,
      p_customer_phone: normalizedPhone,
      p_customer_email: customer_email || null,
      p_customer_address: customer_address || null,
      p_pickup_date: pickup_date,
      p_pickup_time: pickup_time,
      p_card_message: card_message || null,
      p_items: items,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Mengambil detail pesanan lengkap beserta customer, item produk, dan signed URL bukti bayar
   */
  async findById(id) {
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        customers (id, name, phone, email, address),
        order_items (
          id,
          product_id,
          quantity,
          price,
          products (id, name, sku, image_url, category_id)
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return await this.attachSignedProofUrl(data);
  },

  /**
   * Mengambil daftar pesanan berdasarkan nomor telepon atau daftar ID pesanan
   */
  async findForCustomer({ phone, ids }) {
    let customerId = null;

    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (customer) {
        customerId = customer.id;
      } else if (!ids || ids.length === 0) {
        return [];
      }
    }

    let query = supabase
      .from('orders')
      .select(
        `
        *,
        customers (id, name, phone, email, address),
        order_items (
          id,
          product_id,
          quantity,
          price,
          products (id, name, sku, image_url)
        )
      `
      )
      .order('created_at', { ascending: false });

    if (customerId && ids && ids.length > 0) {
      query = query.or(`customer_id.eq.${customerId},id.in.(${ids.join(',')})`);
    } else if (customerId) {
      query = query.eq('customer_id', customerId);
    } else if (ids && ids.length > 0) {
      query = query.in('id', ids);
    } else {
      return [];
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Mengambil semua pesanan untuk halaman Admin dengan filter payment_status opsional
   */
  async findAllForAdmin({ paymentStatus, status } = {}) {
    let query = supabase
      .from('orders')
      .select(
        `
        *,
        customers (id, name, phone, email, address),
        order_items (
          id,
          product_id,
          quantity,
          price,
          products (id, name, sku, image_url)
        )
      `
      )
      .order('created_at', { ascending: false });

    if (paymentStatus && paymentStatus !== 'semua') {
      query = query.eq('payment_status', paymentStatus);
    }

    if (status && status !== 'semua') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Melampirkan signed URL berumur pendek (15 menit / 900 detik) untuk bukti transfer privat
   */
  async attachSignedProofUrl(order) {
    if (!order || !order.payment_proof_path) {
      return { ...order, payment_proof_url: null };
    }

    const { data, error } = await supabase.storage
      .from(PROOF_BUCKET)
      .createSignedUrl(order.payment_proof_path, 900);

    return {
      ...order,
      payment_proof_url: error || !data ? null : data.signedUrl,
    };
  },

  /**
   * Unggah bukti pembayaran ke bucket privat `payment-proofs`
   */
  async uploadPaymentProof(orderId, fileBuffer, ext, mimeType, oldPath = null) {
    const filePath = `order-${orderId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    if (oldPath && oldPath !== filePath) {
      await supabase.storage.from(PROOF_BUCKET).remove([oldPath]);
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_proof_path: filePath,
        payment_status: 'menunggu_verifikasi',
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return await this.attachSignedProofUrl(data);
  },

  /**
   * Membatalkan pesanan secara atomik via RPC `cancel_order`
   */
  async cancelViaRpc(orderId) {
    const { data, error } = await supabase.rpc('cancel_order', {
      p_order_id: orderId,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Verifikasi pembayaran (setuju / tolak) secara atomik via RPC `review_payment`
   */
  async reviewPaymentViaRpc(orderId, action, note = null) {
    const { data, error } = await supabase.rpc('review_payment', {
      p_order_id: orderId,
      p_action: action,
      p_note: note,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Mengubah status pesanan mengikuti alur maju
   */
  async updateStatus(orderId, nextStatus) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Ringkasan penjualan untuk halaman Profil (FR-12):
   * Total pesanan selesai, total omzet, dan 3 produk terlaris
   */
  async getSummary() {
    const { data: completedOrders, error: ordersErr } = await supabase
      .from('orders')
      .select('id, total, status, payment_status')
      .eq('status', 'selesai');

    if (ordersErr) throw ordersErr;

    const totalCompletedOrders = (completedOrders || []).length;
    const totalRevenue = (completedOrders || []).reduce(
      (sum, o) => sum + Number(o.total || 0),
      0
    );

    // Hitung 3 produk terlaris dari pesanan yang tidak dibatalkan
    const { data: validOrders, error: validErr } = await supabase
      .from('orders')
      .select('id')
      .neq('status', 'dibatalkan');

    if (validErr) throw validErr;

    const validOrderIds = (validOrders || []).map((o) => o.id);
    let topProducts = [];

    if (validOrderIds.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('product_id, quantity, products(id, name, image_url, price)')
        .in('order_id', validOrderIds);

      if (itemsErr) throw itemsErr;

      const productMap = new Map();
      for (const item of items || []) {
        if (!item.product_id || !item.products) continue;
        const existing = productMap.get(item.product_id) || {
          id: item.products.id,
          name: item.products.name,
          image_url: item.products.image_url,
          price: Number(item.products.price || 0),
          total_sold: 0,
        };
        existing.total_sold += Number(item.quantity || 0);
        productMap.set(item.product_id, existing);
      }

      topProducts = Array.from(productMap.values())
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 3);
    }

    return {
      total_completed_orders: totalCompletedOrders,
      total_revenue: totalRevenue,
      top_products: topProducts,
    };
  },
};
