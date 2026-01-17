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
const multer = require("multer");

// Multer config for Supabase uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
        }
    }
});

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

// Endpoint: Leaderboard Per Member
app.get("/api/leaderboard-per-member", async (req, res) => {
    const { memberName } = req.query;
    if (!memberName) return res.status(400).json({ message: "Nama member diperlukan." });

    if (isDemoMode) {
        // Demo data filtered by member name
        const demoData = [
            { username: 'sultan_piya', totalQuantity: 15 },
            { username: 'fan_piya', totalQuantity: 8 },
            { username: 'demo_user', totalQuantity: 5 }
        ];
        return res.json(demoData);
    }

    try {
        const { data: orders, error } = await supabase
            .from('pesanan')
            .select('detail_item, id_pengguna, pengguna(nama_pengguna)')
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);

        if (error) throw error;

        // Pastikan orders adalah array
        if (!orders || !Array.isArray(orders)) {
            return res.json([]);
        }

        const fanTotals = {};
        orders.forEach(order => {
            const items = order.detail_item || [];
            if (!Array.isArray(items)) return;

            items.forEach(item => {
                // Filter item berdasarkan nama member (case insensitive)
                if (item.name && item.name.toLowerCase().includes(memberName.toLowerCase())) {
                    const uid = order.id_pengguna;
                    if (!uid) return;

                    if (!fanTotals[uid]) {
                        fanTotals[uid] = {
                            username: order.pengguna?.nama_pengguna || 'Unknown',
                            totalQuantity: 0
                        };
                    }
                    fanTotals[uid].totalQuantity += (item.quantity || 0);
                }
            });
        });

        const leaderboard = Object.values(fanTotals)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 10);

        res.json(leaderboard);
    } catch (e) {
        console.error("Leaderboard Per-Member API Error:", e);
        res.status(500).json({ message: "Gagal memuat leaderboard member.", error: e.message });
    }
});

// Endpoint: Dapatkan Produk & Stok
app.get("/api/products-and-stock", async (req, res) => {
    try {
        let responseData = JSON.parse(JSON.stringify(productData));

        if (!isDemoMode) {
            try {
                // Fetch dynamic data from Supabase in parallel
                const [membersRes, newsRes, galleryRes] = await Promise.all([
                    supabase.from('members').select('*').eq('is_active', true).order('display_order', { ascending: true }),
                    supabase.from('news').select('title, content, date').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
                    supabase.from('gallery').select('image_url, alt_text').order('display_order', { ascending: true })
                ]);

                // Transform Members
                const dbMembers = (membersRes.data || []).map(m => ({
                    id: m.name,
                    name: m.name,
                    role: m.role,
                    image: m.image_url || `img/member/placeholder.webp`,
                    price: m.price || 25000,
                    details: m.details || {}
                }));

                // Transform News
                const dbNews = newsRes.data || [];

                // Transform Gallery
                const dbGallery = (galleryRes.data || []).map(g => ({
                    src: g.image_url,
                    alt: g.alt_text
                }));

                // Override JSON data if DB has data
                if (dbMembers.length > 0) responseData.members = dbMembers;
                if (dbNews.length > 0) responseData.news = dbNews;
                if (dbGallery.length > 0) responseData.gallery = dbGallery;
            } catch (dbError) {
                console.error("DB Fetch Error (using JSON fallback):", dbError.message);
            }
        }

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
// ADMIN ENDPOINTS
// ============================================================

// Endpoint: Admin Stats
// Endpoint: Admin Dashboard Stats
app.get("/api/admin/dashboard-stats", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) {
        return res.json({
            users: 15,
            active_orders: 5,
            revenue: 1500000,
            stock: 8
        });
    }
    try {
        // 1. Total Users (Non-Admin)
        const { count: users, error: errUsers } = await supabase
            .from('pengguna')
            .select('*', { count: 'exact', head: true })
            .neq('peran', 'admin');

        // 2. Active Orders
        const { count: active_orders, error: errOrders } = await supabase
            .from('pesanan')
            .select('*', { count: 'exact', head: true })
            .eq('status_tiket', 'berlaku');

        // 3. Revenue (Status: berlaku/sudah_dipakai)
        const { data: revenueData, error: errRevenue } = await supabase
            .from('pesanan')
            .select('total_harga')
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);

        const revenue = (revenueData || []).reduce((sum, item) => sum + item.total_harga, 0);

        // 4. Stock
        const stock = await getChekiStock();

        if (errUsers || errOrders || errRevenue) throw new Error("Database error");

        res.json({ users: users || 0, active_orders: active_orders || 0, revenue, stock });
    } catch (e) {
        res.status(500).json({ message: 'Gagal mengambil statistik.', error: e.message });
    }
});

