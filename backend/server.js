// File: backend/server.js
// Versi final dengan penambahan fitur reset password admin & register instagram opsional.

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

// --- Endpoint Konfigurasi Midtrans ---
app.get("/api/midtrans-client-key", (req, res) => {
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
});

// --- Endpoint Otentikasi ---
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password, whatsapp_number, instagram_username } = req.body;
        
        // MODIFIKASI: Menghapus instagram_username dari pengecekan wajib
        if (!username || !email || !password || !whatsapp_number) {
            return res.status(400).json({ message: "Data wajib diisi (Username, Email, Password, WA)." });
        }
        
        if (password.length < 6) return res.status(400).json({ message: "Password minimal 6 karakter." });

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const { data, error } = await supabase.from("pengguna").insert([{
            nama_pengguna: username, 
            email, 
            kata_sandi: password_hash,
            nomor_whatsapp: whatsapp_number, 
            instagram: instagram_username, // Akan null jika tidak diisi user
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

app.post("/api/login", async (req, res) => {
    try {
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
    } catch (e) {
        res.status(500).json({ message: "Kesalahan pada server.", error: e.message });
    }
});

// --- Endpoint Produk & Pembayaran ---
app.get("/api/products-and-stock", async (req, res) => {
    try {
        const responseData = JSON.parse(JSON.stringify(productData));
        responseData.cheki_stock = await getChekiStock();
        res.json(responseData);
    } catch (e) {
        res.status(500).json({ message: "Tidak dapat memuat data produk." });
    }
});

app.post("/get-snap-token", authenticateToken, async (req, res) => {
    try {
        const { transaction_details, item_details, customer_details } = req.body;
        const enhanced_customer_details = { ...customer_details, first_name: req.user.username, email: req.user.email };
        const parameter = { transaction_details, item_details, customer_details: enhanced_customer_details };
        const token = await snap.createTransactionToken(parameter);

        const { error } = await supabase.from("pesanan").insert([{
            id_pesanan: transaction_details.order_id,
            id_pengguna: req.user.userId,
            nama_pelanggan: req.user.username,
            total_harga: transaction_details.gross_amount,
            status_tiket: 'pending',
            detail_item: item_details
        }]);

        if (error) throw new Error(`Gagal menyimpan pesanan awal: ${error.message}`);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: "Gagal membuat token pembayaran.", error: error.message });
    }
});

app.post("/update-order-status", async (req, res) => {
    try {
        const { order_id, transaction_status } = req.body;
        if (!order_id || !transaction_status) return res.status(400).json({ message: "Data notifikasi tidak lengkap." });

        if (transaction_status === "settlement" || transaction_status === "capture") {
            const { data: updatedOrder, error } = await supabase
                .from("pesanan").update({ status_tiket: "berlaku" })
                .eq("id_pesanan", order_id).select().single();

            if (error || !updatedOrder) throw new Error("Gagal update status pesanan.");
            const totalItems = (updatedOrder.detail_item || []).reduce((sum, item) => sum + item.quantity, 0);
            if (totalItems > 0) {
                await supabase.rpc('update_cheki_stock', { change_value: -totalItems });
            }
        }
        res.status(200).json({ message: "Status pembayaran diterima." });
    } catch (e) {
        res.status(500).json({ message: "Gagal memproses notifikasi.", error: e.message });
    }
});

// --- Endpoint Pengguna ---
app.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from("pengguna")
            .select("id, nama_pengguna, email, nomor_whatsapp, instagram, peran")
            .eq("id", req.user.userId)
            .single();
        
        if (error || !user) return res.status(404).json({ message: "Profil tidak ditemukan." });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil profil.", error: e.message });
    }
});

