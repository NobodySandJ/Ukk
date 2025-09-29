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
    isProduction: false, // Ganti ke `true` saat production
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- Middleware Otentikasi ---
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

// --- Middleware Otorisasi Admin ---
const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak. Hanya untuk admin." });
    }
    next();
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

// --- Endpoint Produk & Pembayaran ---
app.get("/api/products-and-stock", async (req, res) => {
    try {
        const responseData = JSON.parse(JSON.stringify(productData));
        const currentStock = await getChekiStock();
        responseData.cheki_stock = currentStock;
        res.json(responseData);
    } catch (e) {
        res.status(500).json({ message: "Tidak dapat memuat data produk." });
    }
});

app.get("/api/midtrans-client-key", (req, res) => {
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
});

app.post("/get-snap-token", authenticateToken, async (req, res) => {
    try {
        const { transaction_details, item_details, customer_details } = req.body;
        if (!transaction_details || !item_details || !customer_details) {
            return res.status(400).json({ message: "Data pesanan tidak lengkap." });
        }

        if (transaction_details.order_id && transaction_details.order_id.length > 50) {
            transaction_details.order_id = transaction_details.order_id.substring(0, 50);
        }

        const totalItemsInCart = item_details.reduce((sum, item) => sum + item.quantity, 0);
        const currentStock = await getChekiStock();
        if (totalItemsInCart > currentStock) {
            return res.status(400).json({ message: `Stok tidak mencukupi. Sisa stok: ${currentStock}` });
        }
        
        const { error: insertError } = await supabase.from("pesanan").insert([{
            id_pesanan: transaction_details.order_id,
            total_harga: transaction_details.gross_amount,
            nama_pelanggan: req.user.username,
            email_pelanggan: customer_details.email,
            kontak_pelanggan: customer_details.phone,
            detail_item: item_details,
            id_pengguna: req.user.userId,
            status_tiket: "pending",
        }]);

        if (insertError) {
            console.error("Supabase insert error:", insertError);
            throw new Error("Gagal menyimpan pesanan ke database.");
        }

        const nameParts = (req.user.username || 'Pengguna').split(' ');
        const firstName = nameParts.shift();
        const lastName = nameParts.join(' ') || firstName;
        
        const midtransParameter = {
          transaction_details,
          item_details,
          customer_details: {
            first_name: firstName,
            last_name: lastName,
            email: customer_details.email,
            phone: customer_details.phone,
          },
        };
        
        const transaction = await snap.createTransaction(midtransParameter);
        res.json({ token: transaction.token });

    } catch (error) {
        console.error("GAGAL MEMBUAT TOKEN SNAP:", error);
        res.status(500).json({ message: "Gagal membuat token pembayaran.", error: error.message });
    }
});

app.post("/update-order-status", async (req, res) => {
    try {
        const { order_id, transaction_status } = req.body;
        if (!order_id || !transaction_status) {
            return res.status(400).json({ message: "Data notifikasi tidak lengkap." });
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
        res.status(500).json({ message: "Gagal memproses notifikasi.", error: e.message });
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

// --- Endpoint Admin ---
app.get("/api/admin/stats", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data: orders, error } = await supabase
            .from('pesanan')
            .select('total_harga, detail_item')
            .in('status_tiket', ['berlaku', 'hangus']);

        if (error) throw error;

        let totalRevenue = 0;
        let totalCheki = 0;
        const chekiPerMember = {};

        orders.forEach(order => {
            totalRevenue += order.total_harga;
            order.detail_item.forEach(item => {
                totalCheki += item.quantity;
                const memberName = item.name.replace('Cheki ', '');
                chekiPerMember[memberName] = (chekiPerMember[memberName] || 0) + item.quantity;
            });
        });

        res.json({ totalRevenue, totalCheki, chekiPerMember });
    } catch (e) {
        res.status(500).json({ message: 'Gagal mengambil statistik.', error: e.message });
    }
});

app.get("/api/admin/all-orders", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pesanan')
            .select('*')
            .order('dibuat_pada', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: 'Gagal mengambil semua pesanan.', error: e.message });
    }
});

app.get("/api/admin/all-users", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pengguna')
            .select('id, nama_pengguna, email')
            .neq('peran', 'admin') // Jangan tampilkan admin lain
            .order('nama_pengguna', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: 'Gagal mengambil data pengguna.', error: e.message });
    }
});


// --- Server Listener ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = app;