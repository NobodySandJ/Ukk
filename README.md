# Refresh Breeze - JKT48 Fanbase Web App (UKK Project)

**Refresh Breeze** adalah aplikasi web manajemen fanbase dan penjualan tiket (Cheki) untuk JKT48. Aplikasi ini dibangun sebagai proyek Uji Kompetensi Keahlian (UKK) dengan standar industri, mencakup fitur manajemen member, galeri, berita, dan sistem checkout tiket yang terintegrasi dengan Payment Gateway.

## 🚀 Fitur Utama

- **Public**:
  - Landing Page Modern & Responsif.
  - **Galeri Foto**: Filter berdasarkan Kategori (Member, Group, Event).
  - **Leaderboard**: Klasemen fans terbanyak membeli tiket (Top Spender).
  - **Pembelian Tiket (Cheki)**: Integrasi Midtrans (QRIS, GoPay, VA).
- **User**:
  - Dashboard Riwayat Pesanan.
  - Edit Profil.
- **Admin**:
  - Dashboard Statistik (Pendapatan, Stok, User).
  - Manajemen Member (CRUD).
  - Manajemen Galeri & Berita.
  - Pengaturan Global (Harga, Event).

## 🛠 Teknologi yang Digunakan

- **Frontend**: HTML5, CSS3 (Modern UI), Vanilla JavaScript.
- **Backend**: Node.js, Express.js.
- **Database**: Supabase (PostgreSQL).
- **Payment Gateway**: Midtrans (Sandbox/Production).
- **Authentication**: JWT (JSON Web Token) & Supabase Auth.

## 🗃️ Database Schema (Normalized)

Aplikasi ini menggunakan struktur database relasional (3NF) untuk integritas data yang tinggi:

1.  **`pengguna`**: Data user (login, profil).
2.  **`pesanan`**: Header transaksi (Total harga, Status pembayaran).
3.  **`order_items`**: Rincian belanja per item (Menyimpan snapshot harga saat transaksi).
4.  **`products`**: Manajemen stok dan harga produk dinamis (Member/Group Cheki).
5.  **`members`**: Data member JKT48 (terhubung ke Products & Gallery).
6.  **`gallery`**: Foto dokumentasi (terhubung ke Member).
7.  **`news`**: Artikel berita/pengumuman.
8.  **`pengaturan`**: Konfigurasi dinamis (Harga Default, Event Info).

## 📦 Cara Install & Menjalankan

### 1. Prasyarat

- Node.js (v16+)
- Akun Supabase & Midtrans.

### 2. Instalasi

```bash
# Clone repository
git clone https://github.com/username/ukk-refresh-breeze.git
cd ukk-refresh-breeze

# Install dependencies
cd backend
npm install
```

### 3. Konfigurasi Environment

Buat file `.env` di root folder dengan isi:

```env
# Server
PORT=3000
JWT_SECRET=rahasia_negara_api

# Supabase
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh... (Untuk Admin)

# Midtrans
MIDTRANS_SERVER_KEY=SB-Mid-server-...
MIDTRANS_CLIENT_KEY=SB-Mid-client-...
```

### 4. Setup Database

Jalankan script SQL `migration_v2_complex.sql` di Supabase SQL Editor untuk membuat tabel dan seeding data awal.

### 5. Menjalankan Server

```bash
# Mode Development
node backend/server-local.js

# Akses di browser: http://localhost:3000
```

<br>
<br>

---

# 🎓 CHEAT SHEET PRESENTASI UKK

(Dilarang dibaca Penguji! Ini contekan Anda)

## 1. Fitur Unggulan (Nilai Plus)

Jika ditanya "Apa kelebihan aplikasi kamu?", jawab poin-poin ini:

1.  **Integrasi Pembayaran Riil (Midtrans)**:
    - Bukan sekedar mencatat transaksi di database, tapi terhubung ke sistem perbankan simulasi.
    - Mendukung QRIS, GoPay, dan Virtual Account.
    - Menggunakan **Webhooks** untuk update status pembayaran otomatis (Server-to-Server communication).

