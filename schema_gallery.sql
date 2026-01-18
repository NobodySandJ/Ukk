-- TABEL GALLERY --
CREATE TABLE IF NOT EXISTS gallery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    category TEXT DEFAULT 'carousel',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS POLICIES (Keamanan) --
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa melihat (SELECT)
CREATE POLICY "Public Gallery Access" ON gallery
    FOR SELECT USING (true);

-- Hanya Admin/Authenticated user yang bisa menambah (INSERT)
CREATE POLICY "Admin Insert Gallery" ON gallery
    FOR INSERT TO authenticated WITH CHECK (true);

-- Hanya Admin/Authenticated user yang bisa mengubah/menghapus (UPDATE/DELETE)
CREATE POLICY "Admin Delete Gallery" ON gallery
    FOR DELETE TO authenticated USING (true);
