-- File: insert_initial_data.sql
-- Silakan jalankan query ini di SQL Editor Supabase untuk memasukkan SEMUA data awal (Member, Berita, Galeri).

-- ==========================================
-- 1. INSERT DATA MEMBER
-- ==========================================
INSERT INTO members (name, role, price, image_url, details, display_order, is_active)
VALUES
  ('Aca', 'Kapten', 25000, 'img/member/CVRAca.webp', '{"sifat": "Ceria, Usil, Lincah", "hobi": "Nyanyi, turu, main emel, berak, repeat", "jiko": "Citcitcutcuit dengarlah kicauanku yang akan meramaikan hatimuuu"}', 1, true),
  ('Sinta', 'Vokalis Utama', 25000, 'img/member/CVRSinta.webp', '{"sifat": "Pemalu, Penasaran", "hobi": "Memasak, menyanyi, menari, nonton anime, tidur", "jiko": "Si pemalu tetapi suka hal-hal baru, haloo aku Sintaa"}', 2, true),
  ('Cissi', 'Dancer Utama', 25000, 'img/member/CVRCissi.webp', '{"sifat": "Imajinatif, Humoris", "hobi": "Dance dan melamun", "jiko": "Aiyaiya, i''m your little butterfly~ Kupu-kupu yang suka menari dan bisa membuatmu bahagia, halo halo semuanya aku Cissi"}', 3, true),
  ('Channie', 'Dancer', 25000, 'img/member/CVRChannie.webp', '{"sifat": "Kreatif, Aktif", "hobi": "Dance, bikin koreo, nulis, makan gorengan", "jiko": "Semungil bintang yang akan menerangi hatimu seperti bulan, halo semuanya aku Channie!"}', 4, true),
  ('Cally', 'Vocal', 25000, 'img/member/CVRCally.webp', '{"sifat": "Lembut, Weirdo", "hobi": "Menonton film, mempertanyakan eksistensi diri sendiri, menyanyi", "jiko": "Mengapung lembut dihatimu seperti ubur ubur yang menari di laut🪼~ Hallo aku Cally!!!"}', 5, true),
  ('Yanyee', 'Dancer', 25000, 'img/member/CVRYanyee.webp', '{"sifat": "Anggun, Hangat, Cerah", "hobi": "Makeup, dance, baking", "jiko": "manis, lembut, dan selalu siap membuat harimu jadi lebih hangat seperti cookies yang baru matang🍪. haloo semuaa, aku yan yee!🪽"}', 6, true),
  ('Piya', 'Vocal', 25000, 'img/member/CVRPiya.webp', '{"sifat": "Periang, lucu", "hobi": "Gambar dan main rosbloz", "jiko": "Pyon! pyon! seperti kelinci yang melompat tinggi aku akan melompat ke posisi tertinggi di hatimu 🐰 ~ Hallo aku Piya !!"}', 7, true);

-- ==========================================
-- 2. INSERT DATA BERITA (NEWS)
-- ==========================================
INSERT INTO news (title, content, date, is_published)
VALUES
  ('Debut Single ''Umi no Melody''!', 'Single pertama kami akan segera dirilis! Nantikan informasi selanjutnya.', '25 Oktober 2025', true),
  ('Jadwal Theater Bulan November', 'Jadwal pertunjukan teater untuk bulan November telah diperbarui di halaman event.', '20 Oktober 2025', true);

-- ==========================================
-- 3. INSERT DATA GALERI
-- ==========================================
INSERT INTO gallery (image_url, alt_text, display_order)
VALUES
  ('img/member/group.webp', 'Mujōken no Umi di atas panggung', 1),
  ('img/member/NEaca.webp', 'Aca saat tampil solo', 2),
  ('img/member/NEsinta.webp', 'Sinta dalam sesi foto', 3),
  ('img/member/NEcissi.webp', 'Cissi menyapa penggemar', 4),
  ('img/member/NEchannie.webp', 'Channie dengan senyum manisnya', 5),
  ('img/member/NEcally.webp', 'Cally dengan tatapan karismatik', 6),
  ('img/member/NEyanyee.webp', 'Yanyee perform', 7),
  ('img/member/NEpiya.webp', 'Piya di backstage', 8);
