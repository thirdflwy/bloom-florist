import { CustomerModel, normalizePhone } from '../models/customerModel.js';

export const CustomerController = {
  /**
   * POST /api/customers/register (Publik)
   * Pendaftaran akun pelanggan: nama, password, nomor telepon, email, alamat (opsional)
   */
  async register(req, res) {
    try {
      const { name, password, phone, email, address } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
      }

      if (!password || String(password).length < 6) {
        return res.status(400).json({
          error: 'Password wajib diisi minimal 6 karakter.',
        });
      }

      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone || normalizedPhone.length < 9) {
        return res.status(400).json({
          error: 'Nomor telepon wajib diisi dengan format yang valid (minimal 9 digit).',
        });
      }

      if (!email || !String(email).trim() || !String(email).includes('@')) {
        return res.status(400).json({
          error: 'Alamat email wajib diisi dengan format yang valid.',
        });
      }

      const customer = await CustomerModel.register({
        name: String(name).trim(),
        password: String(password),
        phone: normalizedPhone,
        email: String(email).trim(),
        address: address ? String(address).trim() : null,
      });

      return res.status(201).json(customer);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        error: err.message || 'Gagal mendaftarkan akun pelanggan.',
      });
    }
  },

  /**
   * POST /api/customers/login (Publik)
   * Masuk akun pelanggan menggunakan nama/nomor telepon dan password
   */
  async login(req, res) {
    try {
      const { identifier, phone, name, password } = req.body;
      const loginKey = identifier || phone || name;

      if (!loginKey || !String(loginKey).trim()) {
        return res.status(400).json({
          error: 'Masukkan nama lengkap atau nomor telepon Anda.',
        });
      }

      if (!password || !String(password)) {
        return res.status(400).json({
          error: 'Password wajib diisi.',
        });
      }

      const customer = await CustomerModel.login({
        identifier: String(loginKey).trim(),
        password: String(password),
      });

      return res.status(200).json(customer);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        error: err.message || 'Gagal masuk ke akun pelanggan.',
      });
    }
  },

  /**
   * PUT /api/customers/profile (Publik - untuk pembaruan profil pelanggan yang sudah login)
   */
  async updateProfile(req, res) {
    try {
      const { phone, name, email, address, password } = req.body;
      const normalizedPhone = normalizePhone(phone);

      if (!normalizedPhone) {
        return res.status(400).json({ error: 'Nomor telepon akun tidak valid.' });
      }
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Nama lengkap tidak boleh kosong.' });
      }
      if (password && String(password).length < 6) {
        return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      }

      const updated = await CustomerModel.updateProfileByPhone({
        phone: normalizedPhone,
        name: String(name).trim(),
        email,
        address,
        password: password ? String(password) : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Akun pelanggan tidak ditemukan.' });
      }

      return res.status(200).json(updated);
    } catch (err) {
      return res.status(500).json({
        error: err.message || 'Gagal memperbarui profil pelanggan.',
      });
    }
  },

  async getAll(req, res) {
    try {
      const customers = await CustomerModel.findAll();
      return res.status(200).json(customers);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal mengambil daftar pelanggan.' });
    }
  },

  async getById(req, res) {
    try {
      const customer = await CustomerModel.findById(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Pelanggan tidak ditemukan.' });
      }
      return res.status(200).json(customer);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal mengambil data pelanggan.' });
    }
  },

  async create(req, res) {
    try {
      const { name, email, phone, address } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Nama pelanggan wajib diisi.' });
      }
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'Nomor telepon wajib diisi dan valid.' });
      }
      const created = await CustomerModel.create({ name, email, phone: normalizedPhone, address });
      return res.status(201).json(created);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal menambahkan pelanggan.' });
    }
  },

  async update(req, res) {
    try {
      const updated = await CustomerModel.update(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Pelanggan tidak ditemukan.' });
      }
      return res.status(200).json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal memperbarui pelanggan.' });
    }
  },

  async remove(req, res) {
    try {
      const deleted = await CustomerModel.remove(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Pelanggan tidak ditemukan.' });
      }
      return res.status(200).json({ message: 'Pelanggan berhasil dihapus.', data: deleted });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal menghapus pelanggan.' });
    }
  },
};
