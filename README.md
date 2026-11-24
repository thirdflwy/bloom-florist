# Bloom & Co. — Botanical Florist PWA

Sistem Informasi Penjualan Produk Florist berbasis **Progressive Web App (PWA)** untuk toko bunga **Bloom & Co.** Aplikasi ini memungkinkan pelanggan menjelajahi katalog buket bunga, mendaftar/masuk akun, memesan rangkaian bunga dengan jadwal pengambilan di toko (*self-pickup*) dan kartu ucapan personal, mengunggah bukti transfer manual, serta memantau status pesanan. Penjual dapat mengelola katalog produk dan memverifikasi pembayaran melalui panel admin.

---

## Arsitektur & Teknologi

Proyek ini terdiri dari tiga bagian utama dalam satu monorepo:

```text
bloom-florist/
├── supabase/
│   └── schema.sql          # Skema tabel, Storage buckets, RPC atomik, & seed data
├── florist-api/            # Backend REST API (Express 5, ES Modules, Supabase JS)
└── florist-pwa/            # Frontend PWA (React 18, Vite 6, Tailwind CSS, vite-plugin-pwa)
```

| Komponen | Teknologi |
| :--- | :--- |
| **Frontend PWA** | React 18, React Router v7, Axios, Tailwind CSS, Lucide Icons, `vite-plugin-pwa` (Workbox) |
| **Backend API** | Node.js, Express 5 (ES Modules), `@supabase/supabase-js`, `multer`, `express-rate-limit`, `cors` |
| **Database & Storage** | Supabase PostgreSQL (RLS aktif + 3 Postgres RPC atomik) & Supabase Storage (`product-images`, `payment-proofs`) |
| **Deployment** | Vercel (2 proyek terpisah: `florist-api` dan `florist-pwa`) |

---

## URL Deploy

<<<<<<< HEAD
- **Frontend PWA:** https://bloom-florist-co.vercel.app
- **Backend REST API:** https://bloom-florist-api.vercel.app
=======
- **Frontend PWA:** `https://bloom-florist-co.vercel.app`
- **Backend REST API:** `https://bloom-florist-api.vercel.app`
>>>>>>> 80695d904af1835ff42941a5a6f1fc0a0d6d1c16

---

## Fitur Utama

### Sisi Pelanggan
- **Beranda (`/`) & Katalog (`/katalog`):** Tampilan editorial botanical dengan filter kategori momen, pencarian nama/deskripsi buket, dan status ketersediaan stok.
- **Detail Produk (`/produk/:id`):** Informasi lengkap buket beserta validasi jumlah pembelian agar tidak melebihi stok.
- **Akun & Profil Pelanggan (`/profil`):**
  - Pendaftaran akun baru (**Nama**, **Password**, **Nomor Telepon**, **Email**, **Alamat opsional**) dengan validasi keunikan nama, nomor telepon, dan email di server serta hashing password menggunakan `crypto.scryptSync`.
  - Masuk akun menggunakan **Nama / Nomor Telepon** dan **Password**, serta sinkronisasi otomatis profil dari database (`GET /api/customers/me`).
  - Tampilan password tersembunyi (`••••••••••••`) pada kartu profil dengan opsi ubah profil & ganti password opsional, informasi toko & rekening dari `GET /api/config`, indikator status online/offline, dan tombol instalasi PWA (`beforeinstallprompt`).
- **Keranjang (`/keranjang`) & Checkout (`/checkout`):** Tersimpan di `localStorage`, wajib masuk akun sebelum memesan, pemilihan tanggal ambil minimal **H+1**, jam ambil mulai **08:00 WIB**, serta kartu ucapan maksimal **200 karakter**.
- **Pesanan Saya (`/pesanan`) & Detail Pesanan (`/pesanan/:id`):**
  - Khusus dapat diakses setelah pelanggan masuk ke akunnya, dilengkapi pencarian riwayat pesanan berdasarkan **nama produk/buket** maupun **ID pesanan**.
  - Menampilkan instruksi transfer dari `GET /api/config`, unggah/perbarui bukti transfer (otomatis dikompres di browser `< 2 MB` melalui Canvas API), catatan penolakan jika ditolak penjual, tombol konfirmasi WhatsApp, dan pembatalan pesanan sebelum pembayaran terverifikasi.

