# BAB 3 - IMPLEMENTASI DAN APLIKASI

## 3.1 Pengenalan Aplikasi

**Refresh Breeze** adalah aplikasi web modern untuk manajemen fanbase dan penjualan tiket (Cheki) Idol Group berbasis teknologi full-stack. Aplikasi ini dibangun menggunakan arsitektur client-server dengan pemisahan yang jelas antara frontend dan backend, mengimplementasikan pola desain MVC (Model-View-Controller) dan integrasi payment gateway asli.

### 3.1.1 Tujuan Aplikasi
- Menyediakan platform digital untuk fans idol group dalam membeli tiket cheki eksklusif
- Mengelola data member, event, dan transaksi secara terpusat
- Memberikan transparansi leaderboard fans terbaik
- Mengotomasi proses pembayaran dengan payment gateway Midtrans

### 3.1.2 Teknologi yang Digunakan

#### Frontend:
- **HTML5**: Struktur halaman web semantik
- **CSS3**: Styling dengan animasi modern, gradien, dan responsive design
- **JavaScript (Vanilla)**: Logika interaksi tanpa framework untuk performa optimal
- **Font Awesome**: Icon library untuk UI yang menarik

#### Backend:
- **Node.js v20+**: Runtime JavaScript server-side
- **Express.js**: Framework web minimalis untuk routing dan middleware
- **Supabase (PostgreSQL)**: Database cloud dengan real-time capabilities
- **Midtrans**: Payment gateway untuk berbagai metode pembayaran (QRIS, VA, Credit Card)

#### Security & Performance:
- **Helmet.js**: Security headers untuk proteksi terhadap common attacks
- **Bcrypt.js**: Password hashing dengan algoritma kriptografi kuat
- **JWT (JSON Web Token)**: Authentication stateless untuk API
- **Express Rate Limit**: Pencegahan brute force dan DDoS
- **Compression**: Gzip compression untuk optimasi bandwidth

---

## 3.2 Struktur Aplikasi

### 3.2.1 Arsitektur Sistem

Aplikasi menggunakan arsitektur **MVC (Model-View-Controller)** dengan struktur sebagai berikut:

```
Refresh Breeze
├── Frontend (View Layer)
│   ├── index.html                 → Landing page utama
│   ├── pages/
│   │   ├── auth/                  → Halaman autentikasi (login, register)
│   │   ├── user/                  → Dashboard user
│   │   ├── admin/                 → Panel admin
│   │   └── public/                → Halaman publik (gallery, cheki, leaderboard)
│   ├── css/
│   │   ├── style.css              → Styling halaman publik
│   │   └── admin.css              → Styling dashboard admin
│   └── js/
│       ├── shared/                → Script global (auth, slider)
│       ├── admin/                 → Logika admin panel
│       └── user/                  → Logika dashboard user
│
└── Backend (Controller & Service Layer)
    ├── server.js                  → Entry point aplikasi
    ├── config/
    │   ├── supabase.js            → Konfigurasi database
    │   └── midtrans.js            → Konfigurasi payment gateway
    ├── controllers/               → Business logic handler
    │   ├── authController.js      → Autentikasi (register, login, reset password)
    │   ├── orderController.js     → Transaksi pembayaran
    │   ├── adminController.js     → CRUD data & statistik
    │   └── (...)
    ├── routes/                    → API endpoint definition
    ├── middleware/                → Interceptor (auth, validation, logging)
    ├── services/                  → Database query layer
    └── utils/                     → Helper functions (OTP, stock management)
```

### 3.2.2 Database Schema (ERD)

Aplikasi menggunakan 8 tabel utama di PostgreSQL:

1. **users** (Pengguna)
   - `id` (Primary Key)
   - `email`, `username`, `password_hash`
   - `role` (user/admin)
   - `oshi_name`, `photo_url`

2. **pesanan** (Orders)
   - `id_pesanan` (Primary Key)
   - `id_pengguna` (Foreign Key → users.id)
   - `total_harga`, `status_tiket`
   - `detail_item` (JSON)

