-- FIX RLS POLICY FOR GALLERY & NEWS
-- Masalah: Admin tidak bisa upload foto (Error: new row violates row-level security policy)

-- 1. Reset Policy Gallery
DROP POLICY IF EXISTS "Public View Gallery" ON gallery;
DROP POLICY IF EXISTS "Admin Manage Gallery" ON gallery;

-- Enable RLS
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- Policy: Publik bisa melihat (SELECT)
CREATE POLICY "Public View Gallery" ON gallery
FOR SELECT USING (true);

-- Policy: Admin (Authenticated) bisa Insert/Update/Delete
-- Karena backend menggunakan service role key untuk beberapa hal, 
-- tapi terkadang menggunakan client key dengan token user.
-- Kita izinkan semua authenticated user untuk INSERT (validasi admin dilakukan di Backend API)
CREATE POLICY "Authenticated Insert Gallery" ON gallery
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated Update Gallery" ON gallery
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated Delete Gallery" ON gallery
FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Lakukan hal yang sama untuk News (jaga-jaga)
DROP POLICY IF EXISTS "Public View News" ON news;
DROP POLICY IF EXISTS "Admin Manage News" ON news;

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public View News" ON news
FOR SELECT USING (true);

CREATE POLICY "Authenticated Manage News" ON news
FOR ALL USING (auth.role() = 'authenticated');