// Endpoint: All Orders
app.get("/api/admin/all-orders", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id_pesanan: 'DEMO-001', nama_pelanggan: 'Demo User', total_harga: 50000, status_tiket: 'berlaku', detail_item: [{ name: 'Cheki Aca', quantity: 2 }], dibuat_pada: new Date().toISOString() }
        ]);
    }
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

// Endpoint: Update Ticket Status
app.post("/api/admin/update-ticket-status", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: 'Status tiket berhasil diubah. (Demo)' });
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

// Endpoint: Update Cheki Stock
app.post('/api/admin/update-cheki-stock', authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: 'Stok berhasil diperbarui! (Demo)', newStock: 100 });
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

// Endpoint: All Users
app.get("/api/admin/all-users", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', nama_pengguna: 'demo_user', email: 'demo@example.com', nomor_whatsapp: '081234567890' },
            { id: '2', nama_pengguna: 'test_user', email: 'test@example.com', nomor_whatsapp: '089876543210' }
        ]);
    }
    try {
        const { data, error } = await supabase.from('pengguna').select('id, nama_pengguna, email, nomor_whatsapp').neq('peran', 'admin');
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data pengguna.", error: e.message });
    }
});

// ============================================================
// MEMBERS CRUD
// ============================================================

app.get("/api/admin/members", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', name: 'Aca', role: 'Kapten', price: 25000, image_url: 'img/member/aca.webp', details: { sifat: 'Ceria', hobi: 'Menari', jiko: 'Halo!' }, display_order: 1 },
            { id: '2', name: 'Sinta', role: 'Member', price: 25000, image_url: 'img/member/sinta.webp', details: { sifat: 'Ramah', hobi: 'Nyanyi', jiko: 'Hai!' }, display_order: 2 }
        ]);
    }
    try {
        const { data, error } = await supabase.from('members').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data member.", error: e.message });
    }
});

app.post("/api/admin/members", authenticateToken, authorizeAdmin, upload.single('image'), async (req, res) => {
    if (isDemoMode) return res.status(201).json({ message: "Member berhasil ditambahkan! (Demo)", member: { id: Date.now(), ...req.body } });

    try {
        const { name, role, price, sifat, hobi, jiko, display_order } = req.body;
        if (!name) return res.status(400).json({ message: "Nama member wajib diisi." });

        let image_url = null;
        if (req.file) {
            const fileName = `members/${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('public-images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
            if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);
            const { data: urlData } = supabase.storage.from('public-images').getPublicUrl(fileName);
            image_url = urlData.publicUrl;
        }

        const { data, error } = await supabase.from('members').insert([{
            name, role: role || 'Member', price: parseInt(price) || 25000,
            image_url, details: { sifat, hobi, jiko }, display_order: parseInt(display_order) || 99, is_active: true
        }]).select().single();

        if (error) throw error;
        res.status(201).json({ message: "Member berhasil ditambahkan!", member: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambah member.", error: e.message });
    }
});

app.put("/api/admin/members/:id", authenticateToken, authorizeAdmin, upload.single('image'), async (req, res) => {
    if (isDemoMode) return res.json({ message: "Member berhasil diupdate! (Demo)", member: req.body });

    try {
        const { id } = req.params;
        const { name, role, price, sifat, hobi, jiko, display_order } = req.body;

        const updates = { name, role, price: parseInt(price), details: { sifat, hobi, jiko }, display_order: parseInt(display_order) };
        if (req.file) {
            const fileName = `members/${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('public-images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
            if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);
            const { data: urlData } = supabase.storage.from('public-images').getPublicUrl(fileName);
            updates.image_url = urlData.publicUrl;
        }

        const { data, error } = await supabase.from('members').update(updates).eq('id', id).select().single();
        if (error) throw error;
        res.json({ message: "Member berhasil diupdate!", member: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal update member.", error: e.message });
    }
});

app.delete("/api/admin/members/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Member berhasil dihapus! (Demo)" });
    try {
        const { id } = req.params;
        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: "Member berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus member.", error: e.message });
    }
});