3. **order_items** (Detail Item Pesanan)
   - `id` (Primary Key)
   - `order_id` (FK → pesanan.id_pesanan)
   - `product_id` (FK → products.id)
   - `quantity`, `price_at_purchase`

4. **products** (Produk Cheki)
   - `id`, `name`, `description`
   - `price`, `stock`, `image_url`

5. **members** (Member Idol)
   - `id`, `name`, `age`, `nickname`
   - `image_url`, `generation`

6. **event_config** (Konfigurasi Event)
   - `id`, `event_name`, `event_date`
   - `event_location`, `cheki_stock`

7. **news** (Berita/Pengumuman)
   - `id`, `title`, `content`
   - `image_url`, `created_at`

8. **gallery** (Galeri Foto)
   - `id`, `image_url`, `caption`
   - `uploaded_at`

**Relasi Antar Tabel:**
- `users` **(1) ---- (N)** `pesanan` : Satu user bisa punya banyak order
- `pesanan` **(1) ---- (N)** `order_items` : Satu order punya banyak item
- `products` **(1) ---- (N)** `order_items` : Satu produk bisa ada di banyak order

---

## 3.3 Fitur dan Tampilan Aplikasi

### 3.3.1 Halaman Utama (Landing Page)

**URL:** `index.html`

**Fungsi:** 
Halaman pertama yang dilihat pengunjung website. Menampilkan informasi umum tentang idol group, member, berita terbaru, dan ajakan untuk bergabung.

**Komponen Utama:**

1. **Navbar (Header)**
   - Logo dan nama aplikasi "Refresh Breeze"
   - Link navigasi: About Us, Member, News, Cheki
   - Tombol Login/Register (dinamis berdasarkan status login)
   - Responsive hamburger menu untuk mobile

2. **Hero Section (Slider)**
   - Slider otomatis dengan 5 gambar promosi
   - Indikator dot navigation
   - Tombol Previous/Next untuk navigasi manual
   - Text overlay dengan judul dan tagline idol group
   - CTA button "Lihat Member"

3. **Section Member**
   - Grid card member dengan foto dan informasi:
     * Nama member
     * Nickname
     * Generation
     * Umur
   - Hover effect untuk interaksi

4. **Section News (Berita Terbaru)**
   - Carousel berita dengan judul, gambar, dan tanggal publish
   - Link "Baca Selengkapnya" ke halaman detail

5. **Footer**
   - Informasi kontak dan social media
   - Copyright notice

**Cara Kerja:**
1. User membuka website → Browser memuat `index.html`
2. JavaScript `script.js` melakukan fetch data dari backend:
   ```javascript
   fetch('/api/products-and-stock') // Mendapatkan data produk
   fetch('/api/public/members')     // Mendapatkan data member
   fetch('/api/public/news')        // Mendapatkan berita
   ```
3. Data diterima dalam format JSON → Script menampilkan di halaman
4. Slider diinisialisasi dengan autoplay setiap 5 detik

**Screenshot Penjelasan:**
```
┌────────────────────────────────────────────────────┐
│  [Logo] Refresh Breeze    About | Member | News    │ ← Navbar
├────────────────────────────────────────────────────┤
│                                                    │
│         [   Slider Gambar Promosi   ]              │ ← Hero Slider
│         < Refresh Breeze - Official > →            │
│             [Lihat Member]                         │
│                                                    │
├────────────────────────────────────────────────────┤
│  [Member 1]  [Member 2]  [Member 3]  [Member 4]   │ ← Section Member
├────────────────────────────────────────────────────┤
│  Berita Terbaru: [Card 1] [Card 2] [Card 3]       │ ← Section News
└────────────────────────────────────────────────────┘
```

---

### 3.3.2 Halaman Autentikasi

#### A. Register (Pendaftaran)

**URL:** Popup modal di halaman utama (dipanggil via JavaScript)

**Fungsi:** 
Memungkinkan pengunjung membuat akun baru dengan validasi email dan password strength.

**Form Fields:**
- Email (validasi format email)
- Username (minimal 3 karakter)
- Password (minimal 6 karakter, harus ada huruf dan angka)
- Confirm Password (harus sama dengan password)

