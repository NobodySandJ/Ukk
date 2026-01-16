// ================================================================
// FILE: server-local.js - Server Development Lokal
// Melayani file static dan API endpoints
// ================================================================

const express = require("express");
const path = require("path");
const midtransClient = require("midtrans-client");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: require('path').join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Data produk dari data.json
const productData = require('../data.json');

// ============================================================
// VALIDASI ENVIRONMENT VARIABLES
// Jika tidak ada .env, server berjalan dalam Demo Mode
// ============================================================
const requiredEnv = ['MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    console.warn(`\n⚠️  Running in DEMO MODE. Missing env vars: ${missingEnv.join(', ')}`);
    console.warn(`   Create .env in root for full functionality.\n`);
}

// ============================================================
// INISIALISASI CLIENT (Midtrans & Supabase)
// ============================================================
let snap = null;
let supabase = null;
const isDemoMode = missingEnv.length > 0;

if (!isDemoMode) {
    snap = new midtransClient.Snap({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// ============================================================
// MIDDLEWARE: AUTENTIKASI & OTORISASI
// Verifikasi JWT token untuk route yang dilindungi
// ============================================================
const authenticateToken = (req, res, next) => {
    if (isDemoMode) {
        // Mock user untuk demo
        req.user = { userId: 1, username: 'demo_user', email: 'demo@example.com', role: 'user' };
        return next();
    }

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
    if (isDemoMode) return next();
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak. Hanya untuk admin." });
    }
    next();
};

// Helper: Ambil stok realtime dari Supabase
const getChekiStock = async () => {
    if (isDemoMode) return 100;

    const { data, error } = await supabase.from('pengaturan').select('nilai').eq('nama', 'stok_cheki').single();
    if (error || !data) return 0;
    return parseInt(data.nilai, 10);
};

// Serve Static Files dari folder parent
app.use(express.static(path.join(__dirname, '..')));

// ============================================================
// API ENDPOINTS
// ============================================================

// Endpoint: Dapatkan Midtrans Client Key
app.get("/api/midtrans-client-key", (req, res) => {
    if (isDemoMode) return res.json({ clientKey: 'demo_client_key' });
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
});

// ============================================================
// ENDPOINT AUTENTIKASI
// ============================================================

// Endpoint: Register User Baru
app.post("/api/register", async (req, res) => {
    if (isDemoMode) {
        return res.status(201).json({
            message: "Registrasi berhasil! (Demo Mode)",
            user: { id: 1, nama_pengguna: req.body.username, email: req.body.email }
        });
    }

    try {
        const { username, email, password, whatsapp_number, instagram_username, oshi } = req.body;

        // Validasi input
        if (!username || !email || !password || !whatsapp_number) {
            return res.status(400).json({ message: "Data wajib diisi (Username, Email, Password, WA)." });
        }
        if (password.length < 6) return res.status(400).json({ message: "Password minimal 6 karakter." });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert ke database
        const { data, error } = await supabase.from("pengguna").insert([{
            nama_pengguna: username,
            email,
            kata_sandi: password_hash,
            nomor_whatsapp: whatsapp_number,
            instagram: instagram_username || null,
            oshi: oshi || 'All Member',
            peran: "user",
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

// Endpoint: Login User
app.post("/api/login", async (req, res) => {
    if (isDemoMode) {
        const demoToken = jwt.sign(
            { userId: 1, username: 'demo_user', email: req.body.email, role: 'user', oshi: 'Aca' },
            'demo_secret', { expiresIn: '1d' }
        );
        return res.json({
            message: "Login berhasil! (Demo Mode)",
            token: demoToken,
            user: { id: 1, nama_pengguna: 'demo_user', email: req.body.email, peran: 'user', oshi: 'Aca' }
        });
    }

    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Input tidak boleh kosong." });

        // Cari user berdasarkan email atau username
        const { data: user, error } = await supabase
            .from("pengguna").select("*")
            .or(`email.eq.${email},nama_pengguna.eq.${email}`).single();

        if (error || !user) return res.status(404).json({ message: "Email atau username tidak ditemukan." });

        // Verifikasi password
        const isMatch = await bcrypt.compare(password, user.kata_sandi);
        if (!isMatch) return res.status(401).json({ message: "Password salah." });

        // Generate JWT token
        const token = jwt.sign({
            userId: user.id, username: user.nama_pengguna, email: user.email,
            role: user.peran, oshi: user.oshi
        }, process.env.JWT_SECRET, { expiresIn: "1d" });

        delete user.kata_sandi;
        res.json({ message: "Login berhasil!", token, user });
    } catch (e) {
        res.status(500).json({ message: "Kesalahan pada server.", error: e.message });
    }
});

// ============================================================
// ENDPOINT FITUR
// ============================================================

// Endpoint: Leaderboard Global
app.get("/api/leaderboard", async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { username: 'sultan_aca', oshi: 'Aca', totalCheki: 25 },
            { username: 'fan_sinta', oshi: 'Sinta', totalCheki: 18 },
            { username: 'demo_user', oshi: 'Cissi', totalCheki: 12 }
        ]);
    }

    try {
        const { data: orders, error } = await supabase
            .from('pesanan')
            .select('detail_item, id_pengguna, pengguna(nama_pengguna, oshi)')
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);

        if (error) throw error;

        // Hitung total per user
        const userTotals = {};
        orders.forEach(order => {
            const uid = order.id_pengguna;
            if (!userTotals[uid]) {
                userTotals[uid] = {
                    username: order.pengguna?.nama_pengguna || 'Unknown',
                    oshi: order.pengguna?.oshi || '-',
                    totalCheki: 0
                };
            }
            (order.detail_item || []).forEach(item => {
                userTotals[uid].totalCheki += item.quantity;
            });
        });

        res.json(Object.values(userTotals).sort((a, b) => b.totalCheki - a.totalCheki).slice(0, 10));
    } catch (e) {
        res.status(500).json({ message: "Gagal memuat leaderboard.", error: e.message });
    }
});

// Endpoint: Dapatkan Produk & Stok
app.get("/api/products-and-stock", async (req, res) => {
    try {
        const responseData = JSON.parse(JSON.stringify(productData));
        responseData.cheki_stock = await getChekiStock();
        res.json(responseData);
    } catch (e) {
        res.status(500).json({ message: "Tidak dapat memuat data produk." });
    }
});

// ============================================================
// ENDPOINT PEMBAYARAN (Midtrans)
// ============================================================

// Endpoint: Dapatkan Snap Token untuk pembayaran
app.post("/get-snap-token", authenticateToken, async (req, res) => {
    if (isDemoMode) return res.json({ token: 'demo_snap_token_' + Date.now() });

    try {
        const { transaction_details, item_details, customer_details } = req.body;

        const enhanced_customer_details = { ...customer_details, first_name: req.user.username, email: req.user.email };

        const parameter = {
            transaction_details,
            item_details,
            customer_details: enhanced_customer_details,
            enabled_payments: ['qris', 'gopay', 'shopeepay', 'other_qris', 'credit_card', 'bca_va']
        };

        const token = await snap.createTransactionToken(parameter);

        // Simpan pesanan pending ke database
        const { error } = await supabase.from("pesanan").insert([{
            id_pesanan: transaction_details.order_id,
            id_pengguna: req.user.userId,
            nama_pelanggan: req.user.username,
            total_harga: transaction_details.gross_amount,
            status_tiket: 'pending',
            detail_item: item_details
        }]);

        if (error) throw new Error(`DB Error: ${error.message}`);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: "Gagal membuat token pembayaran.", error: error.message });
    }
});

