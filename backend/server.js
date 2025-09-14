// backend/server.js (Versi disesuaikan dengan DB Bahasa Indonesia)

const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Midtrans
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Inisialisasi Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Endpoint Registrasi Pengguna
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password, whatsapp_number, instagram_username } =
            req.body;
        if (!username || !email || !password) {
            return res
                .status(400)
                .json({ message: "Username, email, dan password wajib diisi." });
        }
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Menggunakan tabel "pengguna" dan kolom Bahasa Indonesia
        const { data, error } = await supabase
            .from("pengguna")
            .insert([
                {
                    nama_pengguna: username,
                    email: email,
                    kata_sandi: password_hash,
                    nomor_whatsapp: whatsapp_number,
                    instagram: instagram_username,
                    peran: "user",
                },
            ])
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return res
                    .status(409)
                    .json({ message: "Username atau email sudah terdaftar." });
            }
            throw error;
        }
        res.status(201).json({ message: "Registrasi berhasil!", user: data });
    } catch (e) {
        console.error("Gagal saat registrasi:", e.message);
        res
            .status(500)
            .json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});

// Endpoint Login Pengguna
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Input tidak boleh kosong." });
        }
        // Menggunakan tabel "pengguna"
        const { data: user, error } = await supabase
            .from("pengguna")
            .select("*")
            .or(`email.eq.${email},nama_pengguna.eq.${email}`)
            .single();

        if (error || !user) {
            return res
                .status(404)
                .json({ message: "Username atau email tidak ditemukan." });
        }
        // Mencocokkan dengan kolom "kata_sandi"
        const isMatch = await bcrypt.compare(password, user.kata_sandi);
        if (!isMatch) {
            return res.status(401).json({ message: "Password salah." });
        }
        const payload = {
            userId: user.id,
            username: user.nama_pengguna, // Menggunakan "nama_pengguna"
            email: user.email,
            role: user.peran, // Menggunakan "peran"
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });
        delete user.kata_sandi; // Menghapus "kata_sandi"
        res.json({ message: "Login berhasil!", token, user });
    } catch (e) {
        console.error("Gagal saat login:", e.message);
        res
            .status(500)
            .json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});

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

// Endpoint membuat token pembayaran Midtrans
app.post("/get-snap-token", authenticateToken, async (req, res) => {
    try {
        const parameter = req.body.orderData;
        const user = req.user;

        if (!parameter) {
            return res.status(400).json({ message: "Data pesanan tidak ditemukan." });
        }
        
        // Menggunakan tabel "pesanan" dan kolom Bahasa Indonesia
        const { data, error } = await supabase
            .from("pesanan")
            .insert([
                {
                    id_pesanan: parameter.transaction_details.order_id,
                    total_harga: parameter.transaction_details.gross_amount,
                    nama_pelanggan: parameter.customer_details.first_name,
                    email_pelanggan: parameter.customer_details.email,
                    kontak_pelanggan: parameter.customer_details.phone,
                    detail_item: parameter.item_details,
                    id_pengguna: user.userId, // Menghubungkan ke pengguna
                    status_tiket: "pending",
                },
            ])
            .select();

        if (error) throw error;

        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token });
    } catch (e) {
        console.error("GAGAL MEMBUAT TOKEN:", e);
        res
            .status(500)
            .json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});

// Endpoint untuk pengguna mengambil riwayat pesanannya
app.get("/api/my-orders", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        // Menggunakan tabel "pesanan" dan kolom "id_pengguna"
        const { data, error } = await supabase
            .from("pesanan")
            .select("*")
            .eq("id_pengguna", userId)
            .order("dibuat_pada", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error("Gagal mengambil pesanan pengguna:", e.message);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

// Endpoint update status tiket setelah pembayaran
app.post("/update-order-status", async (req, res) => {
    try {
        const { order_id, transaction_status } = req.body;
        if (!order_id || !transaction_status) {
            return res
                .status(400)
                .json({ error: "Order ID dan status transaksi diperlukan." });
        }

        if (
            transaction_status === "settlement" ||
            transaction_status === "capture"
        ) {
            // Menggunakan tabel "pesanan"
            const { data: updatedOrder, error } = await supabase
                .from("pesanan")
                .update({ status_tiket: "berlaku" })
                .eq("id_pesanan", order_id)
                .select()
                .single();
            if (error) throw error;
            if (!updatedOrder)
                throw new Error("Pesanan tidak ditemukan untuk diupdate.");
            console.log(
                `Status tiket untuk pesanan ${order_id} berhasil diaktifkan.`
            );
            res.status(200).json({ message: "Status tiket berhasil diupdate." });
        } else {
            res
                .status(200)
                .json({
                    message:
                        "Status pembayaran diterima, tidak ada aksi tiket yang diperlukan.",
                });
        }
    } catch (e) {
        console.error("Gagal update status tiket dari client:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// --- BAGIAN ADMIN ---

// Middleware otentikasi ADMIN
async function authenticateAdmin(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Menggunakan tabel "pengguna" dan kolom "peran"
        const { data: user, error } = await supabase
            .from("pengguna")
            .select("peran")
            .eq("id", decoded.userId)
            .single();

        if (error || !user || user.peran !== "admin") {
            return res.status(403).json({ message: "Akses ditolak: Wajib admin." });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Token tidak valid." });
    }
}

// Endpoint Admin: Mengambil SEMUA pesanan
app.get("/api/admin/all-orders", authenticateAdmin, async (req, res) => {
    try {
        // Menggunakan tabel "pesanan"
        const { data, error } = await supabase
            .from("pesanan")
            .select("*")
            .order("dibuat_pada", { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Endpoint Admin: Mengubah status tiket
app.post(
    "/api/admin/update-ticket-status",
    authenticateAdmin,
    async (req, res) => {
        const { order_id, new_status } = req.body;
        if (!order_id || !new_status) {
            return res
                .status(400)
                .json({ message: "Order ID dan status baru diperlukan." });
        }
        try {
            // Menggunakan tabel "pesanan"
            const { data, error } = await supabase
                .from("pesanan")
                .update({ status_tiket: new_status })
                .eq("id_pesanan", order_id)
                .select();
            if (error) throw error;
            res.json({
                message: "Status tiket berhasil diupdate!",
                updatedOrder: data,
            });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }
);

// Endpoint Admin: Statistik
app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
    try {
        // Menggunakan tabel "pesanan"
        const { data: orders, error } = await supabase
            .from("pesanan")
            .select("total_harga, detail_item");
        if (error) throw error;
        let totalRevenue = 0;
        let totalCheki = 0;
        const chekiPerMember = {};
        orders.forEach((order) => {
            if (order.total_harga) {
                totalRevenue += order.total_harga;
            }
            if (order.detail_item) {
                order.detail_item.forEach((item) => {
                    totalCheki += item.quantity;
                    const memberName = item.name.replace("Cheki ", "");
                    chekiPerMember[memberName] =
                        (chekiPerMember[memberName] || 0) + item.quantity;
                });
            }
        });
        res.json({ totalRevenue, totalCheki, chekiPerMember });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = app;