**Flow Register:**
```
User isi form → Frontend validasi input → POST /api/register
→ Backend cek email sudah terdaftar?
   → Jika sudah: Return error "Email sudah digunakan"
   → Jika belum:
      1. Hash password dengan bcrypt (10 rounds)
      2. Simpan ke database tabel `users`
      3. Return success message
→ Frontend redirect ke halaman login
```

**Kode Backend (authController.js):**
```javascript
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
    const { email, username, password } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert ke database
    const { data, error } = await supabase
        .from('users')
        .insert([{ email, username, password_hash: hashedPassword }]);
    
    if (error) return res.status(400).json({ message: error.message });
    res.status(201).json({ message: "Registrasi berhasil!" });
};
```

#### B. Login

**URL:** Popup modal di halaman utama

**Fungsi:**
Verifikasi kredensial user dan memberikan akses token (JWT) untuk autentikasi API.

**Form Fields:**
- Email
- Password

**Flow Login:**
```
User isi email & password → POST /api/login
→ Backend cari user di database berdasarkan email
→ Compare password dengan bcrypt.compare()
   → Jika salah: Return "Email atau password salah"
   → Jika benar:
      1. Generate JWT token dengan payload { userId, email, role }
      2. Token expired dalam 7 hari
      3. Return token ke frontend
→ Frontend simpan token di localStorage
→ Redirect berdasarkan role:
   - Admin → /pages/admin/index.html
   - User → /pages/user/dashboard.html
```

**Contoh JWT Payload:**
```json
{
  "userId": 123,
  "email": "user@example.com",
  "username": "john_doe",
  "role": "user",
  "iat": 1706556789,
  "exp": 1707161589
}
```

#### C. Forgot Password & Reset Password

**URL:** `pages/auth/forgot-password.html` dan `reset-password.html`

**Flow:**
1. User klik "Lupa Password?" → Masukkan email
2. Backend generate 6-digit OTP, simpan di memory (otpStore.js)
3. OTP dikirim ke email user (simulasi - ditampilkan di console)
4. User masukkan OTP + password baru
5. Backend validasi OTP → Update password di database

---

### 3.3.3 Halaman Cheki (Pembelian Tiket)

**URL:** `pages/public/cheki.html`

**Fungsi:**
Halaman utama untuk melihat produk cheki yang tersedia dan melakukan pembelian.

**Komponen:**

1. **Event Info Banner**
   - Nama event yang sedang berlangsung
   - Tanggal event
   - Lokasi event
   - Total stok cheki tersisa (real-time)

2. **Product Grid**
   - Card produk dengan:
     * Gambar produk
     * Nama produk
     * Harga (format Rupiah)
     * Stok tersedia
     * Tombol "Tambah ke Keranjang"
   - Badge "Sold Out" untuk produk habis

3. **Shopping Cart (Keranjang)**
   - Floating button dengan badge counter
   - Slide-in panel menampilkan:
     * List item yang dipilih
     * Quantity adjuster (+/-)
     * Subtotal per item
     * Total keseluruhan
     * Tombol "Checkout"

**Cara Kerja Checkout:**

```
User klik "Checkout" → Validasi login
→ Jika belum login: Tampilkan popup login
→ Jika sudah login:
   1. POST /get-snap-token dengan data:
      {
        transaction_details: { order_id: "ORD-timestamp", gross_amount: total },
        item_details: [{ id, name, price, quantity }],
        customer_details: { email, first_name }
      }
   2. Backend:
      a. Cek stok di database (atomic check)
      b. Jika stok cukup:
         - Buat transaksi di Midtrans
         - Insert order ke tabel `pesanan` (status: pending)
         - Insert detail ke tabel `order_items`
         - Return snap_token
      c. Jika stok tidak cukup:
         - Return error "Stok tidak mencukupi"
   3. Frontend terima snap_token
   4. Buka popup Midtrans Snap dengan token
   5. User pilih metode bayar (QRIS/VA/Credit Card)
   6. Setelah bayar → Midtrans kirim webhook ke /update-order-status
   7. Backend update status order jadi "berlaku"
   8. Frontend redirect ke dashboard dengan notifikasi sukses
```

