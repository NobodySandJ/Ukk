# 🍃 Refresh Breeze - Idol Fanbase Web App (UKK Project)

**Refresh Breeze** adalah aplikasi web modern untuk manajemen fanbase dan penjualan tiket (Cheki) Idol Group. Proyek ini dibangun untuk memenuhi standar Uji Kompetensi Keahlian (UKK) Rekayasa Perangkat Lunak menggunakan arsitektur MVC dengan integrasi Payment Gateway dan Cloud Database.

---

## 📋 Daftar Isi

- [Arsitektur Sistem](#-arsitektur-sistem)
- [Entity Relationship Diagram (ERD)](#-entity-relationship-diagram-erd)
- [Data Flow Diagram Level 2](#-data-flow-diagram-level-2)
- [Use Case Diagram](#-use-case-diagram)
- [Dokumentasi API Endpoints](#-dokumentasi-api-endpoints)
- [Struktur Folder](#-struktur-folder--cheat-sheet-file)
- [Fitur Unggulan](#-fitur-unggulan-nilai-plus-ukk)
- [Audit & Bug Report](#-audit--bug-report)
- [Cheat Sheet Presentasi](#-cheat-sheet-presentasi-jalan-pintas-demo)

---

## 🏗️ Arsitektur Sistem

### Tech Stack

```
Frontend: HTML5, CSS3, Vanilla JavaScript (ES6+)
Backend:  Node.js v18+, Express.js v4.19
Database: Supabase (PostgreSQL Cloud)
Payment:  Midtrans Payment Gateway (Sandbox)
Auth:     JWT (JSON Web Token) + Bcrypt
```

### Pola Desain

- **MVC Pattern**: Pemisahan Controller, Service Layer, dan Routes
- **RESTful API**: Endpoint terstruktur dengan HTTP Methods standar
- **Middleware**: Authentication, Validation, Error Handling, Rate Limiting
- **Security**: Helmet, CORS, Input Validation (Joi), Password Hashing

---

## 📊 Entity Relationship Diagram (ERD)

### Struktur Database (8 Tabel Utama)

```
┌─────────────────┐
│   pengguna      │ (Users/Accounts)
├─────────────────┤
│ PK id           │
│    nama_pengguna│
│    email        │
│    kata_sandi   │ ← Encrypted (Bcrypt)
│    peran        │ ← 'admin' / 'user'
│    oshi         │
│    nomor_whatsapp│
│    instagram    │
└─────────────────┘
        │
        │ 1:N (One user, many orders)
        ▼
┌─────────────────┐
│    pesanan      │ (Orders/Transactions)
├─────────────────┤
│ PK id_pesanan   │
│ FK id_pengguna  │ → pengguna(id)
│    nama_pelanggan│
│    total_harga  │
│    status_tiket │ ← 'pending' / 'berlaku' / 'sudah_dipakai'
│    detail_item  │ ← JSON Array
│    dibuat_pada  │
└─────────────────┘
        │
        │ 1:N (One order, many items)
        ▼
┌─────────────────┐
│  order_items    │ (Order Details)
├─────────────────┤
│ PK id           │
│ FK order_id     │ → pesanan(id_pesanan)
│ FK product_id   │ → products(id)
│    quantity     │
│    price_at_purchase│
│    subtotal     │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│    products     │ (Cheki Items)
├─────────────────┤
│ PK id           │
│    name         │ ← 'Cheki Aca', 'Cheki Sinta'
│    price        │
│ FK member_id    │ → members(id)
│    is_active    │
│    created_at   │
└─────────────────┘
        │
        │ N:1 (Many products per member)
        ▼
┌─────────────────┐
│    members      │ (Idol Members)
├─────────────────┤
│ PK id           │
│    name         │
│    role         │
│    image_url    │
│    details      │ ← JSONB {jiko, instagram}
│    member_type  │ ← 'group' / 'individual'
└─────────────────┘

┌─────────────────┐
│      news       │ (News/Articles)
├─────────────────┤
│ PK id           │
│    title        │
│    content      │
│    image_url    │
│    category     │
│    is_published │
│    created_at   │
└─────────────────┘

┌─────────────────┐
│     gallery     │ (Image Gallery)
├─────────────────┤
│ PK id           │
│    image_url    │
│    alt_text     │
│    category     │
│    is_active    │
│    display_order│
└─────────────────┘

┌─────────────────┐
│     events      │ (Future Events)
├─────────────────┤
│ PK id           │
│    nama         │
│    tanggal      │
│    lokasi       │
│    lineup       │
│    deskripsi    │
│    is_active    │
└─────────────────┘

┌─────────────────┐
│   pengaturan    │ (System Settings)
├─────────────────┤
│ PK id           │
│    nama         │ ← 'stok_cheki', 'harga_cheki'
│    nilai        │ ← Dynamic config values
└─────────────────┘
```

### Relasi Kunci

- **pengguna → pesanan**: One-to-Many (1 user bisa banyak order)
- **pesanan → order_items**: One-to-Many (1 order bisa banyak item)
- **products → order_items**: One-to-Many (1 produk bisa di banyak order)
- **members → products**: One-to-Many (1 member bisa punya banyak produk cheki)

---

## 🔄 Data Flow Diagram Level 2

### DFD Level 0 (Context Diagram)

```
┌──────────────┐
│     User     │───→ Login, Browse, Order ───→┐
└──────────────┘                               │
                                               ▼
┌──────────────┐                      ┌─────────────────┐
│    Admin     │───→ Manage Data ───→ │  Refresh Breeze │
└──────────────┘                      │      System     │
                                      └─────────────────┘
┌──────────────┐                               │
│   Midtrans   │◀───── Payment Webhook ────────┘
└──────────────┘
```

### DFD Level 1 (Proses Utama)

```
┌──────────────────────────────────────────────────────────────────┐
│                     REFRESH BREEZE SYSTEM                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐      ┌────────────┐      ┌────────────┐        │
│  │  1.0       │      │  2.0       │      │  3.0       │        │
│  │ Autentikasi│◀────▶│ Manajemen  │◀────▶│ Transaksi  │        │
│  │            │      │ Konten     │      │ & Payment  │        │
│  └────────────┘      └────────────┘      └────────────┘        │
│        │                    │                    │              │
│        ▼                    ▼                    ▼              │
│  [pengguna]        [members, news,         [pesanan,           │
│                     gallery, events]      order_items]         │
└──────────────────────────────────────────────────────────────────┘
```

### DFD Level 2 - Proses Login & Registrasi

```
User                                          Database
  │                                              │
  │──── 1. Input email & password ────→ [1.1 Validasi Input]
  │                                              │
  │                                       [1.2 Cek Email di DB]
  │                                              │
  │                                       SELECT * FROM pengguna
  │                                       WHERE email = ?
  │                                              │
  │                                       [1.3 Bandingkan Password]
  │                                       bcrypt.compare()
  │                                              │
  │◀─── 2. Generate JWT Token ─────────  [1.4 Create JWT]
  │    (Jika valid)                             │
  │                                              │
  │    Response: { token, user_data }           │
```

### DFD Level 2 - Proses Checkout & Payment

```
User              Backend                  Midtrans              Database
  │                  │                        │                     │
  │─1. Pilih Item──▶│                        │                     │
  │                  │                        │                     │
  │─2. Checkout────▶│                        │                     │
  │                  │──3. Cek Stok────────────────────────────────▶│
  │                  │                        │  SELECT nilai FROM  │
  │                  │                        │  pengaturan WHERE   │
  │                  │                        │  nama='stok_cheki'  │
  │                  │◀───────────────────────────────────────────│
  │                  │                        │                     │
  │                  │──4. Create Transaction─▶                     │
  │                  │   (Snap API)           │                     │
  │                  │◀─5. Snap Token─────────│                     │
  │                  │                        │                     │
  │                  │──6. Insert Order───────────────────────────▶│
  │                  │   (status: pending)    │  INSERT pesanan     │
  │◀─7. Token────────│                        │                     │
  │                  │                        │                     │
  │──8. Open Snap UI ───────────────────────▶│                     │
  │   (Payment)      │                        │                     │
  │                  │                        │                     │
  │                  │◀─9. Webhook Notif──────│                     │
  │                  │   (settlement)         │                     │
  │                  │                        │                     │
  │                  │──10. Update Status & Kurangi Stok──────────▶│
  │                  │                        │  UPDATE pesanan     │
  │                  │                        │  SET status='berlaku'│
  │                  │                        │  UPDATE pengaturan  │
  │                  │                        │  SET nilai=nilai-qty│
  │◀─11. Success─────│                        │                     │
```

---

## 👥 Use Case Diagram

### Aktor: User (Pengunjung/Member)

```
┌──────────────────────────────────────────────────┐
│              USER USE CASES                      │
├──────────────────────────────────────────────────┤
│  UC-01: Registrasi Akun                          │
│  UC-02: Login & Autentikasi                      │
│  UC-03: Lihat Galeri Member                      │
│  UC-04: Lihat Berita Terbaru                     │
│  UC-05: Browse Produk Cheki                      │
│  UC-06: Lihat Leaderboard (Top Fans)             │
│  UC-07: Checkout & Pilih Metode Bayar            │
│  UC-08: Bayar via QRIS/Virtual Account           │
│  UC-09: Lihat History Pesanan                    │
│  UC-10: Edit Profile & Ganti Password            │
│  UC-11: Reset Password (OTP)                     │
└──────────────────────────────────────────────────┘
```

### Aktor: Admin

```
┌──────────────────────────────────────────────────┐
│              ADMIN USE CASES                     │
├──────────────────────────────────────────────────┤
│  UC-A01: Login Admin                             │
│  UC-A02: Dashboard Statistik                     │
│         - Total Pendapatan                       │
│         - Jumlah User Terdaftar                  │
│         - Stok Tiket Tersedia                    │
│         - Grafik Penjualan per Member            │
│  UC-A03: CRUD Member Idol                        │
│         - Tambah/Edit/Hapus Member               │
│         - Upload Foto Member                     │
│  UC-A04: CRUD Berita                             │
│  UC-A05: CRUD Galeri                             │
│  UC-A06: Kelola Event Mendatang                  │
│  UC-A07: Kelola Stok Cheki Global                │
│  UC-A08: Lihat Semua Pesanan                     │
│  UC-A09: Hapus/Cancel Pesanan                    │
│  UC-A10: Generate OTP untuk User                 │
│  UC-A11: Update Harga Produk                     │
└──────────────────────────────────────────────────┘
```

### Use Case Detail: Proses Checkout (UC-07)

```
Nama: Checkout & Pembayaran Tiket Cheki
Aktor: User (Fans yang sudah login)
Precondition: User sudah login, stok tersedia
Postcondition: Order dibuat, pembayaran diproses

Main Flow:
1. User memilih produk cheki (misal: Cheki Aca, qty: 2)
2. System menampilkan keranjang & total harga
3. User klik tombol "Checkout"
4. System validasi stok di database
5. System request Snap Token ke Midtrans
6. System simpan order dengan status 'pending'
7. System tampilkan popup pembayaran Midtrans
8. User pilih metode (QRIS/VA/E-Wallet)
9. User melakukan pembayaran
10. Midtrans kirim webhook notifikasi ke system
11. System update status order jadi 'berlaku'
12. System kurangi stok otomatis
13. User melihat konfirmasi "Pembayaran Berhasil"

Alternative Flow (Stok Habis):
4a. Jika stok tidak cukup
    - System tampilkan error "Stok tidak mencukupi"
    - Proses checkout dibatalkan

Alternative Flow (Payment Failed):
9a. Jika pembayaran dibatalkan/expired
    - Order tetap pending di database
    - Admin bisa cleanup manual
```

---

## 🔌 Dokumentasi API Endpoints

### Base URL

```
Development: http://localhost:3000
Production:  https://your-domain.vercel.app
```

### Authentication

**Semua endpoint admin dan user-specific memerlukan JWT Token di header:**

```http
Authorization: Bearer <your_jwt_token>
```

---

### 🔐 Auth Endpoints (`/api`)

| Method | Endpoint                      | Auth Required | Deskripsi                          |
| :----- | :---------------------------- | :------------ | :--------------------------------- |
| POST   | `/api/register`               | ❌            | Registrasi user baru               |
| POST   | `/api/login`                  | ❌            | Login (returns JWT)                |
| POST   | `/api/verify-and-generate-otp`| ❌            | Request OTP untuk reset password   |
| POST   | `/api/reset-password-with-code`| ❌           | Reset password dengan OTP          |

**Request Body Example (Register):**

```json
{
  "username": "sultan_aca",
  "email": "sultan@example.com",
  "password": "SecurePass123",
  "whatsapp_number": "081234567890",
  "instagram_username": "@sultan_aca",
  "oshi": "Aca"
}
```

**Response Example (Login):**

```json
{
  "message": "Login berhasil!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "sultan_aca",
    "email": "sultan@example.com",
    "role": "user"
  }
}
```

---

### 🛒 Product & Public Data Endpoints

| Method | Endpoint                        | Auth Required | Deskripsi                               |
| :----- | :------------------------------ | :------------ | :-------------------------------------- |
| GET    | `/api/products-and-stock`       | ❌            | **Heavy Endpoint**: Products, Stock, News, Gallery |
| GET    | `/api/leaderboard`              | ❌            | Top 10 fans (global)                    |
| GET    | `/api/leaderboard-per-member?memberName=Aca` | ❌ | Top fans untuk member tertentu      |
| GET    | `/api/public/gallery`           | ❌            | Semua gambar galeri aktif               |
| GET    | `/api/public/members`           | ❌            | Daftar semua member idol                |
| GET    | `/api/public/next-event`        | ❌            | Event terdekat yang akan datang         |

**Response Example (`/api/products-and-stock`):**

```json
{
  "products": [
    {
      "id": "uuid-123",
      "name": "Cheki Aca",
      "price": 25000,
      "members": {
        "name": "Aca",
        "image_url": "/img/member/NEaca.webp"
      }
    }
  ],
  "stock": 10,
  "news": [...],
  "gallery": [...],
  "groupImage": "/img/member/group.webp"
}
```

---

### 👤 User Endpoints (`/api/user`)

| Method | Endpoint                   | Auth Required | Deskripsi                    |
| :----- | :------------------------- | :------------ | :--------------------------- |
| GET    | `/api/user/profile`        | ✅ User       | Ambil profile user login     |
| PUT    | `/api/user/profile`        | ✅ User       | Update profile & password    |

---

### 💳 Order & Payment Endpoints

| Method | Endpoint                       | Auth Required | Deskripsi                             |
| :----- | :----------------------------- | :------------ | :------------------------------------ |
| GET    | `/api/midtrans-client-key`     | ❌            | Public client key Midtrans            |
| POST   | `/get-snap-token`              | ✅ User       | **Critical**: Buat transaksi Midtrans |
| POST   | `/update-order-status`         | ❌            | Webhook dari Midtrans (Internal)      |
| GET    | `/api/my-orders`               | ✅ User       | History pesanan user login            |

**Request Body Example (`/get-snap-token`):**

```json
{
  "transaction_details": {
    "order_id": "ORDER-20260125-ABC123",
    "gross_amount": 50000
  },
  "item_details": [
    {
      "id": "prod-uuid",
      "name": "Cheki Aca",
      "price": 25000,
      "quantity": 2
    }
  ],
  "customer_details": {
    "first_name": "Sultan",
    "email": "sultan@example.com"
  }
}
```

---

### 🛡️ Admin Endpoints (`/api/admin`)

**Semua endpoint dibawah ini memerlukan role 'admin'**

#### Dashboard & Statistics

| Method | Endpoint                   | Deskripsi                                  |
| :----- | :------------------------- | :----------------------------------------- |
| GET    | `/api/admin/stats`         | Total revenue, total cheki, per-member     |
| GET    | `/api/admin/dashboard-stats`| Users, active orders, revenue, stock      |
| GET    | `/api/admin/monthly-stats` | Revenue bulan ini & persentase perubahan   |
| GET    | `/api/admin/all-users`     | Daftar semua user (non-admin)              |
| GET    | `/api/admin/all-orders`    | Semua pesanan di sistem                    |

#### Settings & Stock Management

| Method | Endpoint                         | Deskripsi                              |
| :----- | :------------------------------- | :------------------------------------- |
| GET    | `/api/admin/settings`            | Ambil semua pengaturan sistem          |
| PUT    | `/api/admin/settings`            | Update satu pengaturan                 |
| PUT    | `/api/admin/settings/bulk`       | Update banyak pengaturan sekaligus     |
| POST   | `/api/admin/set-cheki-stock`     | Set stok global (overwrite)            |
| POST   | `/api/admin/update-cheki-stock`  | Tambah/kurangi stok (increment)        |

#### Order Management

| Method | Endpoint                          | Deskripsi                           |
| :----- | :-------------------------------- | :---------------------------------- |
| POST   | `/api/admin/undo-ticket-status`   | Ubah status tiket kembali (rollback)|
| POST   | `/api/admin/cleanup-orders`       | Hapus order pending yang expired    |
| DELETE | `/api/admin/orders/:id`           | Hapus order tertentu                |
| POST   | `/api/admin/generate-reset-code`  | Generate OTP untuk user tertentu    |

#### Members CRUD

| Method | Endpoint                  | Deskripsi                                 |
| :----- | :------------------------ | :---------------------------------------- |
| GET    | `/api/admin/members`      | Semua member                              |
| GET    | `/api/admin/members/:id`  | Detail 1 member                           |
| POST   | `/api/admin/members`      | Tambah member (with image upload)         |
| PUT    | `/api/admin/members/:id`  | Update member (with image upload)         |
| DELETE | `/api/admin/members/:id`  | Hapus member                              |

#### News CRUD

| Method | Endpoint                | Deskripsi        |
| :----- | :---------------------- | :--------------- |
| GET    | `/api/admin/news`       | Semua berita     |
| GET    | `/api/admin/news/:id`   | Detail 1 berita  |
| POST   | `/api/admin/news`       | Tambah berita    |
| PUT    | `/api/admin/news/:id`   | Update berita    |
| DELETE | `/api/admin/news/:id`   | Hapus berita     |

#### Gallery CRUD

| Method | Endpoint                  | Deskripsi              |
| :----- | :------------------------ | :--------------------- |
| GET    | `/api/admin/gallery`      | Semua gambar gallery   |
| GET    | `/api/admin/gallery/:id`  | Detail 1 gambar        |
| POST   | `/api/admin/gallery`      | Upload gambar (multer) |
| PUT    | `/api/admin/gallery/:id`  | Update gambar          |
| DELETE | `/api/admin/gallery/:id`  | Hapus gambar           |

#### Events Management

| Method | Endpoint                  | Deskripsi             |
| :----- | :------------------------ | :-------------------- |
| GET    | `/api/admin/events`       | Semua event           |
| POST   | `/api/admin/events`       | Tambah event          |
| PUT    | `/api/admin/events/:id`   | Update event          |
| DELETE | `/api/admin/events/:id`   | Hapus event           |

---

## 📂 Struktur Folder & Cheat Sheet File

Pahami ini agar bisa menjelaskan "File ini gunanya apa?" kepada penguji.

### 1. Root & Frontend (`/`)

| File / Folder             | Kegunaan (Fungsi)                                                                                        |
| :------------------------ | :------------------------------------------------------------------------------------------------------- |
| **`index.html`**          | **Halaman Utama**. Landing page yang dilihat user pertama kali. Berisi slider, info member, dan berita.  |
| **`css/style.css`**       | **Baju User**. Mengatur warna, font, dan animasi untuk halaman publik agar terlihat "Keren".             |
| **`css/admin.css`**       | **Baju Admin**. Style khusus panel admin yang lebih bersih dan serius.                                   |
| **`js/shared/script.js`** | **Otak Global**. Mengambil data produk dari backend, mengatur toast notifikasi, slider, dan logika umum. |
| **`pages/auth/`**         | Folder berisi halaman Login, Register, dan Reset Password.                                               |
| **`pages/admin/`**        | Folder dashboard Admin. Hanya bisa diakses jika sudah login sebagai admin.                               |

### 2. Backend (`/backend`)

Ini adalah "Dapur" aplikasi. User tidak melihat ini, tapi sistem tidak jalan tanpanya.

| Folder             | File Penting         | Deskripsi Singkat untuk Penguji                                                                                    |
| :----------------- | :------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **`server.js`**    | -                    | **Jantung Aplikasi**. Menjalankan server, mengatur lalu lintas request (Router), dan keamanan dasar (Helmet/Cors). |
| **`config/`**      | `supabase.js`        | Koneksi ke Database (Gudang Data).                                                                                 |
|                    | `midtrans.js`        | Koneksi ke Payment Gateway (Mesin Kasir).                                                                          |
| **`controllers/`** | `authController.js`  | **Satpam**. Mengurus Login, Register, dan verifikasi password.                                                     |
|                    | `orderController.js` | **Kasir**. Menghitung belanjaan, cek stok, minta bayaran ke Midtrans.                                              |
|                    | `adminController.js` | **Manajer**. Mengambil data statistik, list user, dan hapus data.                                                  |
| **`routes/`**      | `authRoutes.js`      | **Papan Petunjuk**. Mengarahkan URL `/login` ke kontroller yang benar.                                             |
| **`services/`**    | `authService.js`     | **Tukang Masak**. Melakukan query berat ke database (misal: Simpan User Baru) agar Controller tetap bersih.        |
| **`utils/`**       | `otpStore.js`        | **Catatan Sementara**. Menyimpan kode OTP di memori RAM server.                                                    |

---

## 🌟 Fitur Unggulan (Nilai Plus UKK)

Jika ditanya "Bedanya apa sama web biasa?", jawab ini:

1.  **Payment Gateway Asli (Midtrans)**: Bukan cuma simulasi database, tapi connect ke API bank beneran (Sandbox). Buktinya ada QRIS/VA.
2.  **Keamanan Stok (Atomic)**: Kalau sisa tiket 1, dan ada 2 orang klik "Beli" barengan, sistem akan menolak salah satu request. Tidak akan minus.
3.  **Service Layer Pattern**: Kodingan backend rapi, tidak campur aduk. Logic Database dipisah dari Logic Website. (Tunjukkan folder `services/`).
4.  **Security**: Password di-enkripsi (Bcrypt) dan Website diproteksi dari serangan header (Helmet).
5.  **Rate Limiting**: Perlindungan dari spam request (max 100 req/15 menit per IP).
6.  **Logging System**: Semua error dan aktivitas terekam di `backend/combined.log`.
7.  **Demo Mode**: Sistem bisa jalan tanpa database untuk testing (fallback ke mock data).

---

## 🐛 Audit & Bug Report

### ✅ Yang Sudah Berfungsi Sempurna

- ✅ Sistem Auth (Register, Login, JWT)
- ✅ CRUD Members, News, Gallery (Full)
- ✅ Checkout & Payment Gateway (Midtrans Snap)
- ✅ Webhook Handling (Auto update status & stock)
- ✅ Dashboard Admin (Statistics & Reports)
- ✅ Leaderboard System
- ✅ Profile Management
- ✅ Stock Management (Global cheki stock)
- ✅ Events CRUD (Create, Read, Update, Delete)

### ⚠️ Minor Issues & Improvements

1. **OTP Storage (In-Memory)**
   - **Lokasi**: `backend/utils/otpStore.js`
   - **Issue**: OTP disimpan di RAM. Jika server restart, semua OTP hilang.
   - **Recommendation**: Pindah ke database atau Redis untuk production.

2. **Console.error di Frontend**
   - **Lokasi**: Multiple files di `js/**` (18 occurrences)
   - **Issue**: console.error untuk debugging.
   - **Recommendation**: Ganti dengan proper error handling UI untuk production.

3. **Inline SQL Query di Routes**
   - **Lokasi**: Beberapa raw query bisa dipindah
   - **Recommendation**: Pindahkan semua ke controller/service untuk konsistensi MVC.

### 🟢 Tidak Ada Bug Critical

Sistem sudah berjalan dengan baik. Tidak ada bug yang menghambat fungsi utama aplikasi.

### 🔴 Critical Items to Check Before Presentation

1. **Environment Variables**: Pastikan file `.env` ada dan terisi dengan benar:

```env
# Required Variables
PORT=3000
JWT_SECRET=your_super_secret_key_min_32_chars

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Midtrans
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_IS_PRODUCTION=false

# Production (Optional)
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

2. **Database Tables**: Pastikan 8 tabel sudah dibuat di Supabase:
   - pengguna, products, members, pesanan, order_items, pengaturan, news, gallery, events

3. **Initial Stock Setting**: Sebelum demo, set stok cheki:

```sql
INSERT INTO pengaturan (nama, nilai) 
VALUES ('stok_cheki', '10') 
ON CONFLICT (nama) DO UPDATE SET nilai = '10';
```

4. **Admin Account**: Pastikan ada user dengan role 'admin':

```sql
-- Password: admin123
INSERT INTO pengguna (nama_pengguna, email, kata_sandi, peran) 
VALUES ('admin', 'admin@refreshbreeze.com', '$2a$10$hashed_password', 'admin');
```

### 📝 Testing Checklist

- [ ] Server berjalan tanpa error (`node backend/server.js`)
- [ ] Login admin berhasil
- [ ] Dashboard admin menampilkan statistik
- [ ] User bisa registrasi & login
- [ ] Checkout menghasilkan Snap Token
- [ ] Webhook Midtrans update status order
- [ ] Stok berkurang setelah pembayaran sukses
- [ ] Leaderboard menampilkan data benar
- [ ] CRUD member/news/gallery berfungsi
- [ ] Upload gambar berhasil (multer)

---

## 🎓 Cheat Sheet Presentasi (Jalan Pintas Demo)

Ikuti langkah ini saat maju kedepan agar tidak grogi:

### Skenario Demo 1: User Flow (5 menit)

1.  **Buka Homepage** (`index.html`)
    - Tunjukkan slider otomatis
    - Scroll ke section "Member Kami" → Data dari database
    - Scroll ke "Berita Terbaru" → Data real-time

2.  **Klik "Cheki"** → Halaman produk
    - Tunjukkan stok real-time
    - Tambahkan 2 item ke keranjang
    - Klik "Checkout" (pastikan sudah login)

3.  **Proses Pembayaran**
    - Popup Midtrans muncul
    - Pilih metode "QRIS" atau "BCA Virtual Account"
    - **Bilang ke penguji**: "Ini simulasi sandbox Pak/Bu, saya akan bayar sekarang"
    - Gunakan simulator Midtrans untuk approve payment

4.  **Konfirmasi**
    - Kembali ke dashboard user
    - Klik "Riwayat Pesanan"
    - Tunjukkan status "Berlaku" (bukan pending)

### Skenario Demo 2: Admin Flow (5 menit)

1.  **Login Admin**
    - Logout dari user account
    - Login dengan admin credentials
    - Dashboard otomatis muncul

2.  **Tunjukkan Dashboard**
    - Total Revenue (Real-time dari database)
    - Jumlah User
    - Stok tersisa (Harus berkurang dari demo sebelumnya!)
    - Grafik penjualan per member

3.  **Kelola Stok**
    - Klik menu "Settings" atau "Event"
    - Ubah stok jadi **5**
    - Save

4.  **CRUD Demo (Pilih salah satu)**
    - **Tambah Member**: Upload foto, isi nama
    - **Edit News**: Ubah judul berita
    - **Hapus Gallery**: Delete 1 gambar

5.  **Lihat Order**
    - Menu "Pesanan"
    - Tunjukkan pesanan dari user tadi
    - Bisa delete jika perlu rollback

### Tips Presentasi

**Jika Penguji Tanya:**

| Pertanyaan                                | Jawaban Singkat                                                                                                    |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| "Kenapa pakai Supabase?"                  | "Karena gratis, PostgreSQL cloud, dan sudah ada auth built-in. Cocok untuk UKK."                                   |
| "Gimana cara handle stok kalau simultan?" | "Sistem cek stok sebelum create token. Kalau habis, request ditolak. Pengurangan stok atomic di database."         |
| "Midtrans ini real atau simulasi?"        | "Real API Pak/Bu, tapi mode sandbox. Artinya ga pakai uang beneran, tapi flow-nya sama persis kayak production."   |
| "Ada keamanannya?"                        | "Ada. Password di-hash pakai Bcrypt, JWT untuk token, Helmet untuk header security, dan rate limiting."            |
| "Kalau server mati gimana?"               | "OTP hilang karena di memory. Order yang pending tetap ada di DB. Admin bisa cleanup manual."                      |
| "Bedanya MVC dengan biasa?"               | "MVC itu Controller pisah, Service Layer pisah. Biar kode rapi, gampang maintain. Bukan campur jadi satu."         |

**Persiapan Malam Sebelum Presentasi:**

- [ ] Test semua fitur 1x1
- [ ] Hapus semua order dummy
- [ ] Set stok jadi **10**
- [ ] Screenshot dashboard (cadangan kalau demo gagal)
- [ ] Pastikan laptop ada koneksi internet (Midtrans & Supabase butuh internet)
- [ ] Charge laptop penuh
- [ ] Bookmark URL: `http://localhost:3000`, `http://localhost:3000/pages/admin`

---

## 🚀 Quick Start Guide

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Ukk

# Install dependencies
cd backend
npm install
cd ..

# Setup environment
cp .env.example .env
# Edit .env dengan kredensial Anda

# Start server
cd backend
node server.js
```

### Access Points

```
Homepage:       http://localhost:3000
Admin Panel:    http://localhost:3000/pages/admin
Cheki Store:    http://localhost:3000/pages/public/cheki.html
User Dashboard: http://localhost:3000/pages/user/dashboard.html
```

---

## 📊 Ringkasan Endpoint (Quick Reference)

### Public Access (No Auth)
- `POST /api/register` - Registrasi
- `POST /api/login` - Login
- `GET /api/products-and-stock` - Data produk & stok
- `GET /api/leaderboard` - Top fans global
- `GET /api/public/gallery` - Galeri gambar
- `GET /api/public/members` - Daftar member
- `GET /api/public/next-event` - Event terdekat

### User Access (JWT Required)
- `GET /api/user/profile` - Profile user
- `PUT /api/user/profile` - Update profile
- `GET /api/my-orders` - History pesanan
- `POST /get-snap-token` - Checkout payment

### Admin Access (JWT + Role Admin)
- `GET /api/admin/stats` - Statistik dashboard
- `GET /api/admin/all-users` - Semua user
- `GET /api/admin/all-orders` - Semua order
- `POST /api/admin/set-cheki-stock` - Set stok
- CRUD: `/api/admin/members`, `/api/admin/news`, `/api/admin/gallery`, `/api/admin/events`

---

**📌 Dokumentasi Versi**: 2.0 (January 2026)  
**👨‍💻 Developer**: Refresh Breeze Team  
**📧 Support**: [GitHub Issues](https://github.com/NobodySandJ/Ukk/issues)

_Dokumen ini disusun komprehensif untuk membantu kesiapan teknis & presentasi UKK project Refresh Breeze._
