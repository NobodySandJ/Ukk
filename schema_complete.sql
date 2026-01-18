-- =============================================
-- SCHEMA REFRESH BREEZE (Simplified)
-- Jalankan di Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. UPDATE TABEL MEMBERS
-- Tambah kolom member_type untuk Group Cheki
-- =============================================
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'individual';

-- =============================================
-- 2. UPDATE TABEL GALLERY
-- Tambah kolom category dan is_active
-- =============================================
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'carousel';
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =============================================
-- 3. INSERT GRUP SEBAGAI PRODUK CHEKI
-- (Jika belum ada)
-- =============================================
INSERT INTO members (name, role, price, image_url, member_type, display_order, is_active)
SELECT 'Grup', 'All Member', 30000, NULL, 'group', 0, true
WHERE NOT EXISTS (SELECT 1 FROM members WHERE member_type = 'group');

-- =============================================
-- CATATAN:
-- - group info (nama band, tagline) → tetap di data.json
-- - group_cheki (produk cheki grup) → tabel members dengan member_type='group'
-- - Upload foto Grup via Admin Panel setelah menjalankan SQL ini
-- =============================================