app.put("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const { nama_pengguna, email, nomor_whatsapp, instagram, password } = req.body;
        
        if (!nama_pengguna || !email) {
            return res.status(400).json({ message: "Username dan email tidak boleh kosong." });
        }

        const { data: existingUser, error: checkError } = await supabase
            .from("pengguna")
            .select("id")
            .or(`nama_pengguna.eq.${nama_pengguna},email.eq.${email}`)
            .neq("id", req.user.userId);

        if (checkError) throw checkError;
        if (existingUser && existingUser.length > 0) {
            return res.status(409).json({ message: "Username atau email sudah digunakan oleh pengguna lain." });
        }

        const updateData = {
            nama_pengguna,
            email,
            nomor_whatsapp: nomor_whatsapp || null,
            instagram: instagram || null
        };

        if (password && password.trim() !== "") {
            if (password.length < 6) {
                return res.status(400).json({ message: "Password minimal 6 karakter." });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.kata_sandi = await bcrypt.hash(password, salt);
        }

        const { data: updatedUser, error: updateError } = await supabase
            .from("pengguna")
            .update(updateData)
            .eq("id", req.user.userId)
            .select("id, nama_pengguna, email, nomor_whatsapp, instagram, peran")
            .single();

        if (updateError) throw updateError;

        const payload = { 
            userId: updatedUser.id, 
            username: updatedUser.nama_pengguna, 
            email: updatedUser.email, 
            role: updatedUser.peran 
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.json({ 
            message: "Profil berhasil diperbarui!", 
            token, 
            user: updatedUser 
        });
    } catch (e) {
        res.status(500).json({ message: "Gagal memperbarui profil.", error: e.message });
    }
});

app.get("/api/my-orders", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from("pesanan")
            .select("*").eq("id_pengguna", req.user.userId)
            .order("dibuat_pada", { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil pesanan.", error: e.message });
    }
});

// --- Endpoint Admin ---
app.get("/api/admin/stats", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data: orders, error } = await supabase.from('pesanan').select('total_harga, detail_item')
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);
        if (error) throw error;
        let totalRevenue = 0, totalCheki = 0;
        const chekiPerMember = {};
        orders.forEach(order => {
            totalRevenue += order.total_harga;
            (order.detail_item || []).forEach(item => {
                totalCheki += item.quantity;
                const member = item.name.replace('Cheki ', '');
                chekiPerMember[member] = (chekiPerMember[member] || 0) + item.quantity;
            });
        });
        res.json({ totalRevenue, totalCheki, chekiPerMember });
    } catch (e) {
        res.status(500).json({ message: 'Gagal mengambil statistik.', error: e.message });
    }
});

app.get("/api/admin/all-orders", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from('pesanan').select('*')
            .neq('status_tiket', 'pending')
            .order('dibuat_pada', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: 'Gagal mengambil pesanan.', error: e.message });
    }
});

app.post("/api/admin/update-ticket-status", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { order_id, new_status } = req.body;
        if (!order_id || !new_status) return res.status(400).json({ message: "Data tidak lengkap." });
        const { error } = await supabase.from('pesanan').update({ status_tiket: new_status }).eq('id_pesanan', order_id);
        if (error) throw error;
        res.json({ message: `Status tiket berhasil diubah.` });
    } catch (e) {
        res.status(500).json({ message: "Gagal update status tiket.", error: e.message });
    }
});

app.post('/api/admin/update-cheki-stock', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { changeValue } = req.body;
        if (typeof changeValue !== 'number') return res.status(400).json({ message: 'Nilai tidak valid.' });
        const { error } = await supabase.rpc('update_cheki_stock', { change_value: changeValue });
        if (error) throw new Error(`Gagal update stok: ${error.message}`);
        const newStock = await getChekiStock();
        res.json({ message: 'Stok berhasil diperbarui!', newStock });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- Endpoint Admin Manajemen Pengguna (BARU) ---
app.get("/api/admin/all-users", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pengguna')
            .select('id, nama_pengguna, email')
            .neq('peran', 'admin'); // Jangan tampilkan admin
        if (error) throw error;
        res.json(data);
    } catch(e) {
        res.status(500).json({ message: "Gagal mengambil data pengguna.", error: e.message });
    }
});

app.post("/api/admin/reset-user-password", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "User ID tidak ditemukan." });

        const newPassword = "password123"; // Password default baru
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        const { error } = await supabase
            .from('pengguna')
            .update({ kata_sandi: password_hash })
            .eq('id', userId);

        if (error) throw error;
        res.json({ message: `Password berhasil direset. Password baru adalah: ${newPassword}` });
    } catch(e) {
        res.status(500).json({ message: "Gagal mereset password.", error: e.message });
    }
});

// --- Server Listener ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));

module.exports = app;