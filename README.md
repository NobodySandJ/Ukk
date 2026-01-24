# 🍃 Refresh Breeze - Idol Fanbase Web App (UKK Project)

**Refresh Breeze** adalah aplikasi web modern untuk manajemen fanbase dan penjualan tiket (Cheki) Idol Group. Proyek ini dibangun untuk memenuhi standar Uji Kompetensi Keahlian (UKK) Rekayasa Perangkat Lunak.

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

## 📊 Analisis Sistem (Bahan Laporan)

Gunakan diagram narasi ini untuk Bab Analisis & Perancangan Laporan.

### 1. Use Case Diagram (Siapa bisa ngapain aja?)

- **🧑‍💻 User (Fans)**:
  - **Registrasi & Login**: (Agar bisa belanja).
  - **Melihat Galeri/Member**: (Fitur informasi publik).
  - **Checkout Tiket Cheki**: (Memilih item, memasukkan keranjang).
  - **Melakukan Pembayaran**: (Transfer via VA/QRIS).
  - **Melihat History**: (Mengecek tiket yang sudah dibeli).

- **👮 Admin (Manajer)**:
  - **Kelola Data Member**: (Tambah/Edit/Hapus member JKT48/Idol).
  - **Kelola Stok**: (Mengubah jumlah tiket yang tersedia untuk mencegah overselling).
  - **Laporan Pendapatan**: (Melihat grafik uang masuk).

### 2. ERD (Hubungan Database)

- `users` **(1) ---- (N)** `orders`
  - _Baca_: Satu user bisa melakukan BANYAK order (transaksi).
- `orders` **(1) ---- (N)** `order_items`
  - _Baca_: Satu transaksi order bisa berisi BANYAK item (tiket).
- `products` **(1) ---- (N)** `order_items`
  - _Baca_: Satu produk (misal: Tiket A) bisa ada di BANYAK keranjang belanjaan orang.

### 3. DFD (Alur Data)

- **Input**: User masukkan Email & Password -> **Proses**: Sistem cek di Database -> **Output**: Token Akses (JWT) diberikan ke browser.
- **Input**: User Klik "Checkout" -> **Proses**: Sistem Hitung Total & Request ke Midtrans -> **Output**: Muncul Pop-up Pembayaran (Snap).

---

## � Fitur Unggulan (Nilai Plus UKK)

Jika ditanya "Bedanya apa sama web biasa?", jawab ini:

1.  **Payment Gateway Asli (Midtrans)**: Bukan cuma simulasi database, tapi connect ke API bank beneran (Sandbox). Buktinya ada QRIS/VA.
2.  **Keamanan Stok (Atomic)**: Kalau sisa tiket 1, dan ada 2 orang klik "Beli" barengan, sistem akan menolak salah satu request. Tidak akan minus.
3.  **Service Layer Pattern**: Kodingan backend rapi, tidak campur aduk. Logic Database dipisah dari Logic Website. (Tunjukkan folder `services/`).
4.  **Security**: Password di-enkripsi (Bcrypt) dan Website diproteksi dari serangan header (Helmet).

---

## 🎓 Cheat Sheet Presentasi (Jalan Pintas Demo)

Ikuti langkah ini saat maju kedepan agar tidak grogi:

1.  **Buka Dashboard Admin Dulu**: Tunjukkan grafik "Pendapatan".
2.  **Setting Stok**: Masuk menu "Event", set stok jadi **3**.
3.  **Buka Mode Incognito**: Login sebagai user biasa (biar sesi admin tidak logout).
4.  **Beli Tiket**: Lakukan checkout sampai muncul QRIS/VA.
5.  **Simulasi Bayar**: Bayar pakai Simulator (bilang ke penguji: "Saya simulasikan bayar sukses ya Pak").
6.  **Tunjukkan Hasil**:
    - Di User: Muncul "Status Lunas".
    - Di Admin: Stok berkurang jadi **2**.

---

_Dokumen ini disusun otomatis untuk membantu kesiapan teknis project Refresh Breeze._