// ============================================================
// NEWS CRUD
// ============================================================

app.get("/api/admin/news", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', title: 'Jadwal Theater Bulan Ini', date: '25 Oktober 2025', content: 'Yuk nonton theater kami!', is_published: true }
        ]);
    }
    try {
        const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil berita.", error: e.message });
    }
});

app.post("/api/admin/news", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.status(201).json({ message: "Berita berhasil ditambahkan! (Demo)", news: { id: Date.now(), ...req.body } });
    try {
        const { title, content, date } = req.body;
        if (!title) return res.status(400).json({ message: "Judul berita wajib diisi." });
        const { data, error } = await supabase.from('news').insert([{ title, content, date, is_published: true }]).select().single();
        if (error) throw error;
        res.status(201).json({ message: "Berita berhasil ditambahkan!", news: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambahkan berita.", error: e.message });
    }
});

app.put("/api/admin/news/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Berita berhasil diupdate! (Demo)", news: req.body });
    try {
        const { id } = req.params;
        const { title, content, date, is_published } = req.body;
        const { data, error } = await supabase.from('news').update({ title, content, date, is_published }).eq('id', id).select().single();
        if (error) throw error;
        res.json({ message: "Berita berhasil diupdate!", news: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate berita.", error: e.message });
    }
});

app.delete("/api/admin/news/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Berita berhasil dihapus! (Demo)" });
    try {
        const { id } = req.params;
        const { error } = await supabase.from('news').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: "Berita berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus berita.", error: e.message });
    }
});

// ============================================================
// GALLERY CRUD
// ============================================================

app.get("/api/public/gallery", async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', image_url: 'img/gallery/sample1.webp', alt_text: 'Foto 1', display_order: 1 }
        ]);
    }
    try {
        const { data, error } = await supabase.from('gallery').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil galeri.", error: e.message });
    }
});

