# Refresh Breeze - JKT48 Fanbase Web App (UKK Project)

**Refresh Breeze** adalah aplikasi web manajemen fanbase dan penjualan tiket (Cheki) untuk JKT48. Aplikasi ini dibangun sebagai proyek Uji Kompetensi Keahlian (UKK) dengan standar industri, mencakup fitur manajemen member, galeri, berita, dan sistem checkout tiket yang terintegrasi dengan Payment Gateway (Midtrans).

---

## 📂 Struktur Folder Projek

Berikut adalah penjelasan lengkap struktur folder dan file dalam proyek ini:

```bash
ukk-refresh-breeze/
├── backend/                    # Server-side Logic (Node.js/Express)
│   ├── config/                 # Konfigurasi Database & Environment
│   │   ├── midtrans.js         # Setup Midtrans Snap API
│   │   └── supabase.js         # Koneksi ke Database Supabase
│   ├── controllers/            # Logika Utama (Menghubungkan Route & DB)
│   │   ├── adminController.js  # Logic Dashboard Admin, User Management
│   │   ├── authController.js   # Login, Register, Reset Password
│   │   └── orderController.js  # Transaksi, Callback Midtrans
│   ├── middleware/             # Fungsi Penengah (Security Check)
│   │   ├── authMiddleware.js   # Verifikasi Token JWT (Protect Routes)
│   │   └── validationMiddleware.js # Validasi Input Otomatis
│   ├── routes/                 # Definisi URL Endpoint API
│   │   ├── adminRoutes.js      # /api/admin/*
│   │   └── authRoutes.js       # /api/auth/*
│   ├── services/               # Business Logic Layer (Pemisah Logic DB)
│   │   └── authService.js      # Handle Query Register/Login
│   ├── utils/                  # Helper Functions
│   │   ├── demoMode.js         # Centralized Demo Logic
│   │   ├── otpStore.js         # In-Memory OTP Storage
│   │   └── stockUtils.js       # Helper Cek Stok Realtime
│   └── server.js               # Entry Point Server App
│
├── css/                        # Stylesheet Frontend
│   ├── admin.css               # Style Khusus Panel Admin (Clean UI)
│   └── style.css               # Style Utama Website (Public/User)
│
├── img/                        # Galeri Aset Gambar
│   ├── logo/                   # Favicon & Logo Brand
│   ├── member/                 # Foto Member JKT48
│   └── product/                # Foto Produk Cheki
│
├── js/                         # Client-side Scripting
│   ├── admin/                  # Logic Halaman Admin
│   ├── auth/                   # Logic Halaman Login/Register
│   ├── public/                 # Logic Halaman User
│   └── shared/                 # Script Global (Toast, Auth Check)
│
├── pages/                      # Halaman HTML (Views)
│   ├── admin/                  # Dashboard Admin
│   ├── auth/                   # Form Login/Register/Reset
│   └── public/                 # Halaman Cheki, Galeri, User Profile
│
├── index.html                  # Landing Page Utama
└── README.md                   # Dokumen Proyek Ini
```

---

## 📊 Analisis & Perancangan Sistem

Bagian ini disusun untuk kebutuhan Laporan UKK (Bab Analisis Perancangan).

### 1. Entity Relationship Diagram (ERD)

Sistem menggunakan database relasional yang ter-normalisasi (3NF).

- **`users` (pengguna)**: Menyimpan data akun (`id`, `email`, `password_hash`, `role`).
  - _Relasi_: One-to-Many ke `orders`.
- **`products`**: Menyimpan data tikat cheki (`id`, `name`, `price`, `stock`, `category`).
  - _Relasi_: One-to-Many ke `order_items`.
- **`orders` (pesanan)**: Header transaksi (`id`, `user_id`, `total_price`, `status`, `snap_token`).
  - _Relasi_: One-to-Many ke `order_items`.
- **`order_items`**: Detail belanja (`id`, `order_id`, `product_id`, `qty`, `price_at_purchase`).
- **`members`**: Data profil member JKT48 (`id`, `name`, `jiko`, `image_url`).
  - _Relasi_: Terhubung logic ke Products (nama member).

