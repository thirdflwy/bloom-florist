import { supabase } from '../config/supabaseClient.js';

const PRODUCT_BUCKET = 'product-images';

export const ProductModel = {
  /**
   * Mengambil daftar produk.
   * Jika includeUnavailable = false, hanya mengembalikan produk dengan is_available = true.
   */
  async findAll({ categoryId, q, includeUnavailable = false } = {}) {
    let query = supabase
      .from('products')
      .select('*, categories(id, name)')
      .order('created_at', { ascending: false });

    if (!includeUnavailable) {
      query = query.eq('is_available', true);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (q && q.trim()) {
      query = query.ilike('name', `%${q.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Mengambil satu produk berdasarkan ID.
   */
  async findById(id, { includeUnavailable = false } = {}) {
    let query = supabase
      .from('products')
      .select('*, categories(id, name)')
      .eq('id', id);

    if (!includeUnavailable) {
      query = query.eq('is_available', true);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('products')
      .insert([payload])
      .select('*, categories(id, name)')
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select('*, categories(id, name)')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Soft delete: menonaktifkan produk (is_available = false) tanpa menghapus file foto
   */
  async softDelete(id) {
    const { data, error } = await supabase
      .from('products')
      .update({ is_available: false })
      .eq('id', id)
      .select('*, categories(id, name)')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Unggah gambar produk ke bucket publik `product-images`
   */
  async uploadImage(fileBuffer, ext, mimeType) {
    const fileName = `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(PRODUCT_BUCKET)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  },

  /**
   * Hapus file foto lama dari bucket `product-images` jika foto produk diganti
   */
  async deleteOldImageIfManaged(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') return;
    const marker = `/storage/v1/object/public/${PRODUCT_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return;

    const objectPath = decodeURIComponent(imageUrl.slice(idx + marker.length));
    if (!objectPath) return;

    await supabase.storage.from(PRODUCT_BUCKET).remove([objectPath]);
  },
};
