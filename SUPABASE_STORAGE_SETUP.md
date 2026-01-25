# 🗄️ Setup Supabase Storage untuk Upload Gambar

## ⚠️ PENTING: Perubahan Upload System

Sistem upload telah diubah dari **file lokal** ke **Supabase Storage (Cloud)**.

### Kenapa Perlu Supabase Storage?

✅ **Folder `img/` hanya untuk asset statis** (logo, placeholder)  
✅ **Upload user (gallery, member) masuk ke cloud** (Supabase Storage)  
✅ **Scalable & Production-ready**  
✅ **Tidak membebani repository Git**  

---

## 📋 Langkah Setup Supabase Storage

### 1. Buka Dashboard Supabase

1. Login ke [https://supabase.com](https://supabase.com)
2. Pilih project Anda
3. Klik menu **Storage** di sidebar kiri

### 2. Buat Storage Bucket

1. Klik tombol **"New bucket"**
2. Isi nama bucket: `images`
3. **PENTING**: Set **Public bucket** = **ON** (agar gambar bisa diakses publik)
4. Klik **"Create bucket"**

### 3. Buat Folder Structure

Setelah bucket dibuat, buat folder-folder ini:

- `gallery/` - untuk foto gallery
- `members/` - untuk foto member
- `news/` - untuk foto berita (opsional)

**Cara buat folder:**
- Klik bucket `images`
- Klik **"Upload"** > **"Create folder"**
- Ketik nama folder (misal: `gallery`)

### 4. Set Bucket Policies (PENTING!)

Agar gambar bisa diakses publik, set policy:

1. Klik bucket `images`
2. Klik tab **"Policies"**
3. Klik **"New Policy"** > **"For full customization"**
4. Paste policy ini:

```sql
-- Allow public read access to all files in images bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'images' );
```

**Atau gunakan cara mudah:**
- Klik **"New Policy"** > **"Allow public read access"**
- Pilih bucket `images`
- Klik **"Create policy"**

### 5. Test Upload

Upload 1 gambar test ke folder `gallery/`:
1. Buka bucket `images` > folder `gallery`
2. Klik **"Upload"** > pilih gambar
3. Setelah upload, klik kanan file > **"Get URL"**
4. Copy URL (contoh: `https://xxxx.supabase.co/storage/v1/object/public/images/gallery/test.jpg`)

---

## 🧹 Cleanup File Lokal

Setelah setup Supabase Storage selesai, hapus file upload lokal:

```bash
# Hapus folder gallery uploads (simpan file yang ada di database dulu!)
rm -rf img/gallery/*

# Hapus folder member uploads (simpan file yang ada di database dulu!)
rm -rf img/member/*.webp
# Kecuali file placeholder & logo
```

**File yang HARUS TETAP ada di folder lokal:**
- `img/logo/*` - Logo & favicon
- `img/member/placeholder.webp` - Placeholder member
- `img/dokumentasi/*` - Dokumentasi static

---

## 🔧 Cara Kerja Sistem Baru

### Upload Flow (Gallery)

```
User upload gambar via Admin Panel
        ↓
File masuk ke req.file.buffer (memory)
        ↓
Backend upload ke Supabase Storage bucket "images"
        ↓
Dapat public URL: https://xxx.supabase.co/storage/.../gallery/12345.jpg
        ↓
URL disimpan ke database table "gallery"
        ↓
Frontend load gambar dari URL Supabase
```

### Upload Flow (Members)

```
Admin upload foto member
        ↓
Upload ke Supabase Storage bucket "images/members/"
        ↓
URL disimpan ke table "members"
        ↓
Frontend load dari Supabase URL
```

---

## 📝 Update Kode yang Sudah Dilakukan

### 1. Gallery Controller (`galleryController.js`) ✅

- `createGallery()` - Upload ke Supabase Storage
- `updateGallery()` - Upload file baru, hapus file lama
- `deleteGallery()` - Hapus dari database & storage

### 2. Member Controller (`memberController.js`) ✅

- `createMember()` - Upload foto ke Supabase Storage

### 3. Upload Middleware (`uploadMiddleware.js`) ✅

- Diubah dari `diskStorage` ke `memoryStorage`
- File ada di `req.file.buffer` (tidak save ke disk)

---

## 🧪 Testing Upload Baru

### Test 1: Upload Gallery

1. Login sebagai admin
2. Buka menu **Gallery**
3. Klik **"Add New"**
4. Upload 1 gambar
5. **Cek console/network** - harus sukses
6. **Cek database Supabase** - table `gallery` ada row baru dengan URL Supabase
7. **Cek Storage Supabase** - folder `gallery/` ada file baru
8. **Refresh halaman gallery** - gambar muncul dari URL Supabase

### Test 2: Upload Member

1. Buka menu **Members**
2. Tambah member baru dengan foto
3. Cek Storage Supabase folder `members/`

### Test 3: Delete

1. Hapus 1 foto dari gallery
2. Cek Storage - file harus hilang
3. Cek database - row harus hilang

---

## ⚠️ Troubleshooting

### Error: "Upload failed: new row violates row-level security policy"

**Solusi**: Bucket policy belum diset. Ikuti langkah #4 di atas.

### Error: "The resource you requested could not be found"

**Solusi**: Bucket name salah. Pastikan bucket name di kode = `images`

### Error: "File not accessible"

**Solusi**: Bucket bukan public. Set bucket jadi **Public** di settings.

### Gambar tidak muncul di frontend

**Solusi**: 
1. Cek URL di database - harus `https://xxx.supabase.co/storage/...`
2. Cek bucket public = ON
3. Clear browser cache

---

## 🎯 Cara Migrasi Gambar Lama (Opsional)

Jika sudah ada gambar di folder lokal yang mau dipindah ke Supabase:

### Option 1: Manual Upload

1. Buka Supabase Dashboard > Storage > bucket `images`
2. Upload manual semua file dari `img/gallery/` dan `img/member/`
3. Update database table `gallery` dan `members` dengan URL baru

### Option 2: Script Migrasi (Advanced)

```javascript
// migrate-to-storage.js
const supabase = require('./backend/config/supabase');
const fs = require('fs');
const path = require('path');

async function migrateGallery() {
    const galleryDir = './img/gallery';
    const files = fs.readdirSync(galleryDir);
    
    for (const file of files) {
        const filePath = path.join(galleryDir, file);
        const fileBuffer = fs.readFileSync(filePath);
        
        // Upload to Supabase
        const { data, error } = await supabase.storage
            .from('images')
            .upload(`gallery/${file}`, fileBuffer);
        
        if (!error) {
            console.log(`✅ Uploaded: ${file}`);
            
            // Get public URL
            const { data: publicUrl } = supabase.storage
                .from('images')
                .getPublicUrl(`gallery/${file}`);
            
            // Update database
            await supabase
                .from('gallery')
                .update({ image_url: publicUrl.publicUrl })
                .eq('image_url', `img/gallery/${file}`);
        }
    }
}

migrateGallery();
```

---

## 📌 Checklist Sebelum Presentasi

- [ ] Bucket `images` sudah dibuat
- [ ] Bucket public = ON
- [ ] Policy "Public Access" sudah diset
- [ ] Folder `gallery/` dan `members/` sudah ada
- [ ] Test upload 1 gambar berhasil
- [ ] Test delete gambar berhasil
- [ ] Frontend bisa load gambar dari Supabase URL
- [ ] File lokal di `img/gallery/` sudah dihapus (kecuali placeholder)

---

## 🔗 Resource Links

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Storage Policies Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Upload Files Guide](https://supabase.com/docs/guides/storage/uploads/standard-uploads)

---

**Update terakhir**: 25 Januari 2026  
**Status**: ✅ Migration Complete

_File ini dibuat untuk memandu setup Supabase Storage agar upload tidak masuk ke file lokal._