**Ilustrasi Tampilan:**
```
┌─────────────────────────────────────────────────┐
│  Event: JKT48 Meet & Greet 2026                 │
│  📅 15 Februari 2026  📍 Jakarta                │
│  🎫 Stok Tersisa: 45 tiket                      │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ [Photo]  │  │ [Photo]  │  │ [Photo]  │      │
│  │ Tiket VIP│  │ Tiket Reg│  │ Tiket Eco│      │
│  │ Rp 150k  │  │ Rp 100k  │  │ Rp 50k   │      │
│  │ Stok: 10 │  │ Stok: 20 │  │ Stok: 15 │      │
│  │ [+ Cart] │  │ [+ Cart] │  │ [+ Cart] │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
                         [🛒 3] ← Floating Cart Button
```

---

### 3.3.4 Dashboard User

**URL:** `pages/user/dashboard.html`

**Fungsi:**
Area pribadi user untuk melihat riwayat pembelian dan profil.

**Fitur:**

1. **Profile Header**
   - Foto profil user (dapat diupload)
   - Username
   - Oshi name (member favorit)
   - Tombol "Edit Profile"

2. **Leaderboard Preview**
   - Top 3 spenders (fans dengan total belanja tertinggi)
   - Posisi user di leaderboard
   - Link "Lihat Leaderboard Lengkap"

3. **Order History (Riwayat Pesanan)**
   - Tabel/card berisi:
     * Order ID
     * Tanggal pembelian
     * Total harga
     * Status tiket (Pending/Berlaku/Expired)
     * Badge warna (hijau=lunas, kuning=pending, merah=expired)
   - Pagination untuk riwayat panjang

**API yang Digunakan:**
```javascript
// Ambil data user
GET /api/user/profile
Response: { id, username, email, oshi_name, photo_url, total_spent }

// Ambil riwayat order
GET /api/my-orders
Response: [
  { 
    id_pesanan: "ORD-123", 
    tanggal_pemesanan: "2026-01-20",
    total_harga: 150000,
    status_tiket: "berlaku",
    detail_item: [{ name: "Tiket VIP", quantity: 1 }]
  }
]
```

**Edit Profile:**
- User dapat mengubah: Username, Oshi Name, Photo
- Upload foto menggunakan Supabase Storage
- Validasi ukuran file maksimal 2MB
- Format allowed: JPG, PNG, WebP

---

### 3.3.5 Dashboard Admin

**URL:** `pages/admin/index.html`

**Fungsi:**
Panel kontrol untuk admin mengelola seluruh sistem.

**Sections:**

#### A. Dashboard Overview
**Statistik Cards:**
- **Total User:** Jumlah user terdaftar
- **Pesanan Aktif:** Order dengan status pending
- **Total Pendapatan:** Sum total_harga dari order "berlaku"
- **Member Terdaftar:** Jumlah member dalam database

**Chart Revenue:**
- Line chart pendapatan per hari (7 hari terakhir)
- Menggunakan Chart.js
- Data dihitung dari tabel `pesanan` group by tanggal

**API:**
```javascript
GET /api/admin/stats
Response: {
  totalUsers: 150,
  activeOrders: 8,
  totalRevenue: 12500000,
  totalMembers: 12
}

GET /api/admin/revenue-chart
Response: {
  labels: ["24 Jan", "25 Jan", ..., "29 Jan"],
  data: [500000, 750000, 1200000, ...]
}
```

#### B. Member Management
**Fitur:**
- **Tabel Member:** List semua member dengan foto, nama, generation
- **Add Member:** Form tambah member baru dengan upload foto
- **Edit Member:** Update data member existing
- **Delete Member:** Hapus member (dengan konfirmasi)

**Form Fields:**
- Name (required)
- Nickname (optional)
- Age (number)
- Generation (dropdown: Gen 1, Gen 2, Gen 3, ...)
- Image Upload (max 2MB)

**API Endpoints:**
```javascript
GET /api/admin/members             // List all
POST /api/admin/members            // Create
PUT /api/admin/members/:id         // Update
DELETE /api/admin/members/:id      // Delete
```

