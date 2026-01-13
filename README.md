# 🌬️ Refresh Breeze - Official Website

> Website resmi grup idola **Refresh Breeze** dari Tulungagung, Jawa Timur. Platform e-commerce untuk pembelian tiket Cheki (foto polaroid bersama member) dengan sistem pembayaran digital terintegrasi.

---

## 📖 Tentang Website

Website ini adalah platform resmi untuk grup idola **Refresh Breeze (リフレッシュブリーズ)** yang menyediakan:

- 🎫 **Sistem Pemesanan Tiket Cheki** - Tiket untuk berfoto polaroid dengan member
- 👤 **Manajemen Akun Pengguna** - Registrasi, login, dan profil pengguna
- 💳 **Integrasi Pembayaran Midtrans** - Pembayaran digital yang aman
- 📊 **Admin Dashboard** - Manajemen pesanan, stok, dan pengguna
- 📱 **Responsive Design** - Tampilan optimal di semua perangkat

---

## 🛠️ Teknologi yang Digunakan

### Frontend

- **HTML5** - Struktur halaman web
- **CSS3** - Styling dan desain responsif
- **JavaScript (Vanilla)** - Interaktivitas dan logika frontend
- **Font Awesome** - Ikon
- **QRCode.js** - Generasi QR Code untuk tiket

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database PostgreSQL dan authentication
- **JWT (JSON Web Token)** - Autentikasi dan otorisasi
- **Bcrypt.js** - Enkripsi password
- **Midtrans** - Payment gateway
- **CORS** - Cross-Origin Resource Sharing
- **dotenv** - Environment variables management

---

## 📁 Struktur Folder

```
Ukk/
├── backend/                  # Backend server
│   ├── server.js            # Main server file
│   ├── package.json         # Dependencies backend
│   └── node_modules/        # Installed packages
│
├── css/                     # Stylesheets
│   ├── style.css           # Main styles
│   ├── modal.css           # Modal styles
│   └── admin.css           # Admin panel styles
│
├── js/                      # JavaScript files
│   ├── script.js           # Main script
│   ├── auth.js             # Authentication logic
│   ├── dashboard.js        # User dashboard
│   ├── cheki.js            # Cheki ordering
│   └── admin.js            # Admin panel
│
├── img/                     # Images and logos
│   ├── logo/               # Logo files
│   └── member/             # Member photos
│
├── index.html              # Homepage
├── cheki.html              # Cheki order page
├── dashboard.html          # User dashboard
├── admin.html              # Admin panel
├── edit-profile.html       # Profile edit page
├── gallery.html            # Photo gallery
├── sk.html                 # Terms & Conditions
├── forgot-password.html    # Password recovery
├── reset-password.html     # Password reset
├── data.json               # Static content data
└── vercel.json             # Vercel deployment config
```

---

## 🚀 Cara Kerja Website

### 1️⃣ **Alur Pengguna (User Flow)**

#### **A. Registrasi & Login**

1. User mengunjungi website dan melihat homepage dengan informasi grup
2. Klik tombol **Register** untuk membuat akun baru
3. Mengisi form registrasi:
   - Username
   - Email
   - Password
   - Nomor WhatsApp
   - Instagram (opsional)
   - Setuju dengan Syarat & Ketentuan
4. Data dikirim ke backend `/api/register`
5. Backend memvalidasi dan meng-hash password menggunakan **bcrypt**
6. Data disimpan ke database Supabase
7. User login dengan email/username dan password
8. Backend memverifikasi kredensial dan mengeluarkan **JWT token**
9. Token disimpan di `localStorage` untuk autentikasi selanjutnya

#### **B. Pemesanan Tiket Cheki**

1. User login dan mengakses halaman `cheki.html`
2. Sistem mengambil data member dan stok dari backend
3. User memilih member dan jumlah tiket yang diinginkan
4. Total harga dihitung secara real-time
5. User klik **"Lanjut ke Pembayaran"**
6. Request dikirim ke `/get-snap-token` dengan JWT authentication
7. Backend membuat transaksi baru di database dengan status `pending`
8. Backend memanggil **Midtrans Snap API** untuk membuat token pembayaran
9. Snap payment popup terbuka untuk user memilih metode pembayaran
10. User menyelesaikan pembayaran (transfer bank, e-wallet, dll)
11. Midtrans mengirim notifikasi ke endpoint `/update-order-status`
12. Backend update status pesanan menjadi `berlaku`
13. Stok cheki dikurangi secara otomatis
14. User diredirect ke dashboard dengan notifikasi sukses

