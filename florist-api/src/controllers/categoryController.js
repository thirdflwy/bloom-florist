import { CategoryModel } from '../models/categoryModel.js';

export const CategoryController = {
  async getAll(req, res) {
    try {
      const categories = await CategoryModel.findAll();
      return res.status(200).json(categories);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal mengambil daftar kategori.' });
    }
  },

  async getById(req, res) {
    try {
      const category = await CategoryModel.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      }
      return res.status(200).json(category);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal mengambil detail kategori.' });
    }
  },

  async create(req, res) {
    try {
      const { name } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      }
      const created = await CategoryModel.create({ name });
      return res.status(201).json(created);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal membuat kategori.' });
    }
  },

  async update(req, res) {
    try {
      const { name } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      }
      const updated = await CategoryModel.update(req.params.id, { name });
      if (!updated) {
        return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      }
      return res.status(200).json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal memperbarui kategori.' });
    }
  },

  async remove(req, res) {
    try {
      const deleted = await CategoryModel.remove(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      }
      return res.status(200).json({ message: 'Kategori berhasil dihapus.', data: deleted });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal menghapus kategori.' });
    }
  },
};
