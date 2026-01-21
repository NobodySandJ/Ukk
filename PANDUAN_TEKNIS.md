# 📘 Panduan Teknis & Cheat Sheet Pengembangan

**Project: Refresh Breeze (Architecture: MVC / Clean Code)**

Dokumen ini adalah referensi cepat (_cheat sheet_) untuk pengembang. Fokus pada efisiensi dan standar kode industri.

---

## 🚀 1. Perintah Penting (Cheat Sheet)

| Aksi               | Perintah                    | Keterangan                             |
| :----------------- | :-------------------------- | :------------------------------------- |
| **Jalanin Server** | `npm run dev`               | Mode development (auto-restart).       |
| **Jalanin (Prod)** | `npm start`                 | Mode produksi (stabil).                |
| **Cek Error**      | `tail -f backend/error.log` | Monitoring log error (Linux/Git Bash). |

---

## 🏗️ 2. Peta Logika (MVC Pattern)

Jangan bingung cari kode. Project ini sudah dirapikan dengan pola **Model-View-Controller**.

- **Mau ubah Tampilan?** 👉 `index.html` atau `pages/`.
- **Mau ubah Logika Pembelian?** 👉 `backend/controllers/orderController.js`.
- **Mau ubah Logika Admin?** 👉 `backend/controllers/adminController.js`.
- **Mau tambah Rute/URL baru?** 👉 `backend/routes/`.
- **Mau atur Database/Koneksi?** 👉 `backend/config/`.

---

## 🛠️ 3. Panduan Menambah Fitur ("How-To")

Jika Anda ingin menambah fitur baru, ikuti alur ini agar kode tetap bersih (_Clean Code_):

**Contoh: Menambah fitur "Komentar"**

1.  **Buat Controller** (`backend/controllers/commentController.js`):
    - Tulis fungsi logikanya (misal: `getComments`, `postComment`).
    - Pastikan logika database ada di sini, bukan di `server.js`.

2.  **Buat Route** (`backend/routes/commentRoutes.js`):
    - Hubungkan URL dengan fungsi di Controller.
    - Contoh: `router.post('/', commentController.postComment);`

3.  **Daftarkan di Server** (`backend/server.js`):
    - Tambahkan: `app.use('/api/comments', commentRoutes);`

---

## 🔑 4. Daftar API Utama (Backend Services)

Endpoint ini yang dipakai oleh Frontend (`js/`).

### 🔐 Otentikasi (`/api/auth`)

- `POST /register` - Daftar user baru.
- `POST /login` - Masuk & dapatkan Token (JWT).

### 🛍️ Produk & Stok (`/api`)

- `GET /products-and-stock` - Ambil data member JKT48 & stok global.
- `GET /leaderboard` - Klasemen fans terbanyak.

### 💳 Transaksi (`/`) - _Root Level_

- `POST /get-snap-token` - Minta token pembayaran ke Midtrans.
- `POST /update-order-status` - Webhook otomatis dari Midtrans (Cek lunas/belum).

### 👮 Admin (`/api/admin`) - _Butuh Token Admin_

- `GET /dashboard-stats` - Data ringkas untuk grafik.
- `POST /set-cheki-stock` - Tembak stok langsung (misal: jadi 100).
- `POST /undo-ticket-status` - Batalkan tiket yang kepencet "Pakai".

---

## 💡 5. Tips "Clean Code" di Project Ini

1.  **Variables Environment**: Jangan tulis password/API Key langsung di kodingan. Pakai `.env`.
2.  **Single Responsibility**: Satu file, satu tujuan. Jangan gabung logika payment dengan logika login.
3.  **Konsistensi**: Kalau pakai `async/await`, pakai terus. Jangan campur dengan `.then()`.
4.  **Validasi**: Selalu cek input dari user (misal: pastikan jumlah beli tidak minus).

---

_Dokumen ini dibuat untuk memudahkan pemeliharaan jangka panjang._
