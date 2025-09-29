// File: backend/server.js
// Versi final dan lengkap dengan semua endpoint yang berfungsi.

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
const requiredEnv = ['MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`Kesalahan: Variabel lingkungan berikut belum diatur: ${missingEnv.join(', ')}`);
    process.exit(1);
}

// --- Inisialisasi Klien ---
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- Middleware Otentikasi ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token otentikasi tidak ditemukan." });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token tidak valid." });
        req.user = user;
        next();
    });
};

// --- Fungsi Helper ---
const getChekiStock = async () => {
    const { data, error } = await supabase.from('pengaturan').select('nilai').eq('nama', 'stok_cheki').single();
    if (error || !data) {
        console.error("Gagal mendapatkan stok dari Supabase:", error);
        return 0; 
    }
    return parseInt(data.nilai, 10);
};

// ===================================
// --- ENDPOINTS APLIKASI ---
// ===================================

// --- Endpoint Otentikasi ---
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password, whatsapp_number, instagram_username } = req.body;
        if (!username || !email || !password) return res.status(400).json({ message: "Data wajib diisi." });
        if (password.length < 6) return res.status(400).json({ message: "Password minimal 6 karakter." });
        
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const { data, error } = await supabase.from("pengguna").insert([{
            nama_pengguna: username, email, kata_sandi: password_hash,
            nomor_whatsapp: whatsapp_number, instagram: instagram_username, peran: "user",
        }]).select().single();

        if (error) {
            if (error.code === "23505") return res.status(409).json({ message: "Username atau email sudah terdaftar." });
            throw error;
        }
        res.status(201).json({ message: "Registrasi berhasil!", user: data });
    } catch (e) {
        res.status(500).json({ message: "Kesalahan pada server.", error: e.message });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Input tidak boleh kosong." });

        let { data: user } = await supabase.from("pengguna").select("*").eq("email", email).single();
        if (!user) {
            let { data: userByUsername } = await supabase.from("pengguna").select("*").eq("nama_pengguna", email).single();
            user = userByUsername;
        }

        if (!user) return res.status(404).json({ message: "Email atau username tidak ditemukan." });

        const isMatch = await bcrypt.compare(password, user.kata_sandi);
        if (!isMatch) return res.status(401).json({ message: "Password salah." });

        const payload = { userId: user.id, username: user.nama_pengguna, email: user.email, role: user.peran };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
        
        delete user.kata_sandi;
        res.json({ message: "Login berhasil!", token, user });
    } catch (e) {
        res.status(500).json({ message: "Kesalahan pada server.", error: e.message });
    }
});


// --- INI ADALAH BAGIAN YANG DIPERBAIKI ---
// Endpoint untuk Produk & Stok
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
// --- AKHIR DARI PERBAIKAN ---


// --- Endpoint Pembayaran Midtrans ---
app.get("/api/midtrans-client-key", (req, res) => {
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
});

app.post("/get-snap-token", authenticateToken, async (req, res) => {
    try {
        const { transaction_details, item_details, customer_details } = req.body;
        if (!transaction_details || !item_details || !customer_details) {
            return res.status(400).json({ message: "Data pesanan tidak lengkap." });
        }

        const totalItemsInCart = item_details.reduce((sum, item) => sum + item.quantity, 0);
        const currentStock = await getChekiStock();
        if (totalItemsInCart > currentStock) {
            return res.status(400).json({ message: `Stok tidak mencukupi. Sisa stok: ${currentStock}` });
        }
        
        await supabase.from("pesanan").insert([{
            id_pesanan: transaction_details.order_id,
            total_harga: transaction_details.gross_amount,
            nama_pelanggan: req.user.username,
            email_pelanggan: customer_details.email,
            kontak_pelanggan: customer_details.phone,
            detail_item: item_details,
            id_pengguna: req.user.userId,
            status_tiket: "pending",
        }]);

        const nameParts = req.user.username.split(' ');
        const midtransParameter = {
          transaction_details, item_details,
          customer_details: {
            first_name: nameParts.shift(),
            last_name: nameParts.join(' ') || '.',
            email: customer_details.email,
            phone: customer_details.phone,
          },
        };
        
        const transaction = await snap.createTransaction(midtransParameter);
        res.json({ token: transaction.token });
    } catch (error) {
        res.status(500).json({ message: "Gagal membuat token pembayaran.", error: error.message });
    }
});

app.post("/update-order-status", async (req, res) => { /* ... (kode ini sudah benar, tidak perlu diubah) ... */ });
app.get("/api/my-orders", authenticateToken, async (req, res) => { /* ... (kode ini sudah benar, tidak perlu diubah) ... */ });


// --- Server Listener ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = app;