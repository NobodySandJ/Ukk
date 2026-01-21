# 📂 Struktur Project - Refresh Breeze

Dokumen ini menjelaskan struktur folder dan file utama dalam aplikasi Refresh Breeze untuk membantu navigasi dan pengembangan.

## 🌳 Pohon Direktori (Directory Tree)

```
/ (Root)
├── index.html              # Halaman Utama (Landing Page)
├── data.json               # Data statis (member, berita) - Fallback jika API off
├── .env                    # Variabel Lingkungan (Rahasia)
├── README.md               # Dokumentasi Utama
│
├── backend/                # ⚙️ SERVER & API
│   ├── server.js           # Server Utama (Express.js, API Endpoints)
│   ├── package.json        # Dependensi Backend (Node Modules)
│   └── combined.log        # Log Server (Winston)
│
├── js/                     # 🧠 LOGIKA FRONTEND
│   ├── admin/
│   │   └── admin.js        # Logika Dashboard Admin
│   ├── public/
│   │   ├── cheki.js        # Logika Halaman Pembelian Cheki
│   │   ├── gallery.js      # Logika Halaman Galeri
│   │   └── leaderboard.js  # Logika Halaman Leaderboard
│   └── shared/
│       ├── auth.js         # Sistem Login/Register & JWT Handling
│       └── script.js       # Fungsi Umum (Slider, Toast, BasePath)
│
├── pages/                  # 📄 HALAMAN HTML TAMBAHAN
│   ├── admin/
│   │   └── dashboard.html  # Panel Admin
│   ├── public/
│   │   ├── cheki.html      # Halaman Beli Tiket
│   │   ├── gallery.html    # Halaman Galeri Foto
│   │   └── leaderboard.html# Halaman Klasemen Fans
│   └── user/
│       └── dashboard.html  # Halaman User (Riwayat Pesanan)
│
├── css/                    # 🎨 GAYA TAMPILAN
│   ├── style.css           # CSS Utama (Landing & Public)
│   └── admin.css           # CSS Khusus Admin Panel
│
└── img/                    # 🖼️ ASET GAMBAR
    ├── logo/               # Logo & Favicon
    ├── member/             # Foto Member JKT48
    └── hero/               # Gambar Slider Homepage
```

## 🔑 Penjelasan Komponen Utama

### 1. Backend (`/backend`)

Server dibangun menggunakan **Express.js** sebagai penyedia API (RESTful).

- **`server.js`**: Pintu masuk utama. Menangani rute API (`/api/...`), koneksi ke **Supabase**, dan integrasi **Midtrans**.
- Menggunakan **Single Entry Point**: Satu file server untuk lingkungan Lokal dan Produksi (Vercel) untuk konsistensi.

### 2. Frontend Logic (`/js`)

JavaScript dipisah berdasarkan peran untuk modularitas:

- **`shared/auth.js`**: Menangani otentikasi global. Mengecek apakah user login dan menyimpan token JWT di LocalStorage.
- **`public/cheki.js`**: Logika inti penjualan tiket. Menghitung total harga, stok, dan memanggil Snap Payment Midtrans.
- **`admin/admin.js`**: Kode kompleks untuk Dashboard Admin (CRUD Member, Statistik, Verifikasi Tiket).

### 3. Halaman (`/pages`)

Struktur HTML dipisah agar rapi:

- Halaman user biasa ada di `public/`.
- Halaman admin yang butuh proteksi ada di `admin/`.
- Halaman akun member ada di `user/`.

### 4. Database (Supabase)

Cloud database PostgreSQL yang menyimpan tabel:

- `pengguna`, `products`, `pesanan`, `order_items`, `pengaturan`.

---

_Dokumen ini dibuat untuk memenuhi standar dokumentasi industri (Standardization)._
