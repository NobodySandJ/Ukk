// File: backend/server.js
// Deskripsi: Server backend untuk menangani API, termasuk otentikasi,
// produk, dan integrasi dengan Midtrans.

const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const productData = require('../data.json'); 
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Validasi Environment Variables ---
const requiredEnv = [
    'MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY', 
    'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'
];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    console.error(`Kesalahan: Variabel lingkungan berikut belum diatur: ${missingEnv.join(', ')}`);
    process.exit(1);
}

// --- Inisialisasi Klien ---
// Midtrans Snap
const snap = new midtransClient.Snap({
    isProduction: false, // Ganti ke `true` saat production
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Token otentikasi tidak ditemukan." });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Token tidak valid atau kedaluwarsa." });
        }
        req.user = user;
        next();
    });
};

// --- Fungsi Helper ---
const getChekiStock = async () => {
    const { data, error } = await supabase
        .from('pengaturan')
        .select('nilai')
        .eq('nama', 'stok_cheki')
        .single();

    if (error || !data) {
        console.error("Gagal mendapatkan stok dari Supabase:", error);
        return 0; 
    }
    return parseInt(data.nilai, 10);
};

// ===================================
// --- ENDPOINTS ---
// ===================================

// Endpoint untuk Registrasi & Login (tidak diubah, tetap sama)
app.post("/api/register", async (req, res) => { /* ... kode registrasi Anda di sini ... */ });
app.post("/api/login", async (req, res) => { /* ... kode login Anda di sini ... */ });


// --- Endpoint Terkait Produk & Pembayaran ---

/**
 * [PUBLIC] Mengirimkan Midtrans Client Key ke frontend.
 * Diperlukan agar frontend bisa memuat Snap.js
 */
app.get("/api/midtrans-client-key", (req, res) => {
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
});

/**
 * [PUBLIC] Mengirimkan data produk dan sisa stok cheki.
 */
app.get("/api/products-and-stock", async (req, res) => {
    try {
        const responseData = JSON.parse(JSON.stringify(productData));
        const currentStock = await getChekiStock();
        responseData.cheki_stock = currentStock;
        res.json(responseData);
    } catch (e) {
        console.error("Gagal memuat data produk dan stok:", e.message);
        res.status(500).json({ message: "Tidak dapat memuat data produk." });
    }
});

/**
 * [PROTECTED] Membuat token transaksi Midtrans.
 * Endpoint ini memerlukan otentikasi.
 */
app.post("/get-snap-token", authenticateToken, async (req, res) => {
    try {
        const { transaction_details, item_details, customer_details } = req.body;

        if (!transaction_details || !item_details || !customer_details) {
            return res.status(400).json({ message: "Data pesanan tidak lengkap." });
        }

        // Validasi stok sebelum membuat transaksi
        const totalItemsInCart = item_details.reduce((sum, item) => sum + item.quantity, 0);
        const currentStock = await getChekiStock();
        if (totalItemsInCart > currentStock) {
            return res.status(400).json({ message: `Stok tidak mencukupi. Sisa stok: ${currentStock}` });
        }
        
        // Simpan data pesanan awal ke database (Supabase)
        const { error: insertError } = await supabase.from("pesanan").insert([{
            id_pesanan: transaction_details.order_id,
            total_harga: transaction_details.gross_amount,
            nama_pelanggan: req.user.username,
            email_pelanggan: customer_details.email,
            kontak_pelanggan: customer_details.phone,
            detail_item: item_details,
            id_pengguna: req.user.userId,
            status_tiket: "pending", // Status awal
        }]);

        if (insertError) throw insertError;

        // Siapkan parameter untuk Midtrans
        const nameParts = req.user.username.split(' ');
        const midtransParameter = {
          transaction_details,
          item_details,
          customer_details: {
            first_name: nameParts.shift(),
            last_name: nameParts.join(' ') || '.', // Midtrans butuh last_name
            email: customer_details.email,
            phone: customer_details.phone,
          },
        };
        
        // Buat transaksi di Midtrans
        const transaction = await snap.createTransaction(midtransParameter);
        res.json({ token: transaction.token });

    } catch (error) {
        console.error("GAGAL MEMBUAT TOKEN SNAP:", error);
        res.status(500).json({ message: "Gagal membuat token pembayaran.", error: error.message });
    }
});

/**
 * [PUBLIC/WEBHOOK] Menerima notifikasi dari Midtrans dan mengupdate status pesanan.
 * Endpoint ini dipanggil oleh Midtrans setelah pembayaran berhasil.
 */
app.post("/update-order-status", async (req, res) => {
    try {
        const { order_id, transaction_status } = req.body;
        if (!order_id || !transaction_status) {
            return res.status(400).json({ message: "Data notifikasi tidak lengkap." });
        }

        // Jika pembayaran sukses (settlement atau capture)
        if (transaction_status === "settlement" || transaction_status === "capture") {
            const { data: updatedOrder, error } = await supabase
                .from("pesanan")
                .update({ status_tiket: "berlaku" })
                .eq("id_pesanan", order_id)
                .select()
                .single();

            if (error) throw error;
            if (!updatedOrder) throw new Error("Pesanan tidak ditemukan untuk diupdate.");
            
            // Kurangi stok setelah pembayaran berhasil
            const totalItemsPurchased = updatedOrder.detail_item.reduce((sum, item) => sum + item.quantity, 0);
            if (totalItemsPurchased > 0) {
                const { error: stockError } = await supabase.rpc('update_cheki_stock', { change_value: -totalItemsPurchased });
                if (stockError) {
                    // Log error penting ini, karena bisa menyebabkan stok tidak sinkron
                    console.error(`PENTING: Gagal mengurangi stok untuk pesanan ${order_id}:`, stockError.message);
                }
            }
            res.status(200).json({ message: "Status tiket berhasil diupdate menjadi berlaku." });
        } else {
            // Untuk status lain (pending, expire, dll), kita hanya menerima notifikasinya
            // Anda bisa menambahkan logika lain di sini jika perlu
            res.status(200).json({ message: "Status pembayaran diterima." });
        }
    } catch (error) {
        console.error("Gagal mengupdate status pesanan:", error.message);
        res.status(500).json({ message: "Gagal memproses notifikasi pembayaran.", error: error.message });
    }
});

// Endpoint untuk riwayat pesanan (tidak diubah)
app.get("/api/my-orders", authenticateToken, async (req, res) => { /* ... kode Anda di sini ... */ });


// --- Server Listener ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = app;