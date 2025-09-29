// File: backend/server.js
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

// Validasi Environment Variables
const requiredEnv = ['MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`Kesalahan: Variabel lingkungan berikut belum diatur: ${missingEnv.join(', ')}`);
    process.exit(1);
}

// Inisialisasi Midtrans & Supabase
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Middleware otentikasi
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- ENDPOINTS ---

app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password, whatsapp_number, instagram_username } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Username, email, dan password wajib diisi." });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password minimal 6 karakter." });
        }
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const { data, error } = await supabase.from("pengguna").insert([{
            nama_pengguna: username,
            email: email,
            kata_sandi: password_hash,
            nomor_whatsapp: whatsapp_number,
            instagram: instagram_username,
            peran: "user",
        }]).select().single();

        if (error) {
            if (error.code === "23505") { // Kode error untuk duplicate entry
                return res.status(409).json({ message: "Username atau email sudah terdaftar." });
            }
            throw error;
        }
        res.status(201).json({ message: "Registrasi berhasil!", user: data });
    } catch (e) {
        console.error("Gagal saat registrasi:", e.message);
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});

// --- PERBAIKAN LOGIN LAMBAT ---
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Input tidak boleh kosong." });
        }

        // Coba cari pengguna berdasarkan email (paling cepat)
        let { data: user, error } = await supabase
            .from("pengguna")
            .select("*")
            .eq("email", email)
            .single();

        // Jika tidak ketemu via email, coba cari via username
        if (!user) {
            const { data: userByUsername } = await supabase
                .from("pengguna")
                .select("*")
                .eq("nama_pengguna", email)
                .single();
            user = userByUsername;
        }

        if (!user) {
            return res.status(404).json({ message: "Email atau username tidak ditemukan." });
        }

        const isMatch = await bcrypt.compare(password, user.kata_sandi);
        if (!isMatch) {
            return res.status(401).json({ message: "Password salah." });
        }

        const payload = { userId: user.id, username: user.nama_pengguna, email: user.email, role: user.peran };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
        
        delete user.kata_sandi;
        res.json({ message: "Login berhasil!", token, user });
    } catch (e) {
        console.error("Gagal saat login:", e.message);
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});
// --- AKHIR PERBAIKAN LOGIN ---

// Endpoint yang sudah ada (tidak perlu diubah, cukup pastikan ada)
app.get("/api/midtrans-client-key", (req, res) => { res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY }); });
app.get("/api/products-and-stock", async (req, res) => { /* ... kode Anda di sini ... */ });
app.post("/get-snap-token", authenticateToken, async (req, res) => { /* ... kode Anda di sini ... */ });
app.post("/update-order-status", async (req, res) => { /* ... kode Anda di sini ... */ });
app.get("/api/my-orders", authenticateToken, async (req, res) => { /* ... kode Anda di sini ... */ });
// Dan endpoint lainnya...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;