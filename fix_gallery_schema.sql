-- =============================================
-- FIX DATABASE SCHEMA: GALLERY
-- Jalankan script ini di Supabase SQL Editor
-- =============================================

-- 1. Tambahkan kolom 'category' jika belum ada
ALTER TABLE gallery 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'carousel';

-- 2. Tambahkan kolom 'is_active' jika belum ada
ALTER TABLE gallery 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Check apakah berhasil
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gallery';
