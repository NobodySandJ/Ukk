-- =============================================
-- FIX RLS (KEAMANAN) - JALANKAN INI DI SUPABASE
-- Masalah: Data ada di DB, tapi API tidak bisa baca (kembalian kosong)
-- Penyebab: Policy RLS memblokir akses publik
-- =============================================

-- 1. Reset Policy Gallery
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada (untuk menghindari duplikat error)
DROP POLICY IF EXISTS "Public Gallery Access" ON gallery;
DROP POLICY IF EXISTS "Admin All Access" ON gallery; -- Jika ada

-- Buat Policy Baru: SEMUA ORANG BISA BACA (SELECT)
CREATE POLICY "Public Gallery Access" ON gallery
FOR SELECT USING (true);

-- Buat Policy Baru: ADMIN BISA SEGALA-GALANYA (INSERT/UPDATE/DELETE)
-- Asumsi user admin sudah login (authenticated)
CREATE POLICY "Admin Modify Gallery" ON gallery
FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 2. (Opsional) Fix Policy Members juga biar aman
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Members Access" ON members;
CREATE POLICY "Public Members Access" ON members
FOR SELECT USING (true);

CREATE POLICY "Admin Modify Members" ON members
FOR ALL TO authenticated USING (true) WITH CHECK (true);
