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

// Validasi environment variables
if (!process.env.MIDTRANS_SERVER_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.JWT_SECRET) {
    console.error("Kesalahan: Variabel lingkungan (environment variables) penting belum diatur!");
    process.exit(1);
}

// Inisialisasi Midtrans Snap
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Inisialisasi Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Fungsi untuk mendapatkan stok
async function getChekiStock() {
    const { data, error } = await supabase
        .from('pengaturan')
        .select('nilai')
        .eq('nama', 'stok_cheki')
        .single();
    if (error) {
        console.error("Gagal mendapatkan stok:", error);
        return 0; 
    }
    return parseInt(data.nilai, 10);
}

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

// ENDPOINT: Registrasi
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password || password.length < 6) {
            return res.status(400).json({ message: "Data tidak valid. Password minimal 6 karakter." });
        }
        const password_hash = await bcrypt.hash(password, 10);

        const { error } = await supabase.from("pengguna").insert([{
            nama_pengguna: username, email, kata_sandi: password_hash
        }]);

        if (error) {
            return res.status(409).json({ message: "Username atau email sudah terdaftar." });
        }
        res.status(201).json({ message: "Registrasi berhasil!" });
    } catch (e) {
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

// ENDPOINT: Login
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data: user, error } = await supabase
            .from("pengguna")
            .select("*")
            .or(`email.eq.${email},nama_pengguna.eq.${email}`)
            .single();

        if (error || !user || !await bcrypt.compare(password, user.kata_sandi)) {
            return res.status(401).json({ message: "Email atau password salah." });
        }
        const token = jwt.sign({ userId: user.id, username: user.nama_pengguna, email: user.email, role: user.peran }, process.env.JWT_SECRET, { expiresIn: "1d" });
        delete user.kata_sandi;
        res.json({ message: "Login berhasil!", token, user });
    } catch (e) {
         res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

// ENDPOINT: Data Produk & Stok
app.get("/api/products-and-stock", async (req, res) => {
    try {
        const responseData = { ...productData, cheki_stock: await getChekiStock() };
        res.json(responseData);
    } catch (e) {
        res.status(500).json({ message: "Tidak dapat memuat data produk." });
    }
});

// ENDPOINT: /get-snap-token
app.post("/get-snap-token", authenticateToken, async (req, res) => {
    try {
        const { orderData } = req.body;
        if (!orderData || !orderData.transaction_details || !orderData.item_details) {
            return res.status(400).json({ message: "Data pesanan tidak lengkap atau tidak valid." });
        }

        const totalItemsInCart = orderData.item_details.reduce((sum, item) => sum + item.quantity, 0);
        const currentStock = await getChekiStock();
        if (totalItemsInCart > currentStock) {
            return res.status(400).json({ message: `Stok tidak mencukupi. Sisa stok: ${currentStock}` });
        }
        
        const { error: insertError } = await supabase.from("pesanan").insert([{
            id_pesanan: orderData.transaction_details.order_id,
            total_harga: orderData.transaction_details.gross_amount,
            nama_pelanggan: req.user.username,
            email_pelanggan: req.user.email,
            id_pengguna: req.user.userId,
            detail_item: orderData.item_details,
            status_tiket: "pending",
        }]);

        if (insertError) throw insertError;

        const nameParts = req.user.username.split(' ');
        const firstName = nameParts.shift() || 'Pengguna';
        const lastName = nameParts.join(' ') || firstName;

        const midtransParameter = {
          transaction_details: orderData.transaction_details,
          item_details: orderData.item_details,
          customer_details: {
            first_name: firstName,
            last_name: lastName,
            email: req.user.email,
            phone: orderData.customer_details.phone || '',
          },
        };
        
        const transaction = await snap.createTransaction(midtransParameter);
        res.json({ token: transaction.token });

    } catch (e) {
        console.error("GAGAL MEMBUAT TOKEN:", e.message);
        res.status(500).json({ message: "Gagal membuat token pembayaran.", error: e.message });
    }
});

// ENDPOINT: Notifikasi dari Midtrans
app.post("/update-order-status", async (req, res) => {
    try {
        const { order_id, transaction_status } = req.body;
        if (!order_id || !transaction_status) return res.sendStatus(400);

        if (transaction_status === "settlement" || transaction_status === "capture") {
            const { data: updatedOrder, error } = await supabase
                .from("pesanan")
                .update({ status_tiket: "berlaku" })
                .eq("id_pesanan", order_id)
                .select().single();
            if (error || !updatedOrder) throw new Error("Pesanan tidak ditemukan atau gagal update.");
            
            const totalItems = updatedOrder.detail_item.reduce((sum, item) => sum + item.quantity, 0);
            if (totalItems > 0) {
                await supabase.rpc('update_cheki_stock', { change_value: -totalItems });
            }
        }
        res.status(200).json({ message: "Status pesanan berhasil diupdate." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = app;