#### **C. Dashboard User**

1. User melihat semua tiket yang telah dibeli
2. Tiket dengan status `berlaku` menampilkan **QR Code**
3. QR Code berisi:
   - ID Pesanan
   - Nama pelanggan
   - Item yang dibeli
4. Tiket yang sudah dipakai menampilkan label "SUDAH TERPAKAI"
5. User dapat mengedit profil melalui menu **Edit Profile**

---

### 2️⃣ **Alur Admin (Admin Flow)**

#### **A. Login Admin**

- Admin login menggunakan akun dengan role `admin`
- Redirect otomatis ke `admin.html`

#### **B. Dashboard Admin**

Menampilkan statistik:

- **Total Revenue** - Total pendapatan dari pesanan yang berlaku dan terpakai
- **Total Cheki Sold** - Jumlah total tiket terjual
- **Sales per Member** - Jumlah tiket per member

#### **C. Manajemen Stok**

- Melihat stok cheki saat ini
- Menambah atau mengurangi stok secara manual
- Stok tersimpan di tabel `pengaturan` dengan nama `stok_cheki`

#### **D. Manajemen Tiket**

- Melihat semua pesanan (kecuali yang pending)
- Filter/search pesanan berdasarkan ID atau nama
- Update status tiket:
  - `berlaku` → Tiket masih valid
  - `sudah_dipakai` → Tiket telah digunakan
  - `hangus` → Tiket expired

#### **E. Reset Password User**

- Admin dapat mereset password user yang lupa
- Password direset menjadi `password123` (default)
- User disarankan untuk mengubah password setelah login

---

### 3️⃣ **Arsitektur Backend**

#### **Authentication & Authorization**

```javascript
// Middleware authenticateToken
- Mengecek JWT token dari header Authorization
- Memverifikasi token dengan secret key
- Menyimpan user info di req.user

// Middleware authorizeAdmin
- Mengecek role user dari token
- Hanya mengizinkan akses jika role === 'admin'
```

#### **Database Schema (Supabase)**

**Tabel: pengguna**
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | Primary key |
| nama_pengguna | String | Username (unique) |
| email | String | Email (unique) |
| kata_sandi | String | Hashed password |
| nomor_whatsapp | String | Nomor WA |
| instagram | String | Username IG (optional) |
| peran | String | 'user' atau 'admin' |
| dibuat_pada | Timestamp | Waktu registrasi |

**Tabel: pesanan**
| Field | Type | Keterangan |
|-------|------|------------|
| id_pesanan | String | Order ID (unique) |
| id_pengguna | UUID | Foreign key ke pengguna |
| nama_pelanggan | String | Nama pembeli |
| total_harga | Integer | Total harga pesanan |
| status_tiket | String | 'pending', 'berlaku', 'sudah_dipakai', 'hangus' |
| detail_item | JSONB | Array item yang dibeli |
| dibuat_pada | Timestamp | Waktu pemesanan |

**Tabel: pengaturan**
| Field | Type | Keterangan |
|-------|------|------------|
| nama | String | Nama setting (e.g., 'stok_cheki') |
| nilai | String | Value setting |

#### **API Endpoints**

| Method | Endpoint                          | Auth     | Deskripsi                   |
| ------ | --------------------------------- | -------- | --------------------------- |
| GET    | `/api/midtrans-client-key`        | ❌       | Get Midtrans client key     |
| POST   | `/api/register`                   | ❌       | Register user baru          |
| POST   | `/api/login`                      | ❌       | Login user                  |
| GET    | `/api/products-and-stock`         | ❌       | Get data produk & stok      |
| POST   | `/get-snap-token`                 | ✅       | Buat token pembayaran       |
| POST   | `/update-order-status`            | ❌       | Update status dari Midtrans |
| GET    | `/api/user/profile`               | ✅       | Get profil user             |
| PUT    | `/api/user/profile`               | ✅       | Update profil user          |
| GET    | `/api/my-orders`                  | ✅       | Get pesanan user            |
| GET    | `/api/admin/stats`                | 🛡️ Admin | Get statistik admin         |
| GET    | `/api/admin/all-orders`           | 🛡️ Admin | Get semua pesanan           |
| POST   | `/api/admin/update-ticket-status` | 🛡️ Admin | Update status tiket         |
| POST   | `/api/admin/update-cheki-stock`   | 🛡️ Admin | Update stok cheki           |
| GET    | `/api/admin/all-users`            | 🛡️ Admin | Get semua user              |
| POST   | `/api/admin/reset-user-password`  | 🛡️ Admin | Reset password user         |

