# 🗃️ Database Setup - Refresh Breeze

## Error 500 pada `/api/admin/members` dan `/api/admin/events`

Error ini terjadi karena tabel `members` dan `events` belum dibuat di database Supabase.

## 🔧 Cara Memperbaiki

### Metode 1: Via Supabase Dashboard (Recommended)

1. **Buka Supabase Dashboard**
   - Login ke [https://supabase.com](https://supabase.com)
   - Pilih project Anda

2. **Buka SQL Editor**
   - Klik menu "SQL Editor" di sidebar kiri
   - Atau buka: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql`

3. **Jalankan Script**
   - Copy seluruh isi file `create-tables.sql`
   - Paste ke SQL Editor
   - Klik tombol **"Run"** atau tekan `Ctrl + Enter`

4. **Verifikasi**
   - Buka menu "Table Editor"
   - Pastikan tabel `members` dan `events` sudah muncul

### Metode 2: Via Supabase CLI (Advanced)

```bash
# Install Supabase CLI (jika belum)
npm install -g supabase

# Login
supabase login

# Link ke project
supabase link --project-ref YOUR_PROJECT_ID

# Jalankan migration
supabase db push
```

## 📋 Struktur Tabel yang Dibuat

### Tabel `members`
```sql
- id (UUID, Primary Key)
- name (VARCHAR)
- member_type (VARCHAR) - 'individual' atau 'group'
- role (VARCHAR)
- image_url (TEXT)
- bio (TEXT)
- social_media (JSONB)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabel `events`
```sql
- id (UUID, Primary Key)
- nama (VARCHAR)
- tanggal (DATE)
- lokasi (VARCHAR)
- lineup (TEXT) - Comma-separated names
- deskripsi (TEXT)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🎯 Sample Data (Opsional)

Jika ingin menambahkan data contoh untuk testing, uncomment bagian `INSERT INTO` di file SQL.

## ✅ Testing

Setelah menjalankan script:

1. **Refresh browser** di halaman admin
2. **Buka menu "Member"** - seharusnya tidak error lagi
3. **Buka menu "Event"** - seharusnya tidak error lagi
4. **Check Console** - tidak ada error 500 lagi

## 🔒 Security Notes

- RLS (Row Level Security) sudah diaktifkan
- Policy untuk public read sudah dibuat
- Policy untuk admin access menggunakan service role key
- Untuk production, sesuaikan policy sesuai kebutuhan authentication

## 📝 Troubleshooting

### Jika masih error setelah menjalankan script:

1. **Check Supabase Connection**
   ```bash
   # Di terminal backend
   node -e "const s = require('./config/supabase'); console.log('Connected:', !!s)"
   ```

2. **Check Environment Variables**
   - Pastikan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` benar di `.env`

3. **Check Server Logs**
   ```bash
   # Lihat file log
   cat backend/combined.log
   ```

4. **Restart Server**
   ```bash
   cd backend
   npm restart
   ```

## 🆘 Need Help?

Jika masih mengalami masalah:
- Check file `backend/combined.log` untuk error details
- Pastikan semua tabel sudah dibuat dengan benar
- Verifikasi RLS policy sudah aktif
