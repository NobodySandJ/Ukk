# REFRESH BREEZE - Platform Fanbase & E-Commerce Idol Lokal

## 1. Orientasi Cepat (Cognitive Onboarding)

**Apa ini?**
Refresh Breeze adalah web aplikasi **e-commerce niche** yang dikhususkan untuk ekosistem fandom grup idola lokal ("Refresh Breeze" dari Tulungagung).

**Untuk siapa?**
Dibuat untuk **fans** yang ingin membeli tiket _Cheki_ (foto polaroid) dan mendukung member favorit (Oshi) mereka, serta untuk **admin/manajemen** yang butuh sistem penjualan tiket digital sederhana tanpa kerumitan platform marketplace umum.

**Kenapa proyek ini ada?**
Proyek ini memecahkan masalah: "Bagaimana cara fans membeli tiket event/cheki secara _online_, terpusat, dan gamified (sistem Oshi & Leaderboard), tanpa bergantung pada Google Form manual?"
Sekaligus sebagai artefak utama **Uji Kompetensi Keahlian (UKK)** Rekayasa Perangkat Lunak.

---

## 2. Masalah & Ruang Lingkup

### Masalah yang Diselesaikan (In-Scope)

- **Sentralisasi Transaksi**: Menggantikan sistem manual/chat untuk pembelian tiket Cheki dengan _checkout flow_ terintegrasi Payment Gateway (Midtrans).
- **Validasi Tiket**: Menghasilkan tiket digital dengan status (Pending/Berlaku/Sudah Dipakai) dan QR Code unik.
- **Gamifikasi Fandom**: Menghitung kontribusi fans dalam bentuk _Leaderboard_ (Global & Per-Member) berdasarkan jumlah pembelian.
- **Konten Statis Terkelola**: Profil member dan galeri kegiatan yang mudah di-update.

### Masalah yang TIDAK Diselesaikan (Out-of-Scope)

- **Logistik Fisik**: Tidak ada fitur input resi pengiriman atau hitung ongkir (asumsi: penukaran tiket dilakukan di _venue_).
- **Social Networking**: Tidak ada fitur komentar, like, atau forum diskusi antar user.
- **Multi-Tenancy**: Sistem ini _hardcoded_ untuk satu grup idola saja, bukan platform SaaS untuk banyak grup.
- **Keamanan Bank-Grade**: Token sesi dan validasi input cukup untuk standar UKK/Demo, namun belum memenuhi standar perbankan/enterpise (misal: belum ada 2FA).

---

## 3. Cara Menjalankan (Operasional)

Ikuti langkah ini untuk menjalankan server lokal.

### Prasyarat

- **Node.js** (v16.x ke atas).
- **Supabase Account**: Anda butuh URL dan Anon Key project Supabase.
- **Midtrans Account**: Mode Sandbox (Client Key & Server Key).

### Langkah Instalasi

1.  **Clone Repo**:
    ```bash
    git clone https://github.com/username/ukk-refresh-breeze.git
    cd ukk-refresh-breeze
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Environment Variables**:
    Buat file `.env` di root folder, isi dengan kredensial Anda:
    ```env
    PORT=3000
    MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
    MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_ANON_KEY=eyJxh...
    JWT_SECRET=rahasia_negara_api
    ```
4.  **Jalankan Server**:
    ```bash
    npm start
    ```
5.  **Akses**: Buka `http://localhost:3000`.

---

## 4. Arsitektur Tingkat Tinggi (Mental Model)

Sistem ini adalah aplikasi **Monolithic Hybrid** dengan pemisahan tanggung jawab data yang jelas:

1.  **Database Hibrida**:

    - **Supabase (PostgreSQL)**: Menyimpan data transaksional dan relasional yang "mahal" dan butuh konsistensi tinggi (User, Pesanan, Item Detail, Auth).
    - **JSON Files (`data.json`)**: Menyimpan data konten statis yang jarang berubah (Biodata Member, Teks "About Us", List Galeri).
    - _Kenapa dipisah?_ Agar konten website bisa diedit cepat lewat file tanpa menyentuh database SQL, sementara data uang/user tetap aman di database relasional.

2.  **Backend (Express.js Middleware)**:

    - Bertindak sebagai _orchestrator_. Frontend tidak menghubungi Supabase/Midtrans langsung. Semua request lewat API Gateway buatan sendiri (`/api/*`) di Express untuk keamanan kunci API.

3.  **Frontend (Vanilla Ecosystem)**:
    - Tanpa _build step_ (Webpack/Vite). HTML dirender statis, interaktivitas (Cart, Auth Check) ditangani oleh JavaScript native yang dimuat di browser.

---

## 5. Keputusan Penting (Design Decisions)

- **Mengapa Vanilla JS (Tanpa React/Vue)?**

  - _Keputusan_: Sengaja menghindari _complexity overhead_ dari framework modern.
  - _Tujuan_: Membuktikan pemahaman fundamental tentang DOM Manipulation, Fetch API, dan Event Handling murni. Serta memudahkan penilai/kolaborator menjalankan proyek tanpa `npm run build`.

- **Mengapa Supabase, bukan Local MySQL (XAMPP)?**

  - _Keputusan_: Menggunakan managed database cloud.
  - _Tujuan_: Agar proyek bisa di-deploy ke Vercel/Render tanpa pusing memikirkan database hosting. Juga memanfaatkan fitur Auth dan Realtime (opsional) dari Supabase.

- **Mengapa Midtrans Sandbox?**
  - _Keputusan_: Hanya simulasi pembayaran.
  - _Trade-off_: Tidak bisa untuk transaksi uang asli. QR code pembayaran hanya berlaku simulasi.

---

## 6. Status & Arah Proyek

**Status Saat Ini:** � **Stable Prototype**
Siap untuk didemokan dalam sidang UKK. Flow utama (Register -> Pilih Oshi -> Beli Cheki -> Bayar -> Tiket Terbit) berfungsi 100%.

**Roadmap Kasar:**

- [ ] **Fitur Lupa Password Otomatis**: Saat ini masih manual/semi-manual. Perlu integrasi SMTP (Nodemailer).
- [ ] **Admin Dashboard Real-time**: Menambahkan grafik penjualan live menggunakan Supabase Realtime subscriptions.
- [ ] **Stok Management V2**: Mencegah _race condition_ saat dua orang checkout tiket terakhir bersamaan.

---

## 7. Identitas Proyek

Ini adalah proyek **serius dalam lingkup akademik**.
Bukan sekadar "Hello World", tapi sebuah simulasi bisnis fandom yang fungsional. Standar kode dijaga agar rapi (indentasi konsisten, komentar jelas) dan struktur folder semantik (`/js/public`, `/js/admin`, `/js/user`).

---

_Dibuat oleh Tim Refresh Breeze. Jangan romantisasi kode, pahami logikanya._
