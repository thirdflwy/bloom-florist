-- 1. EKSTENSI
create extension if not exists "pgcrypto";

-- 2. TABEL DATABASE
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text not null unique,
  address text,
  password_hash text
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  description text,
  image_url text,
  category_id uuid references categories(id),
  price numeric(12,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_available boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  status text not null default 'pending'
    check (status in ('pending','diproses','siap_diambil','selesai','dibatalkan')),
  payment_status text not null default 'belum_bayar'
    check (payment_status in ('belum_bayar','menunggu_verifikasi','terverifikasi','ditolak')),
  pickup_date date not null,
  pickup_time time not null check (pickup_time >= '08:00'),
  card_message text,
  total numeric(12,2) not null default 0,
  payment_proof_path text,
  payment_note text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null check (quantity > 0),
  price numeric(12,2) not null
);

-- 3. ROW LEVEL SECURITY (RLS)
-- RLS aktif tanpa policy: hanya backend dengan SUPABASE_SERVICE_ROLE_KEY yang dapat mengakses
alter table categories enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- 4. SUPABASE STORAGE BUCKETS (Tanpa Policy Tambahan; Diakses via Service Role / Public URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-proofs', 'payment-proofs', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('product-images', 'product-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- 5. ATOMIC POSTGRES RPC FUNCTIONS
-- =============================================================================

-- 5.1 RPC: create_order
-- Membuat pesanan dan mengurangi stok dalam satu transaksi atomik.
-- Menolak produk nonaktif, tidak ditemukan, atau stok kurang.
create or replace function create_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_customer_address text default null,
  p_pickup_date date default null,
  p_pickup_time time default '08:00',
  p_card_message text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product record;
  v_qty integer;
begin
  if p_customer_name is null or trim(p_customer_name) = '' then
    raise exception 'VALIDATION: Nama pemesan wajib diisi';
  end if;

  if p_customer_phone is null or trim(p_customer_phone) = '' then
    raise exception 'VALIDATION: Nomor telepon wajib diisi';
  end if;

  if p_pickup_date is null or p_pickup_date < current_date + 1 then
    raise exception 'VALIDATION: Tanggal ambil minimal H+1 (besok)';
  end if;

  if p_pickup_time is null or p_pickup_time < '08:00'::time then
    raise exception 'VALIDATION: Jam ambil minimal pukul 08:00';
  end if;

  if p_card_message is not null and char_length(p_card_message) > 200 then
    raise exception 'VALIDATION: Kartu ucapan maksimal 200 karakter';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VALIDATION: Item pesanan tidak boleh kosong';
  end if;

  -- Upsert data pelanggan berdasarkan nomor telepon yang sudah dinormalisasi
  insert into customers (name, phone, email, address)
  values (
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    nullif(trim(coalesce(p_customer_address, '')), '')
  )
  on conflict (phone) do update set
    name = excluded.name,
    email = coalesce(excluded.email, customers.email),
    address = coalesce(excluded.address, customers.address)
  returning id into v_customer_id;

  -- Buat baris pesanan awal
  insert into orders (
    customer_id,
    status,
    payment_status,
    pickup_date,
    pickup_time,
    card_message,
    total
  ) values (
    v_customer_id,
    'pending',
    'belum_bayar',
    p_pickup_date,
    p_pickup_time,
    nullif(trim(coalesce(p_card_message, '')), ''),
    0
  ) returning id into v_order_id;

  -- Iterasi item (diurutkan berdasarkan product_id untuk mencegah deadlock)
  for v_item in
    select value from jsonb_array_elements(p_items)
    order by (value->>'product_id')
  loop
    v_qty := (v_item->>'quantity')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'VALIDATION: Jumlah item harus lebih dari 0';
    end if;

    -- Kunci baris produk FOR UPDATE
    select * into v_product
    from products
    where id = (v_item->>'product_id')::uuid
    for update;

    if not found then
      raise exception 'NOT_FOUND: Produk dengan ID % tidak ditemukan', (v_item->>'product_id');
    end if;

    if not v_product.is_available then
      raise exception 'CONFLICT: Produk "%" sedang tidak aktif / tidak tersedia', v_product.name;
    end if;

    if v_product.stock < v_qty then
      raise exception 'CONFLICT: Stok produk "%" tidak mencukupi (tersedia: %, diminta: %)', v_product.name, v_product.stock, v_qty;
    end if;

    -- Kurangi stok produk
    update products
    set stock = stock - v_qty
    where id = v_product.id;

    -- Simpan detail item dengan harga dari database server
    insert into order_items (order_id, product_id, quantity, price)
    values (v_order_id, v_product.id, v_qty, v_product.price);

    v_total := v_total + (v_product.price * v_qty);
  end loop;

  -- Perbarui total harga pesanan
  update orders
  set total = v_total
  where id = v_order_id;

  return (
    select jsonb_build_object(
      'id', o.id,
      'customer_id', o.customer_id,
      'status', o.status,
      'payment_status', o.payment_status,
      'pickup_date', o.pickup_date,
      'pickup_time', o.pickup_time,
      'card_message', o.card_message,
      'total', o.total,
      'created_at', o.created_at
    )
    from orders o
    where o.id = v_order_id
  );
end;
$$;

-- 5.2 RPC: cancel_order
-- Mengunci baris pesanan FOR UPDATE, menolak jika payment_status = 'terverifikasi'
-- atau sudah 'dibatalkan', dan mengembalikan stok tepat satu kali.
create or replace function cancel_order(
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order record;
  v_item record;
begin
  -- Kunci baris pesanan untuk mencegah race condition dengan review_payment
  select * into v_order
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: Pesanan tidak ditemukan';
  end if;

  if v_order.status = 'dibatalkan' then
    raise exception 'CONFLICT: Pesanan sudah dibatalkan sebelumnya';
  end if;

  if v_order.payment_status = 'terverifikasi' then
    raise exception 'CONFLICT: Pesanan yang sudah terverifikasi tidak dapat dibatalkan';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'CONFLICT: Hanya pesanan berstatus pending yang dapat dibatalkan';
  end if;

  -- Kembalikan stok produk tepat satu kali
  for v_item in
    select product_id, quantity
    from order_items
    where order_id = p_order_id
    order by product_id
  loop
    update products
    set stock = stock + v_item.quantity
    where id = v_item.product_id;
  end loop;

  -- Ubah status pesanan menjadi dibatalkan
  update orders
  set status = 'dibatalkan'
  where id = p_order_id
  returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

-- 5.3 RPC: review_payment
-- Mengunci baris pesanan FOR UPDATE.
-- Jika disetujui: payment_status = 'terverifikasi', paid_at = now(), status = 'diproses'.
-- Jika ditolak: payment_status = 'ditolak', menyimpan payment_note wajib.
create or replace function review_payment(
  p_order_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order record;
begin
  -- Kunci baris pesanan yang sama dengan cancel_order
  select * into v_order
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: Pesanan tidak ditemukan';
  end if;

  if v_order.status = 'dibatalkan' then
    raise exception 'CONFLICT: Pesanan sudah dibatalkan dan tidak dapat diverifikasi';
  end if;

  if v_order.payment_status = 'terverifikasi' then
    raise exception 'CONFLICT: Pembayaran pesanan ini sudah terverifikasi';
  end if;

  if p_action in ('approve', 'terverifikasi', 'setuju') then
    update orders
    set
      payment_status = 'terverifikasi',
      paid_at = now(),
      status = 'diproses',
      payment_note = nullif(trim(coalesce(p_note, '')), '')
    where id = p_order_id
    returning * into v_order;

  elsif p_action in ('reject', 'ditolak', 'tolak') then
    if p_note is null or trim(p_note) = '' then
      raise exception 'VALIDATION: Catatan penolakan wajib diisi saat menolak pembayaran';
    end if;

    update orders
    set
      payment_status = 'ditolak',
      payment_note = trim(p_note)
    where id = p_order_id
    returning * into v_order;

  else
    raise exception 'VALIDATION: Aksi verifikasi tidak valid (gunakan approve atau reject)';
  end if;

  return to_jsonb(v_order);
end;
$$;

-- =============================================================================
-- 6. SEED DATA (KATEGORI & PRODUK BUNGA AWAL)
-- =============================================================================

insert into categories (id, name) values
  ('11111111-1111-4111-8111-111111111101', 'Romantis & Anniversary'),
  ('11111111-1111-4111-8111-111111111102', 'Ulang Tahun'),
  ('11111111-1111-4111-8111-111111111103', 'Wisuda & Selamat'),
  ('11111111-1111-4111-8111-111111111104', 'Simpati & Duka Cita'),
  ('11111111-1111-4111-8111-111111111105', 'Meja & Dekorasi')
on conflict (id) do update set name = excluded.name;

insert into products (id, sku, name, description, image_url, category_id, price, stock, is_available) values
  (
    '22222222-2222-4222-8222-222222222201',
    'BLM-ROS-001',
    'Blush Elegance Rose Bouquet',
    'Rangkaian mawar merah muda lembut dipadukan dengan lily putih harum dan daun eucalyptus segar, dibalut kertas wrapping satin premium khas Bloom & Co.',
    'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=900&q=80',
    '11111111-1111-4111-8111-111111111101',
    285000,
    15,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    'BLM-RED-002',
    'Classic Velvet Red Roses',
    'Buket 12 tangkai mawar merah beludru pilihan dengan baby breath putih dan pita satin merah tua. Ungkapan cinta klasik yang tak lekang oleh waktu.',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80',
    '11111111-1111-4111-8111-111111111101',
    350000,
    12,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    'BLM-SUN-003',
    'Sunshine Delight Sunflower',
    'Kombinasi bunga matahari segar yang cerah dengan chamomile dan dedaunan hijau organik. Menghadirkan kehangatan dan energi positif di hari spesial.',
    'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80',
    '11111111-1111-4111-8111-111111111103',
    225000,
    18,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    'BLM-PAS-004',
    'Pastel Peony & Hydrangea Box',
    'Rangkaian bunga peony pastel, hydrangea lembut, dan mawar taman dalam bloom box eksklusif. Hadiah ulang tahun elegan yang siap memikat hati.',
    'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=900&q=80',
    '11111111-1111-4111-8111-111111111102',
    420000,
    8,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    'BLM-TUL-005',
    'Spring Whisper Pink Tulips',
    'Buket 10 tangkai tulip merah muda segar impor dengan balutan kertas kraft minimalis dan pita linen organik. Manis dan menenangkan.',
    'https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=900&q=80',
    '11111111-1111-4111-8111-111111111102',
    390000,
    10,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    'BLM-SYM-006',
    'Pure Serenity White Lily',
    'Rangkaian bunga lily putih Casablanca, krisan putih, dan ruskus hijau sebagai ungkapan simpati, doa tulus, dan penghormatan yang penuh ketenangan.',
    'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=900&q=80',
    '11111111-1111-4111-8111-111111111104',
    310000,
    9,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222207',
    'BLM-GRD-007',
    'Golden Hour Graduation Bouquet',
    'Perpaduan mawar peach, gerbera krem, dan aksen dried lagurus untuk merayakan kelulusan, wisuda, maupun pencapaian berharga orang terdekat.',
    'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=900&q=80',
    '11111111-1111-4111-8111-111111111103',
    260000,
    20,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222208',
    'BLM-BOT-008',
    'Botanical Garden Vase Arrangement',
    'Bunga meja segar terdiri dari lisianthus putih, mawar pastel, dan eucalyptus silver dollar yang dirangkai artistik untuk mempercantik ruangan.',
    'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
    '11111111-1111-4111-8111-111111111105',
    450000,
    6,
    true
  )
on conflict (id) do update set
  sku = excluded.sku,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  category_id = excluded.category_id,
  price = excluded.price,
  stock = excluded.stock,
  is_available = excluded.is_available;