### 2. Data Flow Diagram (DFD)

#### **Level 0 (Context Diagram)**

- **Sistem**: Web Refresh Breeze.
- **Entitas Luar**:
  1.  **User (Fans)**: Memberikan data registrasi, order, pembayaran. Menerima tiket, info member.
  2.  **Admin**: Memberikan data produk, berita, update stok. Menerima laporan penjualan.
  3.  **Payment Gateway (Midtrans)**: Menerima request token pembayaran. Memberikan status sukses/gagal (Callback).

#### **Level 1 (Proses Utama)**

1.  **Proses 1.0 (Autentikasi)**: Mengelola Login/Register.
    - _Input_: Email/Pass. _Output_: Token JWT.
2.  **Proses 2.0 (Manajemen Data)**: Kelola Member & Produk (Admin Only).
    - _Input_: Data Baru. _Output_: Update DB.
3.  **Proses 3.0 (Transaksi)**: User melakukan checkout.
    - _Input_: Cart Item. _Output_: Snap Token Midtrans.
4.  **Proses 4.0 (Pembayaran)**: Verifikasi status bayar.
    - _Input_: Notifikasi Webhook. _Output_: Update Status 'LUNAS'.

#### **Level 2 (Detail Proses Transaksi)**

Akan memecah **Proses 3.0** menjadi lebih rinci:

- **3.1 Cek Stok**: Memastikan `qty` diminta <= `stock` tersedia di DB.
- **3.2 Hitung Total**: Mengkalkulasi `qty * price` dari semua item.
- **3.3 Buat Order Header**: Insert ke tabel `orders` (status: pending).
- **3.4 Buat Order Detail**: Insert ke tabel `order_items`.
- **3.5 Request Snap Token**: Kirim data ke API Midtrans -> Terima Token.

### 3. Use Case Diagram

| Aktor     | Use Case (Fitur)           | Deskripsi                                     |
| :-------- | :------------------------- | :-------------------------------------------- |
| **User**  | 1. Registrasi / Login      | Masuk ke sistem untuk transaksi.              |
|           | 2. Lihat Galeri & Member   | Melihat konten publik.                        |
|           | 3. Beli Tiket (Checkout)   | Memilih item dan melakukan pemesanan.         |
|           | 4. Bayar (Payment)         | Menyelesaikan pembayaran via Payment Gateway. |
|           | 5. Lihat Riwayat (History) | Melihat status pesanan di dashboard user.     |
| **Admin** | 6. Login Admin             | Masuk ke panel kontrol khusus.                |
|           | 7. Kelola Member           | Tambah/Edit/Hapus data member JKT48.          |
|           | 8. Kelola Stok & Harga     | Update harga tiket dan jumlah stok.           |
|           | 9. Lihat Laporan           | Melihat grafik pendapatan dan list user.      |

---

## 🛠 Teknologi

- **Frontend**: HTML5, CSS3 (Admin & Public terpisah), Vanilla JS.
- **Backend**: Node.js, Express.js (MVC Pattern).
- **Database**: Supabase (PostgreSQL).
- **Security**: Bcrypt (Hashing), JWT (Session), Helmet (HTTP Headers).

---

## 🎓 Cheat Sheet Presentasi (Demo Alur)

1.  **Buka Admin Panel**: Tunjukkan dashboard statistik dan menu member.
2.  **Setting Stok**: Di menu "Event", ubah stok jadi sedikit (misal: 3) untuk demo "Realtime Stock".
3.  **User Login**: Buka Incognito, login sebagai user biasa.
4.  **Transaksi**: Beli tiket, checkout, pilih "BCA Virtual Account".
5.  **Simulasi Bayar**: Gunakan Simulator Midtrans untuk membayar VA tersebut.
6.  **Verifikasi**: Tunukkan otomatis redirect ke halaman "Sukses", lalu cek di Admin Panel bahwa stok berkurang dan pendapatan naik.

---

_Dibuat untuk keperluan Uji Kompetensi Keahlian (UKK) Rekayasa Perangkat Lunak._