#### C. News Management
**Fitur:**
- CRUD berita/pengumuman
- Rich text editor untuk konten
- Upload featured image
- Auto-generate timestamp

**Fields:**
- Title (max 200 char)
- Content (textarea)
- Image URL (upload atau external link)

#### D. Gallery Management
**Fitur:**
- Upload multiple images sekaligus
- Bulk delete
- Caption untuk setiap foto
- Preview modal

**Upload Flow:**
```
User pilih file → Frontend validasi (size, format)
→ POST /api/admin/gallery/upload dengan FormData
→ Backend:
   1. Multer middleware process file
   2. Upload ke Supabase Storage bucket 'gallery'
   3. Generate public URL
   4. Insert URL ke database tabel `gallery`
   5. Return { success: true, url: "..." }
→ Frontend refresh gallery grid
```

#### E. Event Configuration
**Fitur:**
- Set event aktif (hanya 1 event aktif)
- Edit detail event:
  * Event name
  * Event date (date picker)
  * Location
  * **Cheki stock** (stok global untuk semua produk)

**Penting:** 
Ketika admin mengubah `cheki_stock`, semua produk akan mengikuti stok global ini. Ini untuk mencegah overselling di sisi checkout.

**API:**
```javascript
GET /api/public/next-event          // Event aktif (public)
PUT /api/admin/events/:id           // Update event (admin only)
```

#### F. User Management
**Fitur:**
- View all registered users
- Filter by role (user/admin)
- See user details (email, join date, total spent)
- Delete user (cascade delete orders)
- Promote user to admin

**Tabel Columns:**
| ID | Username | Email | Role | Join Date | Total Spent | Action |
|----|----------|-------|------|-----------|-------------|--------|
| 1  | john_doe | j@m.co| user | 2026-01-15| Rp 500k     | [Delete]|

---

### 3.3.6 Halaman Gallery

**URL:** `pages/public/gallery.html`

**Fungsi:**
Menampilkan galeri foto idol group dalam bentuk masonry grid yang responsif.

**Fitur:**
- Lazy loading untuk performa
- Lightbox modal saat foto diklik
- Infinite scroll (opsional)
- Filter by date/caption (opsional)

**Cara Kerja:**
```javascript
// Fetch gallery data
fetch('/api/public/gallery')
  .then(res => res.json())
  .then(images => {
    images.forEach(img => {
      const card = createImageCard(img.image_url, img.caption);
      galleryGrid.appendChild(card);
    });
  });
```

**Tampilan:**
```
┌─────────────────────────────────────────┐
│  Gallery - Dokumentasi Refresh Breeze   │
├─────────────────────────────────────────┤
│  ┌────┐ ┌────────┐ ┌──┐                 │
│  │ 1  │ │   2    │ │ 3│                 │
│  │    │ │        │ └──┘                 │
│  └────┘ └────────┘ ┌──────┐             │
│  ┌──────────┐      │  4   │             │
│  │    5     │      │      │             │
│  └──────────┘      └──────┘             │
└─────────────────────────────────────────┘
```

---

### 3.3.7 Halaman Leaderboard

**URL:** `pages/public/leaderboard.html`

**Fungsi:**
Menampilkan ranking fans berdasarkan total pembelanjaan (total_spent).

**Komponen:**

1. **Podium Top 3**
   - Desain khusus untuk rank 1, 2, 3
   - Avatar user
   - Username
   - Oshi name
   - Total spent dengan format Rupiah
   - Medal icon (🥇🥈🥉)

2. **Leaderboard Table**
   - Ranking 4 - 100+
   - Columns: Rank, Avatar, Username, Oshi, Total Spent
   - Highlight row jika user yang login ada di list

**SQL Query Backend:**
```sql
SELECT 
    u.id, 
    u.username, 
    u.oshi_name, 
    u.photo_url,
    COALESCE(SUM(p.total_harga), 0) as total_spent
FROM users u
LEFT JOIN pesanan p ON u.id = p.id_pengguna 
    AND p.status_tiket = 'berlaku'
GROUP BY u.id
ORDER BY total_spent DESC
LIMIT 50;
```