// Endpoint: Update Status Pesanan (Callback Midtrans)
app.post("/update-order-status", async (req, res) => {
    if (isDemoMode) return res.status(200).json({ message: "OK (Demo Mode)" });

    try {
        const { order_id, transaction_status } = req.body;
        if (!order_id || !transaction_status) return res.status(400).json({ message: "Invalid payload" });

        // Update status ke 'berlaku' jika pembayaran sukses
        if (transaction_status === "settlement" || transaction_status === "capture") {
            const { data: updatedOrder, error } = await supabase
                .from("pesanan").update({ status_tiket: "berlaku" })
                .eq("id_pesanan", order_id).select().single();

            if (error || !updatedOrder) throw new Error("Update failed");

            // Kurangi stok
            const totalItems = (updatedOrder.detail_item || []).reduce((sum, item) => sum + item.quantity, 0);
            if (totalItems > 0) {
                await supabase.rpc('update_cheki_stock', { change_value: -totalItems });
            }
        }
        res.status(200).json({ message: "Status updated" });
    } catch (e) {
        res.status(500).json({ message: "Error processing notification", error: e.message });
    }
});

// ============================================================
// ENDPOINT PROFIL USER
// ============================================================

// Endpoint: Dapatkan Profil User
app.get("/api/user/profile", authenticateToken, async (req, res) => {
    if (isDemoMode) {
        return res.json({ id: 1, nama_pengguna: 'demo_user', email: 'demo@example.com', oshi: 'Aca', peran: 'user' });
    }
    try {
        const { data: user, error } = await supabase.from("pengguna")
            .select("id, nama_pengguna, email, nomor_whatsapp, instagram, peran, oshi")
            .eq("id", req.user.userId).single();

        if (error || !user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: "Server error", error: e.message });
    }
});

// Endpoint: Update Profil User
app.put("/api/user/profile", authenticateToken, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Updated (Demo)", token: 'demo', user: { ...req.body, id: 1 } });

    try {
        const { nama_pengguna, email, nomor_whatsapp, instagram, password } = req.body;
        const updateData = { nama_pengguna, email, nomor_whatsapp, instagram };

        // Hash password baru jika ada
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updateData.kata_sandi = await bcrypt.hash(password, salt);
        }

        const { data: updatedUser, error } = await supabase.from("pengguna")
            .update(updateData).eq("id", req.user.userId)
            .select("id, nama_pengguna, email, nomor_whatsapp, instagram, peran, oshi").single();

        if (error) throw error;

        // Issue token baru
        const token = jwt.sign({
            userId: updatedUser.id, username: updatedUser.nama_pengguna,
            email: updatedUser.email, role: updatedUser.peran, oshi: updatedUser.oshi
        }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.json({ message: "Profil diperbarui!", token, user: updatedUser });
    } catch (e) {
        res.status(500).json({ message: "Update failed", error: e.message });
    }
});

// Endpoint: Dapatkan Pesanan User
app.get("/api/my-orders", authenticateToken, async (req, res) => {
    if (isDemoMode) return res.json([]);
    const { data } = await supabase.from("pesanan").select("*").eq("id_pengguna", req.user.userId);
    res.json(data || []);
});

// ============================================================
// FALLBACK ROUTE - Serve index.html untuk SPA
// ============================================================
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        const filePath = path.join(__dirname, '..', req.path);
        res.sendFile(filePath, (err) => {
            if (err) res.sendFile(path.join(__dirname, '..', 'index.html'));
        });
    }
});

// ============================================================
// START SERVER
// Edit PORT di sini jika diperlukan (default: 3000)
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`ℹ️  Mode: ${isDemoMode ? 'DEMO (No Backend)' : 'FULL (Supabase Connected)'}\n`);
});

module.exports = app;