### Sisi Penjual / Admin
*(Diakses langsung melalui path URL `/admin` tanpa tautan di navigasi pelanggan)*
- **Login Admin (`/admin`):** Autentikasi menggunakan `ADMIN_KEY` yang disimpan di `sessionStorage` dan dikirim melalui header `x-admin-key`.
- **Daftar Pesanan & Ringkasan Penjualan (`/admin/pesanan`):** Filter pesanan berdasarkan `payment_status` (*Menunggu Verifikasi*, *Semua Pesanan*, *Belum Bayar*, *Terverifikasi*, *Ditolak*) serta filter status **Selesai** (`status=selesai`), dilengkapi ringkasan total pesanan selesai, omzet, dan 3 buket terlaris.
- **Detail Pesanan Admin (`/admin/pesanan/:id`):** Melihat bukti transfer via **Signed URL** berumur pendek, menyetujui pembayaran (otomatis mengisi `paid_at` dan mengubah status menjadi `diproses`), menolak pembayaran dengan catatan wajib, memajukan status pesanan (`diproses → siap_diambil → selesai`), dan membatalkan pesanan belum terverifikasi.
- **Kelola Produk (`/admin/produk`):** Tambah, ubah, unggah/ganti foto produk ke bucket publik `product-images`, filter per kategori momen & nonaktif, nonaktifkan produk (*soft delete* `is_available = false` yang otomatis dikelompokkan ke **Kategori Nonaktif** di paling bawah), dan aktifkan kembali.

---

## Cara Menjalankan Secara Lokal

