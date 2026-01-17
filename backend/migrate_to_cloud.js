const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Konfigurasi
const BUCKET_NAME = 'public-images';
const MEMBER_IMG_DIR = path.join(__dirname, '../img/member');

// Cek koneksi Supabase
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Error: File .env tidak ditemukan atau variabel SUPABASE_URL/SUPABASE_ANON_KEY kosong.');
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Data Member (Mapping file lokal ke data member)
const members = [
    { name: 'Aca', role: 'Kapten', file: 'CVRAca.webp', details: '{"sifat": "Ceria, Usil, Lincah", "hobi": "Nyanyi, turu, main emel, berak, repeat", "jiko": "Citcitcutcuit dengarlah kicauanku yang akan meramaikan hatimuuu"}' },
    { name: 'Sinta', role: 'Vokalis Utama', file: 'CVRSinta.webp', details: '{"sifat": "Pemalu, Penasaran", "hobi": "Memasak, menyanyi, menari, nonton anime, tidur", "jiko": "Si pemalu tetapi suka hal-hal baru, haloo aku Sintaa"}' },
    { name: 'Cissi', role: 'Dancer Utama', file: 'CVRCissi.webp', details: '{"sifat": "Imajinatif, Humoris", "hobi": "Dance dan melamun", "jiko": "Aiyaiya, i\'\'m your little butterfly~ Kupu-kupu yang suka menari dan bisa membuatmu bahagia, halo halo semuanya aku Cissi"}' },
    { name: 'Channie', role: 'Dancer', file: 'CVRChannie.webp', details: '{"sifat": "Kreatif, Aktif", "hobi": "Dance, bikin koreo, nulis, makan gorengan", "jiko": "Semungil bintang yang akan menerangi hatimu seperti bulan, halo semuanya aku Channie!"}' },
    { name: 'Cally', role: 'Vocal', file: 'CVRCally.webp', details: '{"sifat": "Lembut, Weirdo", "hobi": "Menonton film, mempertanyakan eksistensi diri sendiri, menyanyi", "jiko": "Mengapung lembut dihatimu seperti ubur ubur yang menari di laut🪼~ Hallo aku Cally!!!"}' },
    { name: 'Yanyee', role: 'Dancer', file: 'CVRYanyee.webp', details: '{"sifat": "Anggun, Hangat, Cerah", "hobi": "Makeup, dance, baking", "jiko": "manis, lembut, dan selalu siap membuat harimu jadi lebih hangat seperti cookies yang baru matang🍪. haloo semuaa, aku yan yee!🪽"}' },
    { name: 'Piya', role: 'Vocal', file: 'CVRPiya.webp', details: '{"sifat": "Periang, lucu", "hobi": "Gambar dan main rosbloz", "jiko": "Pyon! pyon! seperti kelinci yang melompat tinggi aku akan melompat ke posisi tertinggi di hatimu 🐰 ~ Hallo aku Piya !!"}' }
];

// Data Gallery
const gallery = [
    { file: 'group.webp', alt: 'Mujōken no Umi di atas panggung' },
    { file: 'NEaca.webp', alt: 'Aca saat tampil solo' },
    { file: 'NEsinta.webp', alt: 'Sinta dalam sesi foto' },
    { file: 'NEcissi.webp', alt: 'Cissi menyapa penggemar' },
    { file: 'NEchannie.webp', alt: 'Channie dengan senyum manisnya' },
    { file: 'NEcally.webp', alt: 'Cally dengan tatapan karismatik' },
    { file: 'NEyanyee.webp', alt: 'Yanyee perform' },
    { file: 'NEpiya.webp', alt: 'Piya di backstage' }
];

async function uploadFile(filename) {
    try {
        const filePath = path.join(MEMBER_IMG_DIR, filename);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ File tidak ditemukan: ${filename}`);
            return null;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const storagePath = `migrated/${filename}`; // Upload ke folder 'migrated' di bucket

        console.log(`⏳ Uploading ${filename}...`);
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, fileBuffer, {
                contentType: 'image/webp',
                upsert: true
            });

        if (error) throw error;

        // Get Public URL
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
        console.log(`✅ Sukses: ${data.publicUrl}`);
        return data.publicUrl;

    } catch (e) {
        console.error(`❌ Gagal upload ${filename}: ${e.message}`);
        return null; // Fallback to null (atau path lokal lama jika mau)
    }
}

async function runMigration() {
    console.log('🚀 Memulai Migrasi ke Cloud Storage...\n');

    let sqlScript = `-- File: insert_cloud_data.sql\n`;
    sqlScript += `-- Generated automatic migration script\n`;
    sqlScript += `-- Menggunakan gambar dari Supabase Bucket '${BUCKET_NAME}'\n\n`;

    // 1. Process Members
    console.log('--- Memproses Member ---');
    sqlScript += `-- 1. INSERT DATA MEMBER (Cloud Images)\n`;
    sqlScript += `INSERT INTO members (name, role, price, image_url, details, display_order, is_active) VALUES\n`;

    const memberValues = [];
    for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const cloudUrl = await uploadFile(m.file);
        // Fallback jika upload gagal: pakai path data.json
        const finalUrl = cloudUrl || `img/member/${m.file}`;

        memberValues.push(`  ('${m.name}', '${m.role}', 25000, '${finalUrl}', '${m.details}', ${i + 1}, true)`);
    }
    sqlScript += memberValues.join(',\n') + ';\n\n';

    // 2. Process Gallery
    console.log('\n--- Memproses Gallery ---');
    sqlScript += `-- 2. INSERT DATA GALERI (Cloud Images)\n`;
    sqlScript += `INSERT INTO gallery (image_url, alt_text, display_order) VALUES\n`;

    const galleryValues = [];
    for (let i = 0; i < gallery.length; i++) {
        const g = gallery[i];
        const cloudUrl = await uploadFile(g.file);
        const finalUrl = cloudUrl || `img/member/${g.file}`;

        galleryValues.push(`  ('${finalUrl}', '${g.alt}', ${i + 1})`);
    }
    sqlScript += galleryValues.join(',\n') + ';\n\n';

    // 3. News (Static, no images to upload currently)
    sqlScript += `-- 3. INSERT DATA BERITA\n`;
    sqlScript += `INSERT INTO news (title, content, date, is_published) VALUES
  ('Debut Single ''Umi no Melody''!', 'Single pertama kami akan segera dirilis! Nantikan informasi selanjutnya.', '25 Oktober 2025', true),
  ('Jadwal Theater Bulan November', 'Jadwal pertunjukan teater untuk bulan November telah diperbarui di halaman event.', '20 Oktober 2025', true);`;

    const outputPath = path.join(__dirname, '../insert_cloud_data.sql');
    fs.writeFileSync(outputPath, sqlScript);

    console.log('\n================================================');
    console.log('✅ Migrasi Selesai!');
    console.log(`📝 File SQL baru telah dibuat: ${outputPath}`);
    console.log('👉 Silakan jalankan file SQL tersebut di Supabase SQL Editor.');
    console.log('================================================');
}

runMigration();
