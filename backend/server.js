// File: backend/server.js
// Versi final dan lengkap dengan semua perbaikan.

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

// --- Middleware Otentikasi & Otorisasi ---
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

const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak. Hanya untuk admin." });
    }
    next();
};

// --- Fungsi Helper ---
const getChekiStock = async () => {
    const { data, error } = await supabase.from('pengaturan').select('nilai').eq('nama', 'stok_cheki').single();
    if (error || !data) {
        console.error("Gagal mendapatkan stok:", error);
        return 0; 
    }
    return parseInt(data.nilai, 10);
};

// ===================================
// --- ENDPOINTS ---
// ===================================

// --- Endpoint Otentikasi ---
app.post("/api/register", async (req, res) => {
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
        return res.status(500).json({ message: "Kesalahan server.", error: error.message });
    }
    res.status(201).json({ message: "Registrasi berhasil!", user: data });
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Input tidak boleh kosong." });

    const { data: user, error } = await supabase
        .from("pengguna")
        .select("*")
        .or(`email.eq.${email},nama_pengguna.eq.${email}`)
        .single();
    
    if (error || !user) return res.status(404).json({ message: "Email atau username tidak ditemukan." });

    const isMatch = await bcrypt.compare(password, user.kata_sandi);
    if (!isMatch) return res.status(401).json({ message: "Password salah." });

    const payload = { userId: user.id, username: user.nama_pengguna, email: user.email, role: user.peran };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
    
    delete user.kata_sandi;
    res.json({ message: "Login berhasil!", token, user });
});

// --- Endpoint Produk & Pembayaran ---
app.get("/api/products-and-stock", async (req, res) => {
    const responseData = JSON.parse(JSON.stringify(productData));
    responseData.cheki_stock = await getChekiStock();
    res.json(responseData);
});

app.post("/update-order-status", async (req, res) => {
    const { order_id, transaction_status } = req.body;
    if (!order_id || !transaction_status) return res.status(400).json({ message: "Data notifikasi tidak lengkap." });

    if (transaction_status === "settlement" || transaction_status === "capture") {
        const { data: updatedOrder, error } = await supabase
            .from("pesanan").update({ status_tiket: "berlaku" })
            .eq("id_pesanan", order_id).select().single();

        if (error || !updatedOrder) return res.status(500).json({ message: "Gagal update status pesanan." });
        
        const totalItems = updatedOrder.detail_item.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems > 0) {
            await supabase.rpc('update_cheki_stock', { change_value: -totalItems });
        }
    }
    res.status(200).json({ message: "Status pembayaran diterima." });
});

// --- Endpoint Pengguna ---
app.get("/api/my-orders", authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from("pesanan")
        .select("*").eq("id_pengguna", req.user.userId)
        .order("dibuat_pada", { ascending: false });
        
    if (error) return res.status(500).json({ message: "Gagal mengambil pesanan." });
    res.json(data);
});

// --- Endpoint Admin ---
app.get("/api/admin/stats", authenticateToken, authorizeAdmin, async (req, res) => {
    const { data, error } = await supabase.from('pesanan').select('total_harga, detail_item')
        .in('status_tiket', ['berlaku', 'sudah_dipakai']);
        
    if (error) return res.status(500).json({ message: 'Gagal mengambil statistik.' });

    let totalRevenue = 0, totalCheki = 0;
    const chekiPerMember = {};
    orders.forEach(o => {
        totalRevenue += o.total_harga;
        o.detail_item.forEach(item => {
            totalCheki += item.quantity;
            const member = item.name.replace('Cheki ', '');
            chekiPerMember[member] = (chekiPerMember[member] || 0) + item.quantity;
        });
    });
    res.json({ totalRevenue, totalCheki, chekiPerMember });
});

app.get("/api/admin/all-orders", authenticateToken, authorizeAdmin, async (req, res) => {
    const { data, error } = await supabase.from('pesanan').select('*')
        .neq('status_tiket', 'pending') // <-- PERUBAHAN: Tidak menampilkan tiket pending
        .order('dibuat_pada', { ascending: false });
    
    if (error) return res.status(500).json({ message: 'Gagal mengambil pesanan.' });
    res.json(data);
});

// PERBAIKAN: Endpoint untuk menggunakan tiket
app.post("/api/admin/update-ticket-status", authenticateToken, authorizeAdmin, async (req, res) => {
    const { order_id, new_status } = req.body;
    if (!order_id || !new_status) return res.status(400).json({ message: "Data tidak lengkap." });

    const { error } = await supabase.from('pesanan')
        .update({ status_tiket: new_status }).eq('id_pesanan', order_id);

    if (error) return res.status(500).json({ message: "Gagal update status tiket." });
    res.json({ message: `Status tiket untuk ${order_id} berhasil diubah menjadi ${new_status}.` });
});

// PERBAIKAN: Endpoint untuk manajemen stok
app.post('/api/admin/update-cheki-stock', authenticateToken, authorizeAdmin, async (req, res) => {
    const { changeValue } = req.body;
    if (typeof changeValue !== 'number') return res.status(400).json({ message: 'Nilai tidak valid.' });

    const { error } = await supabase.rpc('update_cheki_stock', { change_value: changeValue });
    if (error) return res.status(500).json({ message: `Gagal update stok: ${error.message}` });

    const newStock = await getChekiStock();
    res.json({ message: 'Stok berhasil diperbarui!', newStock });
});


// --- Server Listener ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));

module.exports = app;