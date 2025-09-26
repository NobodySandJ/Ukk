// nobodysandj/ukk/Ukk-4b4a46eaa48589fe04747b7a87ab7fb5fa58a6ec/backend/server.js
const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');
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

// --- HELPER FUNCTION TO GET STOCK ---
async function getChekiStock() {
    const { data, error } = await supabase
        .from('pengaturan')
        .select('nilai')
        .eq('nama', 'stok_cheki')
        .single();
    if (error || !data) {
        console.error("Gagal mendapatkan stok:", error);
        // Return a default high value or 0 to indicate an issue, preventing sales if stock is unknown
        return 0; 
    }
    return parseInt(data.nilai, 10);
}


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
        if (password.length < 6) {
            return res.status(400).json({ message: "Password minimal 6 karakter." });
        }
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

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
        const isMatch = await bcrypt.compare(password, user.kata_sandi);
        if (!isMatch) {
            return res.status(401).json({ message: "Password salah." });
        }
        const payload = {
            userId: user.id,
            username: user.nama_pengguna,
            email: user.email,
            role: user.peran, // Peran disertakan di sini
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });
        delete user.kata_sandi;
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

// NEW ENDPOINT: Get products from data.json and live stock from Supabase
app.get("/api/products-and-stock", async (req, res) => {
    try {
        const dataPath = path.join(__dirname, '..', 'data.json');
        const productData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        
        const currentStock = await getChekiStock();
        productData.cheki_stock = currentStock;

        res.json(productData);
    } catch (e) {
        console.error("Gagal memuat data produk dan stok:", e.message);
        res.status(500).json({ message: "Tidak dapat memuat data produk." });
    }
});


// Endpoint membuat token pembayaran Midtrans
app.post("/get-snap-token", authenticateToken, async (req, res) => {
    try {
        const parameter = req.body.orderData;
        const user = req.user;

        if (!parameter) {
            return res.status(400).json({ message: "Data pesanan tidak ditemukan." });
        }

        // --- STOCK CHECK ---
        const totalItemsInCart = parameter.item_details.reduce((sum, item) => sum + item.quantity, 0);
        const currentStock = await getChekiStock();

        if (totalItemsInCart > currentStock) {
            return res.status(400).json({ message: `Stok tidak mencukupi. Sisa stok: ${currentStock}` });
        }
        
        const { data, error } = await supabase
            .from("pesanan")
            .insert([
                {
                    id_pesanan: parameter.transaction_details.order_id,
                    total_harga: parameter.transaction_details.gross_amount,
                    nama_pelanggan: user.username,
                    email_pelanggan: parameter.customer_details.email,
                    kontak_pelanggan: parameter.customer_details.phone,
                    detail_item: parameter.item_details,
                    id_pengguna: user.userId,
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
            const { data: updatedOrder, error } = await supabase
                .from("pesanan")
                .update({ status_tiket: "berlaku" })
                .eq("id_pesanan", order_id)
                .select()
                .single();
            if (error) throw error;
            if (!updatedOrder)
                throw new Error("Pesanan tidak ditemukan untuk diupdate.");
            
            // --- DECREMENT STOCK ---
            const totalItemsPurchased = updatedOrder.detail_item.reduce((sum, item) => sum + item.quantity, 0);
            if (totalItemsPurchased > 0) {
                const { error: stockError } = await supabase.rpc('update_cheki_stock', { change_value: -totalItemsPurchased });
                if (stockError) {
                    console.error(`PENTING: Gagal mengurangi stok untuk pesanan ${order_id}. Error:`, stockError.message);
                } else {
                     console.log(`Stok berhasil dikurangi sebanyak ${totalItemsPurchased} untuk pesanan ${order_id}`);
                }
            }

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


// Endpoint untuk mendapatkan profil pengguna
app.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { data, error } = await supabase
            .from("pengguna")
            .select("nama_pengguna, email, nomor_whatsapp, instagram")
            .eq("id", userId)
            .single();

        if (error || !data) throw new Error("Profil pengguna tidak ditemukan.");
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Endpoint untuk memperbarui profil pengguna
app.put("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { nama_pengguna, email, nomor_whatsapp, instagram, password } = req.body;

        const updateData = {
            nama_pengguna,
            email,
            nomor_whatsapp,
            instagram,
        };

        if (password) {
            if (password.length < 6) {
                 return res.status(400).json({ message: "Password baru minimal 6 karakter." });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.kata_sandi = await bcrypt.hash(password, salt);
        }

        const { data, error } = await supabase
            .from("pengguna")
            .update(updateData)
            .eq("id", userId)
            .select("id, nama_pengguna, email, peran, nomor_whatsapp, instagram")
            .single();

        if (error) {
             if(error.code === '23505') {
                return res.status(409).json({ message: "Username atau email sudah digunakan." });
            }
            throw error;
        }
        
         const payload = {
            userId: data.id,
            username: data.nama_pengguna,
            email: data.email,
            role: data.peran,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        res.json({ message: "Profil berhasil diperbarui!", user: data, token });

    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- BAGIAN ADMIN ---

async function authenticateAdmin(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Akses ditolak: Wajib admin." });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Token tidak valid." });
    }
}


app.get("/api/admin/all-orders", authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("pesanan")
            .select("*, pengguna(id, nama_pengguna)")
            .order("dibuat_pada", { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

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

app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
    try {
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

app.delete("/api/admin/delete-order/:order_id", authenticateAdmin, async (req, res) => {
    const { order_id } = req.params;
    if (!order_id) {
        return res.status(400).json({ message: "Order ID diperlukan." });
    }
    try {
        const { error } = await supabase
            .from("pesanan")
            .delete()
            .eq("id_pesanan", order_id);
        if (error) throw error;
        res.status(200).json({ message: `Pesanan ${order_id} berhasil dihapus.` });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post("/api/admin/reset-user-password", authenticateAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ message: "User ID diperlukan." });
    }
    try {
        const tempPassword = crypto.randomBytes(4).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(tempPassword, salt);
        
        const { data, error } = await supabase
            .from("pengguna")
            .update({ kata_sandi: password_hash })
            .eq("id", userId)
            .select("nama_pengguna");

        if (error) throw error;

        res.status(200).json({ 
            message: `Password untuk user ${data[0].nama_pengguna} berhasil direset.`,
            temporaryPassword: tempPassword
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// UPDATE ENDPOINT: Update cheki stock using the Supabase function
app.post("/api/admin/update-cheki-stock", authenticateAdmin, async (req, res) => {
    const { changeValue } = req.body;
    if (typeof changeValue !== 'number') {
        return res.status(400).json({ message: "Nilai perubahan stok harus berupa angka." });
    }

    try {
        const { data, error } = await supabase.rpc('update_cheki_stock', { change_value: changeValue });

        if (error) throw error;

        res.status(200).json({
            message: "Stok berhasil diperbarui!",
            newStock: data
        });

    } catch (e) {
        res.status(500).json({ message: `Gagal memperbarui stok: ${e.message}` });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


module.exports = app;