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
