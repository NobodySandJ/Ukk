-- ============================================================
-- CLEANUP OLD GALLERY DATA
-- ============================================================
-- Script ini untuk membersihkan data gallery lama yang masih 
-- menggunakan path lokal (img/gallery/xxx.webp)
-- Jalankan di Supabase SQL Editor sebelum mulai upload baru

-- Option 1: Hapus semua data gallery lama (RECOMMENDED untuk fresh start)
DELETE FROM gallery 
WHERE image_url LIKE 'img/gallery/%';

-- Option 2: Update path ke dokumentasi (jika mau tetap simpan)
-- UPDATE gallery 
-- SET image_url = REPLACE(image_url, 'img/gallery/', 'img/dokumentasi/')
-- WHERE image_url LIKE 'img/gallery/%';

-- Verify: Check remaining records
SELECT * FROM gallery;

-- ============================================================
-- CLEANUP OLD MEMBER DATA (if needed)
-- ============================================================
-- Hapus member dengan foto upload lokal (kecuali file default)
DELETE FROM members 
WHERE image_url LIKE 'img/member/%' 
AND image_url NOT IN (
    '/img/member/placeholder.webp',
    'img/member/NEaca.webp',
    'img/member/NEsinta.webp',
    'img/member/group.webp'
);

-- Verify: Check remaining members
SELECT * FROM members;

-- ============================================================
-- RESET AUTO INCREMENT (Optional)
-- ============================================================
-- Reset ID sequence jika mau mulai dari awal
-- ALTER SEQUENCE gallery_id_seq RESTART WITH 1;
-- ALTER SEQUENCE members_id_seq RESTART WITH 1;