---

## ⚙️ Instalasi & Setup

### Prerequisites

- Node.js (v14 atau lebih baru)
- NPM atau Yarn
- Akun Supabase
- Akun Midtrans Sandbox/Production

### 1. Clone Repository

```bash
git clone <repository-url>
cd Ukk
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Setup Environment Variables

Buat file `.env` di folder `backend/`:

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Secret
JWT_SECRET=your_secret_key_here

# Server Port
PORT=3000
```

### 4. Setup Database Supabase

#### Buat Tabel `pengguna`:

```sql
CREATE TABLE pengguna (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_pengguna VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  kata_sandi VARCHAR(255) NOT NULL,
  nomor_whatsapp VARCHAR(20),
  instagram VARCHAR(100),
  peran VARCHAR(10) DEFAULT 'user',
  dibuat_pada TIMESTAMP DEFAULT NOW()
);
```

#### Buat Tabel `pesanan`:

```sql
CREATE TABLE pesanan (
  id_pesanan VARCHAR(100) PRIMARY KEY,
  id_pengguna UUID REFERENCES pengguna(id),
  nama_pelanggan VARCHAR(255),
  total_harga INTEGER NOT NULL,
  status_tiket VARCHAR(20) DEFAULT 'pending',
  detail_item JSONB,
  dibuat_pada TIMESTAMP DEFAULT NOW()
);
```

#### Buat Tabel `pengaturan`:

```sql
CREATE TABLE pengaturan (
  nama VARCHAR(50) PRIMARY KEY,
  nilai VARCHAR(100)
);

-- Insert default stock
INSERT INTO pengaturan (nama, nilai) VALUES ('stok_cheki', '100');
```

#### Buat Function untuk Update Stok:

```sql
CREATE OR REPLACE FUNCTION update_cheki_stock(change_value INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE pengaturan
  SET nilai = (CAST(nilai AS INTEGER) + change_value)::VARCHAR
  WHERE nama = 'stok_cheki';
END;
$$ LANGUAGE plpgsql;
```

### 5. Jalankan Server

```bash
cd backend
node server.js
```

Server akan berjalan di `http://localhost:3000`

### 6. Akses Website

Buka browser dan akses `http://localhost:3000` untuk melihat homepage.

---

## 🔐 Keamanan

✅ **Password Hashing** - Menggunakan bcrypt dengan salt rounds 10  
✅ **JWT Authentication** - Token expires dalam 1 hari  
✅ **CORS Protection** - Mengatur origin yang diizinkan  
✅ **Input Validation** - Validasi di frontend dan backend  
✅ **SQL Injection Protection** - Menggunakan parameterized queries Supabase  
✅ **Authorization Middleware** - Pemisahan akses user dan admin

---

## 🌐 Deployment

Website ini dapat di-deploy menggunakan **Vercel** (sudah ada `vercel.json`).

### Deploy ke Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

**Catatan:** Set semua environment variables di Vercel Dashboard sebelum deployment.

---

## 🎨 Fitur Halaman

| Halaman            | File                | Deskripsi                           |
| ------------------ | ------------------- | ----------------------------------- |
| **Homepage**       | `index.html`        | Slider hero, info member, news, FAQ |
| **Cheki Order**    | `cheki.html`        | Halaman pemesanan tiket             |
| **Dashboard User** | `dashboard.html`    | Riwayat tiket dengan QR code        |
| **Admin Panel**    | `admin.html`        | Manajemen pesanan, stok, dan user   |
| **Edit Profile**   | `edit-profile.html` | Update data profil user             |
| **Gallery**        | `gallery.html`      | Galeri foto member                  |
| **Terms**          | `sk.html`           | Syarat dan ketentuan                |

---

## 📞 Support & Contact

Untuk pertanyaan atau bantuan terkait website, silakan hubungi admin melalui:

- **Instagram:** [@refreshbreeze.official](https://instagram.com/refreshbreeze.official)
- **WhatsApp:** (lihat kontak di website)

---

## 📄 Lisensi

© 2025 Refresh Breeze. All Rights Reserved.

---

## 👨‍💻 Developer Notes

- Data member dan konten statis ada di `data.json`
- Gunakan Midtrans **Sandbox** untuk testing (bukan production)
- Stok cheki dapat diatur di admin panel
- Default password hasil reset oleh admin: `password123`
- JWT token disimpan di localStorage browser
- QR Code di-generate menggunakan library `qrcode.js`

---

**Built with ❤️ for Refresh Breeze**