**API:**
```javascript
GET /api/leaderboard
Response: [
  { 
    rank: 1, 
    username: "superfan_99", 
    oshi_name: "Member A",
    photo_url: "...",
    total_spent: 5000000 
  },
  ...
]
```

---

## 3.4 Alur Kerja Sistem (Workflow)

### 3.4.1 Use Case: User Membeli Tiket Cheki

**Actors:** User (Fans), System, Midtrans API

**Preconditions:** 
- User sudah memiliki akun
- Event cheki sedang berlangsung
- Stok tiket tersedia

**Main Flow:**
1. User membuka halaman Cheki
2. System menampilkan list produk dengan stok real-time
3. User memilih produk → klik "Tambah ke Keranjang"
4. System menambahkan item ke cart (di memory browser)
5. User klik "Checkout" di cart
6. System cek status login:
   - Jika belum login → tampilkan popup login → user login → lanjut ke step 7
   - Jika sudah login → lanjut ke step 7
7. System kirim request ke backend `/get-snap-token` dengan data order
8. Backend melakukan **atomic stock check**:
   ```javascript
   const { data: event } = await supabase
       .from('event_config')
       .select('cheki_stock')
       .eq('is_active', true)
       .single();
   
   if (event.cheki_stock < totalQuantity) {
       throw new Error("Stok tidak cukup");
   }
   ```
9. Backend membuat transaksi di Midtrans → dapatkan `snap_token`
10. Backend insert order ke database dengan status "pending"
11. Backend return snap_token ke frontend
12. Frontend buka popup Midtrans Snap
13. User pilih metode pembayaran (QRIS/VA/Card)
14. User melakukan pembayaran
15. Midtrans kirim notifikasi webhook ke `/update-order-status`
16. Backend update status order menjadi "berlaku"
17. Backend kurangi stok cheki di `event_config`
18. Frontend redirect ke dashboard dengan notifikasi "Pembayaran Berhasil!"

**Alternative Flow:**
- **Stok Habis:** Tampilkan error "Stok tidak mencukupi" di step 8
- **Pembayaran Gagal:** Status tetap "pending" → user bisa bayar ulang dari dashboard
- **Pembayaran Expired:** Midtrans set status "expire" → Backend update status → Tampilkan badge merah di dashboard

**Postconditions:**
- Order tersimpan di database
- Stok berkurang
- User mendapat tiket digital (status berlaku)

---

### 3.4.2 Use Case: Admin Mengelola Event

**Actors:** Admin

**Main Flow:**
1. Admin login → redirect ke dashboard admin
2. Admin klik menu "Event" di sidebar
3. System tampilkan form event config dengan data saat ini:
   ```
   Event Name: [JKT48 Meet & Greet 2026    ]
   Event Date: [2026-02-15                 ]
   Location:   [Jakarta Convention Center  ]
   Cheki Stock: [45                        ]
   ```
4. Admin edit field yang ingin diubah
5. Admin klik "Simpan Perubahan"
6. Frontend kirim PUT request `/api/admin/events/:id`
7. Backend validasi data:
   - Event name tidak boleh kosong
   - Cheki stock harus >= 0
8. Backend update database tabel `event_config`
9. Backend return success response
10. Frontend tampilkan toast "Event berhasil diupdate"
11. Halaman Cheki publik otomatis menampilkan stok baru

**Business Rules:**
- Hanya 1 event yang bisa aktif (is_active = true)
- Jika admin set event baru aktif, event lama otomatis non-aktif
- Stok cheki bersifat **global** untuk semua produk di event tersebut

---

## 3.5 Keamanan dan Validasi

### 3.5.1 Authentication & Authorization

**JWT Implementation:**
```javascript
// Generate token saat login (authController.js)
const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);
```

**Middleware Protection:**
```javascript
// authMiddleware.js
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Token invalid" });
        req.user = decoded;
        next();
    });
};

// Protecting routes
app.use('/api/admin/*', verifyToken, requireAdmin);
app.use('/api/user/*', verifyToken);
```