2.  **Pencegahan "Race Condition" (Anti-Borong Curang)**:
    - Sistem memvalidasi stok stok secara _real-time_ di server sesaat sebelum token pembayaran dibuat.
    - Mencegah 2 orang membeli tiket terakhir secara bersamaan. (Logic di `server-local.js` baris ~460).

3.  **Keamanan Standar Industri**:
    - Password di-hash menggunakan **Bcrypt** (aman dari kebocoran database).
    - Login menggunakan **JWT (JSON Web Token)** untuk sesi stateless.
    - Proteksi **Rate Limiting** (Mencegah serangan spam/DDoS sederhana).
    - Proteksi Header HTTP menggunakan **Helmet**.

4.  **Fitur Gamifikasi (Leaderboard)**:
    - Menampilkan "Top Spender" (Sultan) per member (Oshi).
    - Menggunakan Query SQL Aggregation (`SUM(quantity)`) yang cukup kompleks.

---

## 2. Skenario Demo (Alur Presentasi)

Lakukan urutan ini agar demo berjalan mulus:

### A. Admin (Persiapan)

1.  Login Admin (`admin@admin.com` / `admin123`).
2.  Update Stok Cheki di menu **Event** (misal: set jadi 5).
3.  Klik "Simpan Harga".

### B. User (Transaksi)

1.  Buka browser dalam mode **Incognito** (agar sesi admin tidak tertimpa).
2.  Register user baru (misal: `penguji`).
3.  Login dan masuk halaman **Beli Cheki**.
4.  Checkout Tiket -> Pilih pembayaran BCA VA.
5.  **Simulasi Bayar**: Copy VA -> Klik link Simulator -> Paste -> Bayar.
6.  User akan otomatis redirect ke Dashboard dan melihat Tiket QR.

### C. Pembuktian

1.  Kembali ke Admin Panel.
2.  Tunjukkan stok berkurang otomatis (5 -> 4).
3.  Tunjukkan saldo pendapatan bertambah di Dashboard Admin.

---

## 3. Panduan Modifikasi Cepat (Jika Ditantang Penguji)

### Q: "Ubah Nama Aplikasinya jadi 'Toko Tiket Sekolah'!"

- **Lokasi**: File `index.html` (bagian Title & Navbar), dan `js/shared/script.js` (bagian config/toast).
- **Cara**: Ctrl+F "Refresh Breeze", ganti teksnya.

### Q: "Saya mau tiketnya lebih mahal, ubah harganya!"

- **Cara UI**: Login Admin -> Event Settings -> Ubah Harga -> Save.
- **Cara DB**: Buka Supabase -> Tabel `products` -> Edit kolom `price`.

### Q: "Ganti logo websitenya!"

- **Lokasi**: Folder `img/logo/`.
- **Cara**: Replace file `apple-touch-icon.png` atau `favicon.ico`.

### Q: "Pindahkan database ke Localhost (Offline)!"

- **Jawaban Diplomatis**: "Aplikasi ini didesain _Cloud-Native_ pakai Supabase agar fitur Realtime dan Storage gambar bisa jalan. Kalau pindah ke Localhost (XAMPP), fitur Upload Gambar dan Auth-nya harus ditulis ulang pak."
- **Solusi Cepat**: "Saya bisa ganti koneksi ke Project Supabase bapak kalau ada credential-nya."

---

## 4. Tanya Jawab Teknis (Q&A)

**Q: Jelaskan alur datanya!**
A: User Input -> Frontend Validasi -> API Request (JSON) -> Backend Validasi Token & Stok -> Insert Database -> Return Response.

**Q: Kenapa pakai Node.js?**
A: Karena _Non-blocking I/O_, jadi lebih cepat menangani banyak request sekaligus (cocok untuk war tiket) dibanding PHP biasa.

**Q: Apa fungsi file `.env`?**
A: Menyimpan rahasia (API Keys) agar tidak bisa dibaca orang lain jika source code bocor/di-upload ke GitHub.

**Q: Token Login (JWT) disimpan dimana?**
A: Disimpan di **LocalStorage** browser agar user tetap login meskipun halaman di-refresh.

---

_Dokumen ini diperbarui otomatis untuk persiapan UKK._
