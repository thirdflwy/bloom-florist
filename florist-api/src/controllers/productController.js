import { ProductModel } from '../models/productModel.js';
import { CategoryModel } from '../models/categoryModel.js';

export const ProductController = {
  /**
   * GET /api/products (Publik)
   * Hanya mengembalikan produk aktif (is_available = true)
   */
  async getPublicProducts(req, res) {
    try {
      const { category_id, q } = req.query;
      const products = await ProductModel.findAll({
        categoryId: category_id,
        q,
        includeUnavailable: false,
      });
      return res.status(200).json(products);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal memuat daftar produk.' });
    }
  },

  /**
   * GET /api/products/:id (Publik)
   * Hanya mengembalikan produk dengan is_available = true (404 jika nonaktif)
   */
  async getPublicProductById(req, res) {
    try {
      const product = await ProductModel.findById(req.params.id, {
        includeUnavailable: false,
      });
      if (!product) {
        return res.status(404).json({ error: 'Produk tidak ditemukan atau sedang tidak aktif.' });
      }
      return res.status(200).json(product);
    } catch (err) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }
  },

  /**
   * GET /api/admin/products (Admin)
   * Mengembalikan seluruh produk termasuk yang nonaktif
   */
  async getAdminProducts(req, res) {
    try {
      const products = await ProductModel.findAll({
        includeUnavailable: true,
      });
      return res.status(200).json(products);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal memuat daftar produk admin.' });
    }
  },

  /**
   * POST /api/products (Admin, multipart/form-data)
   * Field: name, category_id, price, stock, description, sku (opsional), image (opsional/file)
   */
  async createProduct(req, res) {
    try {
      const { name, category_id, price, stock, description, sku, image_url } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Nama produk wajib diisi.' });
      }

      if (!category_id) {
        return res.status(400).json({ error: 'Kategori produk wajib dipilih.' });
      }

      const category = await CategoryModel.findById(category_id);
      if (!category) {
        return res.status(400).json({ error: 'Kategori produk tidak valid.' });
      }

      const parsedPrice = Number(price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: 'Harga produk harus berupa angka >= 0.' });
      }

      const parsedStock = Number(stock ?? 0);
      if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ error: 'Stok produk harus berupa bilangan bulat >= 0.' });
      }

      let finalImageUrl = image_url ? String(image_url).trim() : null;
      if (req.file) {
        finalImageUrl = await ProductModel.uploadImage(
          req.file.buffer,
          req.file.detectedExt,
          req.file.detectedMime
        );
      }

      const autoSku =
        sku && String(sku).trim()
          ? String(sku).trim()
          : `BLM-${Date.now().toString(36).toUpperCase()}`;

      const created = await ProductModel.create({
        sku: autoSku,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        category_id,
        price: parsedPrice,
        stock: parsedStock,
        image_url: finalImageUrl,
        is_available: true,
      });

      return res.status(201).json(created);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal menambahkan produk.' });
    }
  },

  /**
   * PUT /api/products/:id (Admin, multipart/form-data)
   * Mengubah produk, mengganti foto (hapus foto lama), atau mengaktifkan kembali (is_available)
   */
  async updateProduct(req, res) {
    try {
      const existing = await ProductModel.findById(req.params.id, {
        includeUnavailable: true,
      });

      if (!existing) {
        return res.status(404).json({ error: 'Produk tidak ditemukan.' });
      }

      const updates = {};
      const { name, category_id, price, stock, description, sku, is_available } = req.body;

      if (name !== undefined) {
        if (!String(name).trim()) {
          return res.status(400).json({ error: 'Nama produk tidak boleh kosong.' });
        }
        updates.name = String(name).trim();
      }

      if (category_id !== undefined) {
        const category = await CategoryModel.findById(category_id);
        if (!category) {
          return res.status(400).json({ error: 'Kategori produk tidak valid.' });
        }
        updates.category_id = category_id;
      }

      if (price !== undefined) {
        const parsedPrice = Number(price);
        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({ error: 'Harga produk harus berupa angka >= 0.' });
        }
        updates.price = parsedPrice;
      }

      if (stock !== undefined) {
        const parsedStock = Number(stock);
        if (!Number.isInteger(parsedStock) || parsedStock < 0) {
          return res.status(400).json({ error: 'Stok produk harus berupa bilangan bulat >= 0.' });
        }
        updates.stock = parsedStock;
      }

      if (description !== undefined) {
        updates.description = description ? String(description).trim() : null;
      }

      if (sku !== undefined && String(sku).trim()) {
        updates.sku = String(sku).trim();
      }

      if (is_available !== undefined) {
        if (typeof is_available === 'boolean') {
          updates.is_available = is_available;
        } else if (typeof is_available === 'string') {
          updates.is_available = is_available.toLowerCase() === 'true';
        }
      }

      if (req.file) {
        const newImageUrl = await ProductModel.uploadImage(
          req.file.buffer,
          req.file.detectedExt,
          req.file.detectedMime
        );
        updates.image_url = newImageUrl;

        // Hapus file foto lama di bucket jika ada
        if (existing.image_url) {
          await ProductModel.deleteOldImageIfManaged(existing.image_url);
        }
      }

      const updated = await ProductModel.update(req.params.id, updates);
      return res.status(200).json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal memperbarui produk.' });
    }
  },

  /**
   * DELETE /api/products/:id (Admin)
   * Soft delete: menonaktifkan produk (is_available = false) tanpa menghapus gambar
   */
  async softDeleteProduct(req, res) {
    try {
      const existing = await ProductModel.findById(req.params.id, {
        includeUnavailable: true,
      });

      if (!existing) {
        return res.status(404).json({ error: 'Produk tidak ditemukan.' });
      }

      const deactivated = await ProductModel.softDelete(req.params.id);
      return res.status(200).json({
        message: 'Produk berhasil dinonaktifkan (soft delete).',
        data: deactivated,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal menonaktifkan produk.' });
    }
  },
};