app.post("/api/admin/gallery", authenticateToken, authorizeAdmin, upload.single('image'), async (req, res) => {
    if (isDemoMode) return res.status(201).json({ message: "Foto berhasil ditambahkan! (Demo)" });

    try {
        const { alt_text, display_order } = req.body;
        if (!req.file) return res.status(400).json({ message: "File gambar wajib diupload." });

        const fileName = `gallery/${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('public-images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('public-images').getPublicUrl(fileName);

        const { data, error } = await supabase.from('gallery').insert([{
            image_url: urlData.publicUrl,
            alt_text: alt_text || 'Gallery Image',
            display_order: parseInt(display_order) || 99
        }]).select().single();

        if (error) throw error;
        res.status(201).json({ message: "Foto berhasil ditambahkan!", gallery: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambah foto.", error: e.message });
    }
});

app.delete("/api/admin/gallery/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Foto berhasil dihapus! (Demo)" });
    try {
        const { id } = req.params;
        const { error } = await supabase.from('gallery').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: "Foto berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus foto.", error: e.message });
    }
});

// ============================================================
// RESET PASSWORD ENDPOINTS
// ============================================================


// Memory storage untuk reset codes
const resetCodes = new Map();
const generateResetCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Self-service OTP Generation
app.post("/api/verify-and-generate-otp", async (req, res) => {
    if (isDemoMode) {
        const code = generateResetCode();
        resetCodes.set(code, { userId: 1, username: 'demo_user', expiresAt: Date.now() + 300000 });
        return res.json({ success: true, message: "Verifikasi berhasil! (Demo)", code: code, expiresIn: "05:00", username: "demo_user" });
    }
    try {
        const { whatsapp, email } = req.body;
        console.log(`[OTP Attempt] Email: ${email}, WA: ${whatsapp}`); // Debug Log

        if (!whatsapp || !email) return res.status(400).json({ message: "Nomor WhatsApp dan Email wajib diisi." });

        // Cari user by Email (lebih aman karena unik)
        const { data: user, error } = await supabase.from('pengguna')
            .select('id, nama_pengguna, email, nomor_whatsapp')
            .eq('email', email)
            .single();

        if (error || !user) return res.status(404).json({ message: "Email tidak ditemukan." });

        // Normalisasi nomor HP untuk perbandingan (abaikan perbedaan 08 vs 62)
        const normalize = (phone) => {
            if (!phone) return "";
            let p = phone.toString().replace(/\D/g, ''); // Hapus non-digit
            if (p.startsWith('62')) p = '0' + p.substring(2); // Ubah 62 jadi 0
            if (p.startsWith('8')) p = '0' + p; // Handle 8xxx jadi 08xxx
            return p;
        };

        const dbWA = normalize(user.nomor_whatsapp);
        const inputWA = normalize(whatsapp);

        if (dbWA !== inputWA) {
            return res.status(400).json({ message: "Nomor WhatsApp tidak cocok dengan Email tersebut." });
        }

        const code = generateResetCode();
        const expiresAt = Date.now() + (5 * 60 * 1000); // 5 menit
        resetCodes.set(code, { userId: user.id, username: user.nama_pengguna, expiresAt });

        res.json({ success: true, message: "Verifikasi berhasil!", code, expiresIn: "05:00", username: user.nama_pengguna });
    } catch (e) {
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});

// Endpoint: Force Reset Password to '123456'
app.post("/api/admin/reset-user-password", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Password berhasil direset ke 123456! (Demo)" });

    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "User ID tidak ditemukan." });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash("123456", salt);

        const { error } = await supabase.from('pengguna').update({ kata_sandi: hash }).eq('id', userId);
        if (error) throw error;

        res.json({ message: "Password berhasil direset ke 123456!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal reset password.", error: e.message });
    }
});

// Endpoint: Admin Generate OTP Manual
app.post("/api/admin/generate-reset-code", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ code: '123456', message: "Code generated (Demo)" });

    try {
        const { userId } = req.body;
        const { data: user, error } = await supabase.from('pengguna').select('id, nama_pengguna').eq('id', userId).single();

        if (error || !user) return res.status(404).json({ message: "User tidak ditemukan." });

        const code = generateResetCode();
        const expiresAt = Date.now() + (5 * 60 * 1000); // 5 menit
        resetCodes.set(code, { userId: user.id, username: user.nama_pengguna, expiresAt });

        res.json({ success: true, code, message: "OTP Berhasil Digenerate" });
    } catch (e) {
        res.status(500).json({ message: "Server error", error: e.message });
    }
});

// Endpoint: Admin Get Gallery (Mirror Public)
app.get("/api/admin/gallery", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', image_url: 'img/gallery/sample1.webp', alt_text: 'Foto 1', display_order: 1 }
        ]);
    }
    try {
        const { data, error } = await supabase.from('gallery').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil galeri.", error: e.message });
    }
});



// Reset Password with OTP Code
app.post("/api/reset-password-with-code", async (req, res) => {
    try {
        const { code, newPassword } = req.body;
        if (!code || !newPassword) return res.status(400).json({ message: "Kode dan password baru wajib diisi." });
        if (newPassword.length < 6) return res.status(400).json({ message: "Password minimal 6 karakter." });

        const resetData = resetCodes.get(code);
        if (!resetData) return res.status(400).json({ message: "Kode tidak valid atau sudah digunakan." });
        if (Date.now() > resetData.expiresAt) {
            resetCodes.delete(code);
            return res.status(400).json({ message: "Kode sudah kadaluarsa." });
        }

        if (isDemoMode) {
            resetCodes.delete(code);
            return res.json({ message: "Password berhasil diubah! (Demo)", username: resetData.username });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);
        const { error } = await supabase.from('pengguna').update({ kata_sandi: password_hash }).eq('id', resetData.userId);
        if (error) throw error;

        resetCodes.delete(code);
        res.json({ message: "Password berhasil diubah!", username: resetData.username });
    } catch (e) {
        res.status(500).json({ message: "Gagal mereset password.", error: e.message });
    }
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
