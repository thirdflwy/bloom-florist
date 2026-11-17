import crypto from 'crypto';
import { supabase } from '../config/supabaseClient.js';

/**
 * Normalisasi nomor telepon pelanggan (menyamakan format 08xx / +628xx / 628xx menjadi 08xx)
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let cleaned = phone.replace(/[^\d+]/g, '').trim();
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('62') && cleaned.length > 9) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned.replace(/\D/g, '');
}

/**
 * Hash password menggunakan scrypt + random salt 16 byte
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verifikasi password secara timing-safe
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

/**
 * Menghapus field password_hash sebelum dikirim ke client
 */
export function sanitizeCustomer(customer) {
  if (!customer) return null;
  const { password_hash, ...safe } = customer;
  return safe;
}

export const CustomerModel = {
  async findAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, address')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, address')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findByPhone(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', normalized)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findByNameOrPhone(identifier) {
    const raw = String(identifier || '').trim();
    if (!raw) return null;

    const normalized = normalizePhone(raw);
    if (normalized.length >= 9) {
      const byPhone = await this.findByPhone(normalized);
      if (byPhone) return byPhone;
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .ilike('name', raw)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(payload) {
    const normalized = normalizePhone(payload.phone);
    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          name: payload.name.trim(),
          email: payload.email ? payload.email.trim() : null,
          phone: normalized,
          address: payload.address ? payload.address.trim() : null,
          password_hash: payload.password_hash || null,
        },
      ])
      .select('id, name, email, phone, address')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Pendaftaran akun pelanggan baru dengan password.
   * Menolak pendaftaran jika nomor telepon, nama, atau email sudah digunakan oleh akun lain.
   */
  async register({ name, password, phone, email, address }) {
    const normalized = normalizePhone(phone);
    const trimmedName = name.trim();
    const trimmedEmail = email ? email.trim() : null;

    const existingByPhone = await this.findByPhone(normalized);
    if (existingByPhone && existingByPhone.password_hash) {
      const err = new Error(
        'Nomor telepon sudah digunakan oleh akun lain. Silakan masuk menggunakan akun Anda.'
      );
      err.status = 409;
      throw err;
    }

    // Cek duplikasi nama (case-insensitive)
    const { data: existingByName, error: nameErr } = await supabase
      .from('customers')
      .select('id, password_hash')
      .ilike('name', trimmedName)
      .limit(1)
      .maybeSingle();

    if (nameErr) throw nameErr;
    if (existingByName && existingByName.id !== existingByPhone?.id) {
      const err = new Error(
        'Nama pengguna sudah digunakan oleh akun lain. Gunakan nama lain atau silakan masuk.'
      );
      err.status = 409;
      throw err;
    }

    // Cek duplikasi email (case-insensitive)
    if (trimmedEmail) {
      const { data: existingByEmail, error: emailErr } = await supabase
        .from('customers')
        .select('id, password_hash')
        .ilike('email', trimmedEmail)
        .limit(1)
        .maybeSingle();

      if (emailErr) throw emailErr;
      if (existingByEmail && existingByEmail.id !== existingByPhone?.id) {
        const err = new Error(
          'Email sudah digunakan oleh akun lain. Gunakan email lain atau silakan masuk.'
        );
        err.status = 409;
        throw err;
      }
    }

    const passwordHash = hashPassword(password);

    if (existingByPhone) {
      // Akun pernah dibuat saat checkout tanpa password: lengkapi dengan password baru
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: trimmedName,
          email: trimmedEmail || existingByPhone.email,
          address: address ? address.trim() : existingByPhone.address,
          password_hash: passwordHash,
        })
        .eq('id', existingByPhone.id)
        .select('id, name, email, phone, address')
        .single();

      if (error) throw error;
      return { ...data, has_password: true };
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          name: trimmedName,
          email: trimmedEmail,
          phone: normalized,
          address: address ? address.trim() : null,
          password_hash: passwordHash,
        },
      ])
      .select('id, name, email, phone, address')
      .single();

    if (error) throw error;
    return { ...data, has_password: true };
  },

  /**
   * Login pelanggan dengan nama/nomor telepon dan password
   */
  async login({ identifier, password }) {
    const customer = await this.findByNameOrPhone(identifier);
    if (!customer) {
      const err = new Error(
        'Akun tidak ditemukan. Periksa kembali nama atau nomor telepon Anda, atau silakan daftar.'
      );
      err.status = 401;
      throw err;
    }

    if (!customer.password_hash) {
      const err = new Error(
        'Akun ini belum memiliki password. Silakan daftar menggunakan nomor telepon ini untuk membuat password.'
      );
      err.status = 401;
      throw err;
    }

    const valid = verifyPassword(password, customer.password_hash);
    if (!valid) {
      const err = new Error('Password salah. Silakan periksa kembali password Anda.');
      err.status = 401;
      throw err;
    }

    return {
      ...sanitizeCustomer(customer),
      has_password: true,
    };
  },

  /**
   * Perbarui profil pelanggan yang sudah login (termasuk ubah password opsional)
   */
  async updateProfileByPhone({ phone, name, email, address, password }) {
    const normalized = normalizePhone(phone);
    const existing = await this.findByPhone(normalized);
    if (!existing) return null;

    const updates = {};
    if (name && String(name).trim()) updates.name = String(name).trim();
    if (email !== undefined) updates.email = email ? String(email).trim() : null;
    if (address !== undefined) updates.address = address ? String(address).trim() : null;
    if (password && String(password).length >= 6) {
      updates.password_hash = hashPassword(String(password));
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', existing.id)
      .select('id, name, email, phone, address')
      .single();

    if (error) throw error;
    return {
      ...data,
      has_password: Boolean(updates.password_hash || existing.password_hash),
    };
  },

  async update(id, payload) {
    const updates = {};
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.email !== undefined) updates.email = payload.email ? payload.email.trim() : null;
    if (payload.phone !== undefined) updates.phone = normalizePhone(payload.phone);
    if (payload.address !== undefined) updates.address = payload.address ? payload.address.trim() : null;

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, phone, address')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { data, error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .select('id, name, email, phone, address')
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
