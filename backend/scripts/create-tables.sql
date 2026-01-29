-- ================================================================
-- SCRIPT SQL: Membuat Tabel Members dan Events
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- Tabel Members (Anggota/Member)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    member_type VARCHAR(50) DEFAULT 'individual', -- 'individual' atau 'group'
    role VARCHAR(100),
    image_url TEXT,
    bio TEXT,
    social_media JSONB, -- {instagram: '', twitter: '', etc}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk pencarian
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_members_type ON members(member_type);
CREATE INDEX IF NOT EXISTS idx_members_active ON members(is_active);

-- Tabel Events (Acara/Event)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(200) NOT NULL,
    tanggal DATE NOT NULL,
    lokasi VARCHAR(200),
    lineup TEXT, -- Comma-separated member names
    deskripsi TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk pencarian dan sorting
CREATE INDEX IF NOT EXISTS idx_events_tanggal ON events(tanggal);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_tanggal_active ON events(tanggal, is_active);

-- Trigger untuk update updated_at otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger ke members
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger ke events
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (opsional)
-- Uncomment jika ingin menambahkan data contoh

-- INSERT INTO members (name, member_type, role, image_url, bio) VALUES
-- ('Aca', 'individual', 'Member', '/img/member/NEaca.webp', 'Member Refresh Breeze'),
-- ('Sinta', 'individual', 'Member', '/img/member/NEsinta.webp', 'Member Refresh Breeze'),
-- ('Cissi', 'individual', 'Member', '/img/member/NEcissi.webp', 'Member Refresh Breeze'),
-- ('Refresh Breeze', 'group', 'Group', '/img/logo/logo.png', 'Official Group');

-- INSERT INTO events (nama, tanggal, lokasi, lineup, deskripsi) VALUES
-- ('Refresh Breeze Anniversary', '2026-03-01', 'Theater Refresh Breeze', 'Aca, Sinta, Cissi', 'Perayaan ulang tahun pertama Refresh Breeze'),
-- ('Meet & Greet Session', '2026-03-15', 'Cafe Breeze', 'All Member', 'Sesi bertemu langsung dengan para member');

-- Enable RLS (Row Level Security) - PENTING untuk keamanan!
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy untuk public read access
CREATE POLICY "Allow public read access on members" ON members
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on events" ON events
    FOR SELECT USING (true);

-- Policy untuk authenticated users dengan role admin (sesuaikan dengan sistem auth Anda)
-- Uncomment dan sesuaikan jika menggunakan Supabase Auth
-- CREATE POLICY "Allow admin full access on members" ON members
--     FOR ALL USING (
--         auth.jwt() ->> 'role' = 'admin'
--     );

-- CREATE POLICY "Allow admin full access on events" ON events
--     FOR ALL USING (
--         auth.jwt() ->> 'role' = 'admin'
--     );

-- Untuk development, Anda bisa menggunakan service_role key yang bypass RLS
-- Atau buat policy yang lebih permissive:
CREATE POLICY "Allow all operations on members for service role" ON members
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on events for service role" ON events
    FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE members IS 'Tabel untuk menyimpan data anggota/member Refresh Breeze';
COMMENT ON TABLE events IS 'Tabel untuk menyimpan data event/acara Refresh Breeze';