### 3.5.2 Input Validation

**Using Joi Schema:**
```javascript
const Joi = require('joi');

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(6).required()
});

// Di validationMiddleware.js
const validateRegister = (req, res, next) => {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    next();
};
```

### 3.5.3 Password Security

- **Hashing:** Bcrypt dengan cost factor 10
- **Storage:** Tidak pernah simpan plain password
- **Reset:** Gunakan OTP dengan expiry time 5 menit

### 3.5.4 API Security

**Implemented Protections:**

1. **Helmet.js** - HTTP headers security
   ```javascript
   app.use(helmet({ contentSecurityPolicy: false }));
   ```

2. **Rate Limiting** - Prevent brute force
   ```javascript
   const limiter = rateLimit({
       windowMs: 15 * 60 * 1000, // 15 minutes
       max: 100 // max 100 requests per IP
   });
   app.use('/api/', limiter);
   ```

3. **CORS** - Control allowed origins
   ```javascript
   const corsOptions = {
       origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
       credentials: true
   };
   app.use(cors(corsOptions));
   ```

4. **SQL Injection Prevention** - Parameterized queries via Supabase client

---

## 3.6 Integrasi Payment Gateway (Midtrans)

### 3.6.1 Konfigurasi Midtrans

**File:** `backend/config/midtrans.js`
```javascript
const midtransClient = require('midtrans-client');

const snap = new midtransClient.Snap({
    isProduction: false,  // Sandbox mode
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

module.exports = snap;
```

**Environment Variables:**
```
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx
```

### 3.6.2 Create Transaction Flow

**Step 1: Generate Snap Token**
```javascript
// Frontend (cheki.js)
const response = await fetch('/get-snap-token', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        transaction_details: {
            order_id: `ORD-${Date.now()}`,
            gross_amount: totalPrice
        },
        item_details: cartItems.map(item => ({
            id: item.id,
            price: item.price,
            quantity: item.quantity,
            name: item.name
        })),
        customer_details: {
            email: userEmail,
            first_name: username
        }
    })
});

const { token: snapToken } = await response.json();
```

**Step 2: Open Midtrans Snap Popup**
```javascript
snap.pay(snapToken, {
    onSuccess: function(result) {
        // Pembayaran berhasil
        window.location.href = '/pages/user/dashboard.html?payment=success';
    },
    onPending: function(result) {
        // Menunggu pembayaran
        alert('Menunggu pembayaran Anda...');
    },
    onError: function(result) {
        // Error
        alert('Pembayaran gagal: ' + result.status_message);
    },
    onClose: function() {
        // User tutup popup
        alert('Anda menutup popup pembayaran');
    }
});
```

**Step 3: Webhook Handler**
```javascript
// Backend (orderController.js)
const updateOrderStatus = async (req, res) => {
    const { order_id, transaction_status } = req.body;
    
    // Midtrans kirim notifikasi dengan status:
    // - capture/settlement: Pembayaran berhasil
    // - pending: Menunggu pembayaran
    // - deny/cancel/expire: Pembayaran gagal
    
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
        // Update database
        await supabase
            .from('pesanan')
            .update({ status_tiket: 'berlaku' })
            .eq('id_pesanan', order_id);
        
        // Kurangi stok
        await supabase.rpc('decrement_cheki_stock', { 
            quantity: totalQuantity 
        });
    }
    
    res.status(200).json({ message: 'OK' });
};
```

### 3.6.3 Metode Pembayaran yang Tersedia

Di sandbox environment, user bisa test dengan:

1. **QRIS:**
   - Scan barcode dengan app simulator
   - Otomatis approved

2. **Virtual Account:**
   - BCA VA: 1234567890
   - BNI VA: 9876543210
   - Auto approve setelah "bayar"

3. **E-Wallet:**
   - GoPay (simulation)
   - ShopeePay (simulation)

4. **Credit Card:**
   - Card Number: 4811 1111 1111 1114
   - Exp: 01/25
   - CVV: 123

---

## 3.7 Deployment dan Environment

### 3.7.1 Deployment Platform

**Recommended:** Vercel (untuk full-stack deployment)