### 1. Siapkan Database Supabase
1. Buat proyek baru di [Supabase](https://supabase.com/).
2. Buka **SQL Editor** → **New query**.
3. Salin seluruh isi file [`supabase/schema.sql`](supabase/schema.sql) dan jalankan (**Run**) untuk membuat 5 tabel, mengaktifkan RLS, membuat 2 bucket Storage (`payment-proofs` & `product-images`), 3 fungsi RPC (`create_order`, `cancel_order`, `review_payment`), serta data dummy kategori dan produk.

### 2. Jalankan Backend API (`florist-api`)
```bash
cd florist-api
npm install
cp .env.example .env
```
Jalankan server development:
```bash
npm run dev
```
API berjalan di `http://localhost:3000`.

### 3. Jalankan Frontend PWA (`florist-pwa`)
Buka terminal baru:
```bash
cd florist-pwa
npm install
cp .env.example .env
```
Pastikan isi `florist-pwa/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```
Jalankan aplikasi Vite:
```bash
npm run dev
```
Aplikasi dapat diakses di `http://localhost:5173`.

---

## Daftar Endpoint API

Basis URL: `/api` (kecuali root health check `GET /`). Seluruh endpoint **Admin** mewajibkan header `x-admin-key`.

| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/config` | Publik | Info rekening pembayaran (`payment_info`) dan info toko (`store_info`) dari `.env` server |
| `GET` | `/categories`, `/categories/:id` | Publik | Daftar kategori dan detail kategori |
| `POST/PUT/DELETE` | `/categories`, `/categories/:id` | Admin | Tambah, ubah, dan hapus kategori |
| `GET` | `/products` | Publik | Daftar produk aktif (`is_available = true`), mendukung query `category_id` & `q` |
| `GET` | `/products/:id` | Publik | Detail produk aktif (mengembalikan `404` jika nonaktif) |
| `POST` | `/products` | Admin | Tambah produk baru (`multipart/form-data`, field `image` opsional) |
| `PUT` | `/products/:id` | Admin | Ubah data produk, ganti foto (menghapus foto lama), atau aktifkan kembali |
| `DELETE` | `/products/:id` | Admin | Nonaktifkan produk (*soft delete* `is_available = false`) |
| `POST` | `/customers/register` | Publik | Daftar akun pelanggan baru (`name`, `password`, `phone`, `email`, `address` opsional) |
| `POST` | `/customers/login` | Publik | Masuk akun pelanggan (`identifier` nama/nomor telepon + `password`) |
| `GET` | `/customers/me` | Publik | Sinkronisasi profil pelanggan terbaru dari database (`?id=&name=&phone=`) |
| `PUT` | `/customers/profile` | Publik | Perbarui profil & ubah password opsional untuk akun pelanggan |
| `GET/POST/PUT/DELETE` | `/customers`, `/customers/:id` | Admin | Manajemen data pelanggan oleh admin |
| `POST` | `/orders` | Publik | Buat pesanan secara atomik via RPC `create_order` (harga & stok divalidasi server) |
| `GET` | `/orders/summary` | Publik | Ringkasan total pesanan selesai, omzet, dan 3 produk terlaris |
| `GET` | `/orders?phone=...&ids=...` | Publik | Daftar pesanan pelanggan berdasarkan nomor telepon / ID pesanan |
| `GET` | `/orders/:id` | Publik | Detail pesanan beserta *signed URL* bukti transfer |
| `POST` | `/orders/:id/payment-proof` | Publik | Unggah foto bukti transfer (`multipart/form-data`, field `proof`, maks. 2 MB) |
| `PATCH` | `/orders/:id/cancel` | Pelanggan / Admin | Batalkan pesanan sebelum terverifikasi; pelanggan wajib cocok `phone`, admin via `x-admin-key` |
| `GET` | `/admin/ping` | Admin | Validasi `x-admin-key` |
| `GET` | `/admin/orders` | Admin | Daftar semua pesanan (mendukung filter `?payment_status=` & `?status=`) |
| `GET` | `/admin/products` | Admin | Daftar seluruh produk termasuk yang berstatus nonaktif |
| `PATCH` | `/orders/:id/payment` | Admin | Setujui atau tolak pembayaran (catatan wajib saat menolak) via RPC `review_payment` |
| `PATCH` | `/orders/:id/status` | Admin | Majukan status pesanan (`diproses → siap_diambil → selesai`) |

---

## Dukungan PWA & Mode Offline

- **Web App Manifest:** Ikon `192x192` & `512x512` (`any maskable`), `display: standalone`, dan `theme_color: #1E3528`.
- **Strategi Caching (`vite-plugin-pwa`):**
  - `NetworkFirst` hanya untuk `GET /api/products` dan `GET /api/categories` agar katalog yang pernah dimuat tetap tampil saat offline.
  - `NetworkOnly` untuk seluruh endpoint sensitif (`/api/orders`, `/api/config`, `/api/admin/*`, `/api/customers/*`).
- **Proteksi Aksi Tulis Saat Offline:** Tombol checkout, unggah bukti, batal pesanan, verifikasi admin, dan kelola produk dinonaktifkan otomatis ketika koneksi terputus.

---

## Arsitektur Keamanan & Keterbatasan yang Disadari

### Lapisan Keamanan yang Diterapkan
- **RLS Aktif Tanpa Policy:** Kelima tabel di Supabase mengaktifkan Row Level Security tanpa policy publik sehingga akses langsung melalui `anon key` tertutup; seluruh akses database dilakukan oleh backend melalui `SUPABASE_SERVICE_ROLE_KEY`.
- **Validasi Upload Berlapis:** Unggahan bukti bayar dan foto produk dibatasi maksimal **2 MB** dan diperiksa **magic bytes**-nya di server (hanya JPG, PNG, dan WebP asli yang diterima).
- **Bucket Privat Bukti Bayar:** Bucket `payment-proofs` bersifat privat dan hanya dapat diakses melalui *signed URL* berumur pendek (15 menit).
- **Timing-Safe Admin Key & Rate Limiting:** Perbandingan `x-admin-key` menggunakan `crypto.timingSafeEqual` di atas SHA-256 digest, serta pembatasan request (`express-rate-limit` dengan `trust proxy` untuk Vercel) pada `/api/admin/*`, endpoint unggahan, dan pembatalan pesanan.
- **CORS & SPA Routing Terkelola:** CORS dibatasi melalui `FRONTEND_URL` pada environment variable backend, dan routing SPA frontend di-rewrite ke `/index.html` melalui `florist-pwa/vercel.json`.

### Keterbatasan yang Disadari (Lingkup Praktikum)
- **Autentikasi Pelanggan Sederhana:** Sesi pelanggan disimpan di `localStorage` setelah login tanpa JWT token; pembatalan oleh pelanggan diverifikasi dengan mencocokkan UUID pesanan dan nomor telepon pemesan.
- **Tanpa Pembatalan Otomatis Berbasis Waktu:** Pesanan yang belum dibayar tidak dibatalkan otomatis oleh cron job; stok yang tertahan dikembalikan melalui pembatalan manual oleh pelanggan atau penjual sebelum pembayaran diverifikasi.
- **Pesanan Terverifikasi Bersifat Final di Aplikasi:** Pembatalan dan pengembalian dana untuk pesanan dengan `payment_status = terverifikasi` ditangani di luar aplikasi.
- **Verifikasi Bukti Transfer Manual:** Penjual tetap perlu mencocokkan bukti unggahan dengan mutasi rekening sebelum menyetujui pembayaran.
- **Tanpa UI Kelola Kategori:** Kategori bunga awal disediakan melalui `schema.sql` dan dikelola lewat API Admin atau Supabase Table Editor.
