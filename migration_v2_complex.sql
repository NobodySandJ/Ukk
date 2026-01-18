-- =============================================
-- MIGRATION V2: ADVANCED ERD (Kompleks)
-- Tujuan: Normalisasi Database (Memenuhi Standar UKK)
-- =============================================

-- 1. BUAT TABEL PRODUCTS (Manajemen Stok & Harga Per Item)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'cheki', -- cheki, merch, ticket
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL, -- Relasi ke Member
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. BUAT TABEL ORDER_ITEMS (Rincian Pesanan)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT REFERENCES pesanan(id_pesanan) ON DELETE CASCADE, -- Link ke Nota
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Link ke Produk
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_purchase INTEGER NOT NULL, -- Snapshot harga saat beli (PENTING!)
    subtotal INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. SEEDING DATA (Pindahkan dari data lama ke tabel baru)

-- A. Ambil harga dari tabel pengaturan (Fallback ke 25000/30000 jika kosong)
DO $$
DECLARE
    harga_member INTEGER;
    harga_grup INTEGER;
    stok_awal INTEGER;
BEGIN
    -- Ambil harga member
    SELECT COALESCE(NULLIF(nilai, '')::INTEGER, 25000) INTO harga_member 
    FROM pengaturan WHERE nama = 'harga_cheki_member';
    
    -- Ambil harga grup
    SELECT COALESCE(NULLIF(nilai, '')::INTEGER, 30000) INTO harga_grup 
    FROM pengaturan WHERE nama = 'harga_cheki_grup';

    -- Ambil stok global (kita bagi rata atau set default)
    SELECT COALESCE(NULLIF(nilai, '')::INTEGER, 100) INTO stok_awal 
    FROM pengaturan WHERE nama = 'stok_cheki';

    -- INSERT PRODUK: MEMBER INDIVIDUAL
    INSERT INTO products (name, description, price, stock, category, image_url, member_id)
    SELECT 
        'Cheki ' || name, 
        'Tiket Cheki 2-Shot dengan ' || name, 
        harga_member, 
        stok_awal, -- Set stok awal
        'cheki_member', 
        image_url, 
        id
    FROM members 
    WHERE member_type != 'group' AND is_active = true
    AND NOT EXISTS (SELECT 1 FROM products WHERE member_id = members.id);

    -- INSERT PRODUK: GRUP
    INSERT INTO products (name, description, price, stock, category, image_url, member_id)
    SELECT 
        'Cheki Grup', 
        'Tiket Cheki Group Shot', 
        harga_grup, 
        stok_awal, 
        'cheki_group', 
        image_url, 
        id
    FROM members 
    WHERE member_type = 'group' AND is_active = true
    AND NOT EXISTS (SELECT 1 FROM products WHERE member_id = members.id);

END $$;

-- 4. BUKA AKSES (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Produk bisa dilihat semua orang
DROP POLICY IF EXISTS "Public View Products" ON products;
CREATE POLICY "Public View Products" ON products FOR SELECT USING (true);

-- Order Items bisa dilihat pemiliknya
DROP POLICY IF EXISTS "User View Own Items" ON order_items;
CREATE POLICY "User View Own Items" ON order_items 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM pesanan 
        WHERE pesanan.id_pesanan = order_items.order_id 
        AND pesanan.id_pengguna = auth.uid()
    )
);

-- Admin bisa semua
DROP POLICY IF EXISTS "Admin All Products" ON products;
CREATE POLICY "Admin All Products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin All Items" ON order_items;
CREATE POLICY "Admin All Items" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. UPDATE GALLERY (Tambahan agar Gallery terhubung ke Member - Extra Nilai)
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;
-- (Opsional) Auto-link gallery yg sudah ada berdasarkan nama file/category (Advanced logic bisa di sini)

-- 6. FUNGSI SQL untuk Kurangi Stok Produk (Dipanggil dari Backend)
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE products 
    SET stock = stock - p_quantity 
    WHERE id = p_product_id AND stock >= p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