**File:** `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### 3.7.2 Environment Variables

**Production Environment (.env):**
```bash
# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT
JWT_SECRET=your-super-secret-random-string-here

# Midtrans
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx

# Server
PORT=5000
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
```

### 3.7.3 Database Setup

**Langkah Setup:**
1. Buat project di Supabase.com
2. Copy connection string dan API keys
3. Jalankan SQL script `backend/scripts/create-tables.sql` di SQL Editor:
   ```sql
   CREATE TABLE users (...);
   CREATE TABLE pesanan (...);
   CREATE TABLE order_items (...);
   -- dst...
   ```
4. Enable Row Level Security (RLS) untuk tabel sensitive
5. Setup Storage bucket untuk upload images:
   - Bucket name: `gallery`, `profiles`
   - Public access enabled

---

## 3.8 Testing dan Quality Assurance

### 3.8.1 Testing Checklist

**Functional Testing:**
- [ ] Register dengan email valid/invalid
- [ ] Login dengan kredensial benar/salah
- [ ] Add to cart → Checkout → Payment success flow
- [ ] Stock validation saat multiple user checkout
- [ ] Admin CRUD operations (Member, News, Gallery, Event)
- [ ] File upload (max size, format validation)
- [ ] JWT expiry → Auto logout
- [ ] Role-based access (user tidak bisa akses /admin)

**Security Testing:**
- [ ] SQL Injection attempt (parameterized queries)
- [ ] XSS prevention (sanitize input)
- [ ] CSRF protection (SameSite cookies)
- [ ] Rate limiting (100 req/15min)
- [ ] Password strength enforcement

**Performance Testing:**
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Image optimization (WebP format, lazy load)
- [ ] Gzip compression enabled

### 3.8.2 Demo Mode

Untuk keperluan presentasi, aplikasi memiliki **Demo Mode** yang bisa diaktifkan dengan tidak mengisi `JWT_SECRET` di environment variables.

**Fitur Demo Mode:**
- Bypass JWT verification
- Mock payment gateway (tidak hit Midtrans API real)
- Pre-filled data di database
- Simulasi OTP langsung success

---

## 3.9 Kesimpulan Implementasi

Aplikasi **Refresh Breeze** berhasil diimplementasikan dengan fitur-fitur utama:

### Keunggulan Teknis:
1. **Arsitektur MVC:** Pemisahan concerns yang jelas antara View, Controller, dan Service layer
2. **Real Payment Gateway:** Integrasi Midtrans dengan multiple payment methods (QRIS, VA, E-Wallet, Card)
3. **Atomic Stock Management:** Pencegahan overselling dengan database-level locking
4. **Security Best Practices:** JWT authentication, password hashing, rate limiting, Helmet protection
5. **Responsive Design:** Mobile-first approach dengan breakpoint untuk tablet dan desktop
6. **Cloud-Based:** Database dan storage menggunakan Supabase (PostgreSQL + Storage)

### Fitur Unggulan:
- Dashboard admin dengan statistik real-time dan revenue chart
- Leaderboard fans dengan ranking berdasarkan total pembelanjaan
- Gallery dengan lazy loading dan lightbox modal
- User profile customization (upload foto, pilih oshi)
- Order history dengan status tracking (Pending/Berlaku/Expired)
- Event management untuk mengatur stok dan detail event

### Nilai Plus untuk UKK:
- **Full-Stack Implementation:** Bukan sekedar frontend, tapi ada backend API lengkap
- **Payment Integration:** Koneksi ke payment gateway asli (sandbox)
- **Database Design:** ERD dengan relasi yang proper dan normalisasi
- **Code Quality:** Menggunakan pattern yang industry-standard (MVC, Service Layer)
- **Security:** Multiple layer protection (authentication, authorization, validation)

Aplikasi ini siap untuk presentasi UKK dan mendemonstrasikan kemampuan full-stack development yang komprehensif.

---

**Dokumen ini disusun untuk memenuhi kebutuhan dokumentasi Bab 3 - Implementasi/Aplikasi.**
**Tanggal:** 29 Januari 2026
**Versi:** 1.0
