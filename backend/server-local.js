// ================================================================
// BERKAS: server-local.js - Server Pengembangan Lokal
// Menyediakan layanan berkas statis dan titik akhir API (Endpoint)
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
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const morgan = require("morgan");

// ============================================================
// KONFIGURASI: PENCATATAN (Logger Winston)
// ============================================================
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ],
});

// Konfigurasi Multer untuk pengunggahan ke Supabase
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya berkas gambar yang diperbolehkan!'), false);
        }
    }
});

const app = express();

// ============================================================
// PERANTARA (MIDDLEWARE): KEAMANAN & KINERJA
// ============================================================

// 1. Header Keamanan (Helmet)
app.use(helmet({
    contentSecurityPolicy: false, // Nonaktifkan CSP sementara untuk mengizinkan skrip inline
}));

// 2. Kompresi (Gzip)
app.use(compression());

// 3. Pembatasan Laju (100 permintaan per 15 menit)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Terlalu banyak permintaan, silakan coba lagi nanti." }
});
app.use('/api/', limiter); // Terapkan batas hanya ke API

// 4. Pencatatan (Morgan terhubung ke Winston)
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 5. CORS (Strict)
app.use(cors({
    origin: '*', // TODO: Ubah ke domain spesifik saat produksi
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Data produk dari data.json
const productData = require('../data.json');

// ============================================================
// VALIDASI VARIABEL LINGKUNGAN (ENVIRONMENT VARIABLES)
// Jika tidak ada .env, server berjalan dalam Mode Demo
// ============================================================
const requiredEnv = ['MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    console.warn(`\n⚠️  Berjalan dalam MODE DEMO. Variabel lingkungan hilang: ${missingEnv.join(', ')}`);
    console.warn(`   Buat .env di root untuk fungsionalitas penuh.\n`);
}

// ============================================================
// INISIALISASI KLIEN (Midtrans & Supabase)
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
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE (Bypass RLS)' : 'ANON (Restricted)';
    console.log(`[INIT] Klien Supabase menggunakan kunci: ${keyType}`);
    supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
}

// ============================================================
// PERANTARA (MIDDLEWARE): OTENTIKASI & OTORISASI
// Memverifikasi token JWT untuk rute yang dilindungi
// ============================================================
const authenticateToken = (req, res, next) => {
    if (isDemoMode) {
        // Pengguna tiruan untuk demo
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

// Pembantu: Mengambil data stok waktu-nyata dari Supabase
const getChekiStock = async () => {
    if (isDemoMode) return 100;

    const { data, error } = await supabase.from('pengaturan').select('nilai').eq('nama', 'stok_cheki').single();
    if (error || !data) return 0;
    return parseInt(data.nilai, 10);
};

// Menyajikan Berkas Statis dari direktori induk
app.use(express.static(path.join(__dirname, '..')));

// ============================================================
// TITIK AKHIR API (API ENDPOINTS)
// ============================================================

// Titik Akhir: Mendapatkan Kunci Klien Midtrans
app.get("/api/midtrans-client-key", (req, res) => {
    if (isDemoMode) return res.json({ clientKey: 'demo_client_key' });
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
});

// ============================================================
// TITIK AKHIR AUTENTIKASI
// ============================================================

// Titik Akhir: Pendaftaran Pengguna Baru
app.post("/api/register", async (req, res) => {
    if (isDemoMode) {
        return res.status(201).json({
            message: "Registrasi berhasil! (Mode Demo)",
            user: { id: 1, nama_pengguna: req.body.username, email: req.body.email }
        });
    }

    try {
        const { username, email, password, whatsapp_number, instagram_username, oshi } = req.body;

        // Memvalidasi masukan
        if (!username || !email || !password || !whatsapp_number) {
            return res.status(400).json({ message: "Data wajib diisi (Username, Email, Password, WA)." });
        }
        if (password.length < 6) return res.status(400).json({ message: "Password minimal 6 karakter." });

        // Mengenkripsi kata sandi
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Memasukkan data ke basis data
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

// Titik Akhir: Masuk Pengguna
app.post("/api/login", async (req, res) => {
    if (isDemoMode) {
        const demoToken = jwt.sign(
            { userId: 1, username: 'demo_user', email: req.body.email, role: 'user', oshi: 'Aca' },
            'demo_secret', { expiresIn: '1d' }
        );
        return res.json({
            message: "Login berhasil! (Mode Demo)",
            token: demoToken,
            user: { id: 1, nama_pengguna: 'demo_user', email: req.body.email, peran: 'user', oshi: 'Aca' }
        });
    }

    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Masukan tidak boleh kosong." });

        // Mencari pengguna berdasarkan email atau nama pengguna
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
// UPDATED V2: Fetch from normalized `products` table
app.get("/api/products-and-stock", async (req, res) => {
    try {
        let responseData = JSON.parse(JSON.stringify(productData));

        if (!isDemoMode) {
            try {
                // Fetch ALL dynamic data from Supabase in parallel
                const [productsRes, settingsRes, newsRes, galleryRes] = await Promise.all([
                    supabase.from('products').select('*, members(name, role, image_url, details)').eq('is_active', true).order('created_at', { ascending: true }),
                    supabase.from('pengaturan').select('nama, nilai'),
                    supabase.from('news').select('title, content, date').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
                    supabase.from('gallery').select('image_url, alt_text, category').eq('is_active', true).order('display_order', { ascending: true })
                ]);

                // Parse settings into object
                const settings = {};
                (settingsRes.data || []).forEach(s => { settings[s.nama] = s.nilai; });

                // Process Products from new table
                const allProducts = productsRes.data || [];
                const groupProduct = allProducts.find(p => p.category === 'cheki_group');
                const memberProducts = allProducts.filter(p => p.category === 'cheki_member');

                // Transform Group Cheki
                if (groupProduct) {
                    responseData.group_cheki = {
                        id: groupProduct.id,
                        name: groupProduct.name || 'Cheki Grup',
                        image: groupProduct.image_url || 'img/member/group.webp',
                        price: groupProduct.price,
                        stock: groupProduct.stock
                    };
                }

                // Transform Individual Members (now from products table)
                const dbMembers = memberProducts.map(p => ({
                    id: p.id,
                    name: p.name.replace('Cheki ', ''), // Remove prefix for display
                    role: p.members?.role || 'Member',
                    image: p.image_url || p.members?.image_url || `img/member/placeholder.webp`,
                    price: p.price,
                    stock: p.stock,
                    details: p.members?.details || {}
                }));

                // Transform News
                const dbNews = newsRes.data || [];

                // Transform Gallery - filter carousel images
                const dbGallery = (galleryRes.data || [])
                    .filter(g => !g.category || g.category === 'carousel')
                    .map(g => ({
                        src: g.image_url,
                        alt: g.alt_text
                    }));

                // Override JSON data if DB has data
                if (dbMembers.length > 0) responseData.members = dbMembers;
                if (dbNews.length > 0) responseData.news = dbNews;
                if (dbGallery.length > 0) responseData.gallery = dbGallery;

                // Add event info from settings
                responseData.event = {
                    tanggal: settings.event_tanggal || null,
                    lokasi: settings.event_lokasi || null,
                    lineup: settings.event_lineup || null
                };

                // Total stock (sum of all active products)
                responseData.cheki_stock = allProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
            } catch (dbError) {
                console.error("DB Fetch Error (using JSON fallback):", dbError.message);
                responseData.cheki_stock = await getChekiStock();
            }
        } else {
            responseData.cheki_stock = await getChekiStock();
        }

        res.json(responseData);
    } catch (e) {
        res.status(500).json({ message: "Tidak dapat memuat data produk." });
    }
});

// ============================================================
// TITIK AKHIR PEMBAYARAN (Integrasi Midtrans)
// ============================================================

// Titik Akhir: Membuat Token Transaksi (Midtrans Snap)
// Versi 2: Menyimpan rincian pesanan ke tabel order_items (Normalisasi Data)
app.post("/get-snap-token", authenticateToken, async (req, res) => {
    if (isDemoMode) return res.json({ token: 'demo_snap_token_' + Date.now() });

    try {
        const { transaction_details, item_details, customer_details } = req.body;

        // --- KRUSIAL: VERIFIKASI KETERSEDIAAN STOK ---
        // Mencegah penjualan melebihi stok yang tersedia (overselling)
        // ketika terjadi permintaan tinggi secara bersamaan (Race Condition).
        for (const item of item_details) {
            const { data: product, error } = await supabase
                .from('products')
                .select('stock, name')
                .eq('id', item.id) // ID item harus sesuai dengan ID produk di database
                .single();

            if (error || !product) {
                return res.status(400).json({ message: `Produk tidak ditemukan: ${item.name}` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Stok tidak cukup untuk ${product.name}. Tersisa: ${product.stock}, diminta: ${item.quantity}`
                });
            }
        }
        // ---------------------------------------------

        const enhanced_customer_details = { ...customer_details, first_name: req.user.username, email: req.user.email };

        const parameter = {
            transaction_details,
            item_details,
            customer_details: enhanced_customer_details,
            enabled_payments: ['qris', 'gopay', 'shopeepay', 'other_qris', 'credit_card', 'bca_va']
        };

        const token = await snap.createTransactionToken(parameter);
        const orderId = transaction_details.order_id;

        // 1. Menyimpan data utama pesanan ke tabel 'pesanan'
        const { error: orderError } = await supabase.from("pesanan").insert([{
            id_pesanan: orderId,
            id_pengguna: req.user.userId,
            nama_pelanggan: req.user.username,
            total_harga: transaction_details.gross_amount,
            status_tiket: 'pending',
            detail_item: item_details // Simpan JSON untuk kompatibilitas mundur (backward compatibility)
        }]);
        if (orderError) throw new Error(`Basis Data Error: ${orderError.message}`);

        // 2. Menyimpan rincian item ke tabel 'order_items' (Normalisasi Database)
        const orderItemsToInsert = item_details.map(item => ({
            order_id: orderId,
            product_id: item.id, // ID produk dari tabel products
            quantity: item.quantity,
            price_at_purchase: item.price,
            subtotal: item.quantity * item.price
        }));

        const { error: itemsError } = await supabase.from("order_items").insert(orderItemsToInsert);
        if (itemsError) console.warn("Peringatan Insert Order Items:", itemsError.message); // Tidak memblokir proses

        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: "Gagal membuat token pembayaran.", error: error.message });
    }
});

// Titik Akhir: Memperbarui Status Pesanan (Webhook/Callback)
// Versi 2: Mengurangi stok produk secara permanen setelah pembayaran berhasil
app.post("/update-order-status", async (req, res) => {
    if (isDemoMode) return res.status(200).json({ message: "OK (Mode Demo)" });

    try {
        const { order_id, transaction_status } = req.body;
        if (!order_id || !transaction_status) return res.status(400).json({ message: "Muatan data (payload) tidak valid" });

        // Memperbarui status tiket menjadi 'berlaku' jika pembayaran berhasil
        if (transaction_status === "settlement" || transaction_status === "capture") {
            const { error: updateError } = await supabase
                .from("pesanan").update({ status_tiket: "berlaku" })
                .eq("id_pesanan", order_id);

            if (updateError) throw new Error("Update failed");

            // Kurangi stok per produk di tabel products
            const { data: orderItems } = await supabase
                .from("order_items")
                .select("product_id, quantity")
                .eq("order_id", order_id);

            if (orderItems && orderItems.length > 0) {
                for (const item of orderItems) {
                    await supabase.rpc('decrement_product_stock', {
                        p_product_id: item.product_id,
                        p_quantity: item.quantity
                    });
                }
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

// Endpoint: Admin Stats (Detailed for Chart)
// UPDATED V2: Use order_items table for proper SQL aggregation
app.get("/api/admin/stats", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) {
        return res.json({
            totalRevenue: 1500000,
            totalCheki: 50,
            chekiPerMember: { 'Aca': 20, 'Sinta': 15, 'Cissi': 15 }
        });
    }
    try {
        // 1. Total Revenue
        const { data: revenueData } = await supabase
            .from('pesanan')
            .select('total_harga')
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);
        const totalRevenue = (revenueData || []).reduce((sum, o) => sum + o.total_harga, 0);

        // 2. Aggregasi per Produk dari order_items (NORMALIZED!)
        const { data: itemStats } = await supabase
            .from('order_items')
            .select('quantity, products(name)');

        let totalCheki = 0;
        const chekiPerMember = {};
        (itemStats || []).forEach(item => {
            totalCheki += item.quantity;
            const productName = item.products?.name?.replace('Cheki ', '') || 'Unknown';
            chekiPerMember[productName] = (chekiPerMember[productName] || 0) + item.quantity;
        });

        res.json({ totalRevenue, totalCheki, chekiPerMember });
    } catch (e) {
        res.status(500).json({ message: 'Gagal mengambil statistik.', error: e.message });
    }
});

// Endpoint: Admin Dashboard Stats (Summary)
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

// Endpoint: Update Cheki Stock (updates products table directly)
app.post('/api/admin/update-cheki-stock', authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: 'Stok berhasil diperbarui! (Demo)', newStock: 100 });
    try {
        const { changeValue } = req.body;
        if (typeof changeValue !== 'number') return res.status(400).json({ message: 'Nilai tidak valid.' });

        // Get all active products
        const { data: products, error: fetchError } = await supabase
            .from('products')
            .select('id, stock')
            .eq('is_active', true);

        if (fetchError) throw new Error(`Gagal ambil produk: ${fetchError.message}`);
        if (!products || products.length === 0) {
            return res.status(400).json({ message: 'Tidak ada produk aktif.' });
        }

        // Distribute change evenly across all products, apply remainder to first product
        const perProductChange = Math.floor(changeValue / products.length);
        const remainder = changeValue % products.length;

        // Update each product
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const additionalChange = i === 0 ? remainder : 0;
            const newStock = Math.max(0, (product.stock || 0) + perProductChange + additionalChange);

            const { error: updateError } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', product.id);

            if (updateError) throw new Error(`Gagal update stok produk: ${updateError.message}`);
        }

        // Calculate new total stock
        const { data: updatedProducts } = await supabase
            .from('products')
            .select('stock')
            .eq('is_active', true);

        const newStock = (updatedProducts || []).reduce((sum, p) => sum + (p.stock || 0), 0);
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
// SETTINGS/PENGATURAN CRUD
// ============================================================

// GET: All Settings
app.get("/api/admin/settings", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { nama: 'stok_cheki', nilai: '100' },
            { nama: 'harga_cheki_member', nilai: '25000' },
            { nama: 'harga_cheki_grup', nilai: '30000' },
            { nama: 'event_tanggal', nilai: '2026-02-14' },
            { nama: 'event_lokasi', nilai: 'Jakarta' },
            { nama: 'event_lineup', nilai: 'Aca,Sinta,Cissi' }
        ]);
    }
    try {
        const { data, error } = await supabase.from('pengaturan').select('*');
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil pengaturan.", error: e.message });
    }
});

// PUT: Update Setting (upsert)
// PUT: Update Setting (upsert)
app.put("/api/admin/settings", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Pengaturan berhasil diupdate! (Demo)" });

    try {
        const { nama, nilai } = req.body;
        if (!nama) return res.status(400).json({ message: "Nama setting wajib diisi." });

        // Upsert: insert if not exists, update if exists
        const { data, error } = await supabase
            .from('pengaturan')
            .upsert({ nama, nilai }, { onConflict: 'nama' })
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Pengaturan berhasil diupdate!", setting: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate pengaturan.", error: e.message });
    }
});

// PUT: Bulk Update Settings
app.put("/api/admin/settings/bulk", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Pengaturan berhasil diupdate! (Demo)" });

    try {
        const { settings } = req.body;
        if (!settings || !Array.isArray(settings)) {
            return res.status(400).json({ message: "Format settings tidak valid." });
        }

        // Process all updates in parallel
        await Promise.all(settings.map(async (item) => {
            const { nama, nilai } = item;
            if (nama) {
                // 1. Update Settings Table
                const { error } = await supabase
                    .from('pengaturan')
                    .upsert({ nama, nilai }, { onConflict: 'nama' });
                if (error) throw error;

                // 2. Sync Price to Products Table if related to price
                if (nama === 'harga_cheki_member') {
                    await supabase
                        .from('products')
                        .update({ price: parseInt(nilai, 10) })
                        .eq('category', 'cheki_member');
                } else if (nama === 'harga_cheki_grup') {
                    await supabase
                        .from('products')
                        .update({ price: parseInt(nilai, 10) })
                        .eq('category', 'cheki_group');
                }
            }
        }));

        res.json({ message: "Pengaturan berhasil diperbarui." });
    } catch (e) {
        res.status(500).json({ message: "Gagal memperbarui pengaturan.", error: e.message });
    }
});



// ===================================
// --- EVENTS CRUD API ---
// ===================================

// GET: All Events (Admin)
app.get("/api/admin/events", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', nama: 'Demo Event', tanggal: '2026-02-01', lokasi: 'Demo Location', lineup: 'Member1, Member2', is_active: true }
        ]);
    }
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('tanggal', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data events.", error: e.message });
    }
});

// GET: Active Events (Public)
app.get("/api/public/events", async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', nama: 'Demo Event', tanggal: '2026-02-01', lokasi: 'Demo Location', lineup: 'Member1, Member2' }
        ]);
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_active', true)
            .gte('tanggal', today)
            .order('tanggal', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data events.", error: e.message });
    }
});

// GET: Next Upcoming Event (Public) - for homepage
app.get("/api/public/next-event", async (req, res) => {
    if (isDemoMode) {
        return res.json({ id: '1', nama: 'Demo Event', tanggal: '2026-02-01', lokasi: 'Demo Location', lineup: 'Member1, Member2' });
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_active', true)
            .gte('tanggal', today)
            .order('tanggal', { ascending: true })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        res.json(data || null);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil next event.", error: e.message });
    }
});

// POST: Create Event (Admin)
app.post("/api/admin/events", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.status(201).json({ message: "Event berhasil ditambahkan! (Demo)", event: { id: 'demo-' + Date.now(), ...req.body } });

    try {
        const { nama, tanggal, lokasi, lineup, deskripsi } = req.body;

        if (!nama || !tanggal) {
            return res.status(400).json({ message: "Nama dan tanggal event wajib diisi." });
        }

        const { data, error } = await supabase
            .from('events')
            .insert([{
                nama,
                tanggal,
                lokasi: lokasi || null,
                lineup: lineup || null,
                deskripsi: deskripsi || null,
                is_active: true
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: "Event berhasil ditambahkan!", event: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambahkan event.", error: e.message });
    }
});

// PUT: Update Event (Admin)
app.put("/api/admin/events/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Event berhasil diupdate! (Demo)", event: { id: req.params.id, ...req.body } });

    try {
        const { id } = req.params;
        const { nama, tanggal, lokasi, lineup, deskripsi, is_active } = req.body;

        if (!nama || !tanggal) {
            return res.status(400).json({ message: "Nama dan tanggal event wajib diisi." });
        }

        const { data, error } = await supabase
            .from('events')
            .update({
                nama,
                tanggal,
                lokasi: lokasi || null,
                lineup: lineup || null,
                deskripsi: deskripsi || null,
                is_active: is_active !== undefined ? is_active : true,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Event berhasil diupdate!", event: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate event.", error: e.message });
    }
});

// DELETE: Delete Event (Admin)
app.delete("/api/admin/events/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Event berhasil dihapus! (Demo)" });

    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: "Event berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus event.", error: e.message });
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
            const fileName = `member/${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
            // UPLOAD KE BUCKET 'public-images' FOLDER 'member'
            const { error: uploadError } = await supabase.storage.from('public-images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
            if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);

            // GET PUBLIC URL
            const { data: urlData } = supabase.storage.from('public-images').getPublicUrl(fileName);
            image_url = urlData.publicUrl;
        }

        const { data, error } = await supabase.from('members').insert([{
            name, role: role || 'Member',
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

        const updates = {
            name,
            role,
            details: { sifat: sifat || '', hobi: hobi || '', jiko: jiko || '' },
            display_order: parseInt(display_order) || 0
        };
        console.log(`[DEBUG] Updating member ${id} with:`, updates); // Debug Log

        if (req.file) {
            const fileName = `member/${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('public-images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
            if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);
            const { data: urlData } = supabase.storage.from('public-images').getPublicUrl(fileName);
            updates.image_url = urlData.publicUrl;
        }

        const { data, error } = await supabase.from('members').update(updates).eq('id', id).select().single();
        if (error) {
            console.error("[SUPABASE ERROR] Member update:", error); // Debug Log
            throw error;
        }
        res.json({ message: "Member berhasil diupdate!", member: data });
    } catch (e) {
        console.error("[SERVER ERROR] Gagal update member:", e); // Debug Log
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
        const { alt_text, display_order, category } = req.body;
        if (!req.file) return res.status(400).json({ message: "File gambar wajib diupload." });

        const fileName = `gallery/${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
        // UPLOAD KE BUCKET 'public-images' FOLDER 'gallery'
        const { error: uploadError } = await supabase.storage.from('public-images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('public-images').getPublicUrl(fileName);

        const { data, error } = await supabase.from('gallery').insert([{
            image_url: urlData.publicUrl,
            alt_text: alt_text || 'Gallery Image',
            display_order: parseInt(display_order) || 99,
            category: category || 'carousel',  // carousel, dokumentasi, member
            is_active: true
        }]).select().single();

        if (error) throw error;
        res.status(201).json({ message: "Foto berhasil ditambahkan!", gallery: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambah foto.", error: e.message });
    }
});

// PUT: Update Gallery Item (edit category, alt_text, display_order)
app.put("/api/admin/gallery/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    if (isDemoMode) return res.json({ message: "Foto berhasil diupdate! (Demo)", gallery: req.body });

    try {
        const { id } = req.params;
        const { alt_text, display_order, category, is_active } = req.body;

        const updateData = {};
        if (alt_text !== undefined) updateData.alt_text = alt_text;
        if (display_order !== undefined) updateData.display_order = parseInt(display_order);
        if (category !== undefined) updateData.category = category;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data, error } = await supabase.from('gallery')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Foto berhasil diupdate!", gallery: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate foto.", error: e.message });
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
// FALLBACK ROUTE & 404 HANDLER
// ============================================================

// 1. Handle 404 for API specifically (Return JSON)
app.use('/api', (req, res) => {
    res.status(404).json({ message: "Endpoint API tidak ditemukan." });
});

// 2. Serve index.html untuk Frontend SPA (React-like behavior)
app.get('*', (req, res) => {
    const filePath = path.join(__dirname, '..', req.path);

    // Coba kirim file statis dulu
    res.sendFile(filePath, (err) => {
        if (err) {
            // Jika file tidak ada, kirim index.html
            res.sendFile(path.join(__dirname, '..', 'index.html'));
        }
    });
});

// ============================================================
// START SERVER
// Edit PORT di sini jika diperlukan (default: 3000)
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    =============================================
    🚀 REFRESH BREEZE SERVER
    =============================================
    🌐 URL       : http://localhost:${PORT}
    🛠️  Mode      : ${isDemoMode ? 'DEMO (mock data)' : 'PRODUCTION (Supabase Connected)'}
    📅 Waktu     : ${new Date().toLocaleString()}
    =============================================
    ✅ Server Backend Siap!
    `);
});

module.exports = app;
