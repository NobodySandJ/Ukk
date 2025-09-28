// nobodysandj/ukk/Ukk-d62b0944c32f178929f123a2ed9509d1a235b007/backend/server.js
const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const productData = require('../data.json'); 
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Pastikan environment variables terbaca
if (!process.env.MIDTRANS_SERVER_KEY || !process.env.MIDTRANS_CLIENT_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.JWT_SECRET) {
    console.error("Kesalahan: Variabel lingkungan (environment variables) belum diatur!");
    process.exit(1);
}

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

// --- ENDPOINT YANG HILANG DIKEMBALIKAN ---
// Endpoint untuk Client Key Midtrans
app.get("/api/midtrans-client-key", (req, res) => {
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
});
// ------------------------------------------

async function getChekiStock() {
    const { data, error } = await supabase
        .from('pengaturan')
        .select('nilai')
        .eq('nama', 'stok_cheki')
        .single();
    if (error || !data) {
        console.error("Gagal mendapatkan stok:", error);
        return 0; 
    }
    return parseInt(data.nilai, 10);
}

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
            if (error.code === "23505") {
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

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Input tidak boleh kosong." });
        }
        const { data: user, error } = await supabase
            .from("pengguna")
            .select("*")
            .or(`email.eq.${email},nama_pengguna.eq.${email}`)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: "Username atau email tidak ditemukan." });
        }
        const isMatch = await bcrypt.compare(password, user.kata_sandi);
        if (!isMatch) {
            return res.status(401).json({ message: "Password salah." });
        }
        const payload = {
            userId: user.id,
            username: user.nama_pengguna,
            email: user.email,
            role: user.peran,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
        delete user.kata_sandi;
        res.json({ message: "Login berhasil!", token, user });
    } catch (e) {
        console.error("Gagal saat login:", e.message);
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});

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

app.post("/get-snap-token", authenticateToken, async (req, res) => {
    try {
        const orderData = req.body;
        if (!orderData) {
            return res.status(400).json({ message: "Data pesanan tidak valid." });
        }

        const totalItemsInCart = orderData.item_details.reduce((sum, item) => sum + item.quantity, 0);
        const currentStock = await getChekiStock();
        if (totalItemsInCart > currentStock) {
            return res.status(400).json({ message: `Stok tidak mencukupi. Sisa stok: ${currentStock}` });
        }
        
        const { error } = await supabase.from("pesanan").insert([{
            id_pesanan: orderData.transaction_details.order_id,
            total_harga: orderData.transaction_details.gross_amount,
            nama_pelanggan: req.user.username,
            email_pelanggan: orderData.customer_details.email,
            kontak_pelanggan: orderData.customer_details.phone,
            detail_item: orderData.item_details,
            id_pengguna: req.user.userId,
            status_tiket: "pending",
        }]);
        if (error) throw error;

        // Memastikan `customer_details` memiliki `first_name` dan `last_name`.
        const nameParts = req.user.username.split(' ');
        const firstName = nameParts.shift();
        const lastName = nameParts.join(' ') || firstName;

        const midtransParameter = {
          transaction_details: orderData.transaction_details,
          item_details: orderData.item_details,
          customer_details: {
            first_name: firstName,
            last_name: lastName,
            email: orderData.customer_details.email,
            phone: orderData.customer_details.phone,
          },
        };
        
        const transaction = await snap.createTransaction(midtransParameter);
        res.json({ token: transaction.token });
    } catch (e) {
        console.error("GAGAL MEMBUAT TOKEN:", e);
        res.status(500).json({ message: "Gagal membuat token pembayaran.", error: e.message });
    }
});

app.get("/api/my-orders", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("pesanan")
            .select("*")
            .eq("id_pengguna", req.user.userId)
            .order("dibuat_pada", { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil pesanan." });
    }
});

app.post("/update-order-status", async (req, res) => {
    try {
        const { order_id, transaction_status } = req.body;
        if (!order_id || !transaction_status) {
            return res.status(400).json({ error: "Data tidak lengkap." });
        }

        if (transaction_status === "settlement" || transaction_status === "capture") {
            const { data: updatedOrder, error } = await supabase
                .from("pesanan")
                .update({ status_tiket: "berlaku" })
                .eq("id_pesanan", order_id)
                .select().single();
            if (error) throw error;
            if (!updatedOrder) throw new Error("Pesanan tidak ditemukan.");
            
            const totalItemsPurchased = updatedOrder.detail_item.reduce((sum, item) => sum + item.quantity, 0);
            if (totalItemsPurchased > 0) {
                const { error: stockError } = await supabase.rpc('update_cheki_stock', { change_value: -totalItemsPurchased });
                if (stockError) console.error(`PENTING: Gagal mengurangi stok untuk ${order_id}:`, stockError.message);
            }
            res.status(200).json({ message: "Status tiket berhasil diupdate." });
        } else {
            res.status(200).json({ message: "Status pembayaran diterima." });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;