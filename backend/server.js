// File: backend/server.js
// Versi Final: Integrasi Oshi, Leaderboard, dan Payment Gateway

const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const productData = require('../data.json');
require("dotenv").config();

// Multer config for memory storage (we'll upload to Supabase)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. Validasi Environment Variables ---
const requiredEnv = ['MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`Kesalahan: Variabel lingkungan berikut belum diatur: ${missingEnv.join(', ')}`);
    process.exit(1);
}

// --- 2. Inisialisasi Klien ---
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- 3. Middleware Otentikasi & Otorisasi ---
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

// --- 4. Fungsi Helper ---
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

// --- Konfigurasi Midtrans ---
app.get("/api/midtrans-client-key", (req, res) => {
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
});

// --- Otentikasi (Updated: Oshi Support) ---
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password, whatsapp_number, instagram_username, oshi } = req.body;

        if (!username || !email || !password || !whatsapp_number) {
            return res.status(400).json({ message: "Data wajib diisi (Username, Email, Password, WA)." });
        }

        if (password.length < 6) return res.status(400).json({ message: "Password minimal 6 karakter." });

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // UPDATE: Menyimpan 'oshi' ke database
        const { data, error } = await supabase.from("pengguna").insert([{
            nama_pengguna: username,
            email,
            kata_sandi: password_hash,
            nomor_whatsapp: whatsapp_number,
            instagram: instagram_username || null,
            oshi: oshi || 'All Member', // Default value
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

        // UPDATE: Menyertakan 'oshi' dalam token payload dan response
        const payload = {
            userId: user.id,
            username: user.nama_pengguna,
            email: user.email,
            role: user.peran,
            oshi: user.oshi
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        delete user.kata_sandi;
        res.json({ message: "Login berhasil!", token, user });
    } catch (e) {
        res.status(500).json({ message: "Kesalahan pada server.", error: e.message });
    }
});

// --- LEADERBOARD API (BARU) ---

// 1. Global Leaderboard (Total Cheki Dibeli)
app.get("/api/leaderboard", async (req, res) => {
    try {
        const { data: orders, error } = await supabase
            .from('pesanan')
            .select('detail_item, id_pengguna, pengguna(nama_pengguna, oshi)')
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);

        if (error) throw error;

        // Pastikan orders adalah array
        if (!orders || !Array.isArray(orders)) {
            return res.json([]);
        }

        const userTotals = {};
        orders.forEach(order => {
            const uid = order.id_pengguna;
            if (!uid) return; // Skip jika tidak ada id_pengguna

            if (!userTotals[uid]) {
                userTotals[uid] = {
                    username: order.pengguna?.nama_pengguna || 'Unknown',
                    oshi: order.pengguna?.oshi || '-',
                    totalCheki: 0
                };
            }

            // Hitung total cheki dari detail_item
            const items = order.detail_item || [];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    userTotals[uid].totalCheki += (item.quantity || 0);
                });
            }
        });

        // Urutkan dari terbanyak cheki
        const leaderboard = Object.values(userTotals)
            .sort((a, b) => b.totalCheki - a.totalCheki)
            .slice(0, 10); // Ambil Top 10

        res.json(leaderboard);
    } catch (e) {
        console.error("Leaderboard API Error:", e);
        res.status(500).json({ message: "Gagal memuat leaderboard.", error: e.message });
    }
});

// 2. Leaderboard Per Member (Total Tiket Member X)
app.get("/api/leaderboard-per-member", async (req, res) => {
    try {
        const { memberName } = req.query; // contoh: ?memberName=Aca
        if (!memberName) return res.status(400).json({ message: "Nama member diperlukan." });

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

// --- Produk & Pembayaran ---
// UPDATED: Fetch prices from pengaturan table
app.get("/api/products-and-stock", async (req, res) => {
    try {
        // Fetch ALL dynamic data from Supabase in parallel
        const [settingsRes, membersRes, newsRes, galleryRes] = await Promise.all([
            supabase.from('pengaturan').select('nama, nilai'),
            supabase.from('members').select('*').eq('is_active', true).order('display_order', { ascending: true }),
            supabase.from('news').select('title, content, date').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
            supabase.from('gallery').select('image_url, alt_text, category').eq('is_active', true).order('display_order', { ascending: true })
        ]);

        // Log errors for debugging
        if (membersRes.error) console.error("Members fetch error:", membersRes.error);

        // Parse settings into object
        const settings = {};
        (settingsRes.data || []).forEach(s => { settings[s.nama] = s.nilai; });

        // Get prices from settings
        const hargaMember = parseInt(settings.harga_cheki_member) || 25000;
        const hargaGrup = parseInt(settings.harga_cheki_grup) || 30000;

        // Separate group and individual members
        const allMembers = membersRes.data || [];
        const groupMember = allMembers.find(m => m.member_type === 'group');
        const individualMembers = allMembers.filter(m => m.member_type !== 'group');

        // Transform Group Cheki (price from pengaturan)
        const groupCheki = groupMember ? {
            id: 'grup',
            name: groupMember.name || 'Grup',
            image: groupMember.image_url || 'img/member/group.webp',
            price: hargaGrup
        } : productData.group_cheki || {};

        // Transform Individual Members (price from pengaturan)
        const members = individualMembers.map(m => ({
            id: m.name,
            name: m.name,
            role: m.role,
            image: m.image_url || `img/member/placeholder.webp`,
            price: hargaMember,
            details: m.details || {}
        }));

        // Transform News
        const news = newsRes.data || [];

        // Transform Gallery - filter carousel images
        const galleryData = galleryRes.data || [];
        const gallery = galleryData
            .filter(g => !g.category || g.category === 'carousel')
            .map(g => ({
                src: g.image_url,
                alt: g.alt_text
            }));

        // Build response with database data, fallback to data.json if empty
        const responseData = {
            // Dynamic from Database
            group: productData.group || {},
            group_cheki: groupCheki,
            members: members.length > 0 ? members : productData.members || [],
            news: news.length > 0 ? news : productData.news || [],
            gallery: gallery.length > 0 ? gallery : productData.gallery || [],

            // Static from data.json (rarely changes)
            how_to_order: productData.how_to_order || [],
            faq: productData.faq || [],
            images: productData.images || {},

            // Event info from settings
            event: {
                tanggal: settings.event_tanggal || null,
                lokasi: settings.event_lokasi || null,
                lineup: settings.event_lineup || null
            },

            // Stock
            cheki_stock: parseInt(settings.stok_cheki) || 0
        };

        res.json(responseData);
    } catch (e) {
        console.error("Error fetching products:", e);
        // Fallback to data.json on error
        const responseData = JSON.parse(JSON.stringify(productData));
        responseData.cheki_stock = await getChekiStock();
        res.json(responseData);
    }
});

app.post("/get-snap-token", authenticateToken, async (req, res) => {
    try {
        const { transaction_details, item_details, customer_details } = req.body;
        const enhanced_customer_details = { ...customer_details, first_name: req.user.username, email: req.user.email };

        // PENTING: Enable payment methods termasuk QRIS
        const parameter = {
            transaction_details,
            item_details,
            customer_details: enhanced_customer_details,
            enabled_payments: [
                'qris',           // QRIS payment
                'gopay',          // GoPay
                'shopeepay',      // ShopeePay
                'other_qris',     // Other QRIS providers
                'credit_card',    // Credit Card
                'bca_va',         // BCA Virtual Account
                'bni_va',         // BNI Virtual Account
                'bri_va',         // BRI Virtual Account
                'permata_va',     // Permata Virtual Account
                'echannel',       // Mandiri Bill Payment
                'alfamart',       // Alfamart
                'indomaret'       // Indomaret
            ]
        };

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

            // Kurangi Stok
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
            .select("id, nama_pengguna, email, nomor_whatsapp, instagram, peran, oshi")
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
            .select("id, nama_pengguna, email, nomor_whatsapp, instagram, peran, oshi")
            .single();

        if (updateError) throw updateError;

        const payload = {
            userId: updatedUser.id,
            username: updatedUser.nama_pengguna,
            email: updatedUser.email,
            role: updatedUser.peran,
            oshi: updatedUser.oshi
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

app.get("/api/admin/all-users", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pengguna')
            .select('id, nama_pengguna, email, nomor_whatsapp')
            .neq('peran', 'admin');
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data pengguna.", error: e.message });
    }
});

// ===================================
// --- RESET PASSWORD DENGAN KODE OTP ---
// ===================================

// Memory storage untuk reset codes (dalam production, gunakan Redis)
const resetCodes = new Map();

// Fungsi generate kode 6 digit
const generateResetCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// ===================================
// --- SELF-SERVICE PASSWORD RESET ---
// ===================================

// Endpoint: User verifikasi identitas dan mendapatkan OTP
app.post("/api/verify-and-generate-otp", async (req, res) => {
    try {
        const { whatsapp, email } = req.body;

        if (!whatsapp || !email) {
            return res.status(400).json({ message: "Nomor WhatsApp dan Email wajib diisi." });
        }

        // Cari user dengan nomor WA DAN email yang cocok
        const { data: user, error } = await supabase
            .from('pengguna')
            .select('id, nama_pengguna, email, nomor_whatsapp')
            .eq('nomor_whatsapp', whatsapp)
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(404).json({
                message: "Data tidak ditemukan. Pastikan Nomor WhatsApp dan Email yang Anda masukkan sesuai dengan yang terdaftar."
            });
        }

        // Generate kode OTP dan set expiry 15 menit
        const code = generateResetCode();
        const expiresAt = Date.now() + (15 * 60 * 1000); // 15 menit

        // Simpan ke memory (key = code, value = userId + expiresAt)
        resetCodes.set(code, {
            userId: user.id,
            username: user.nama_pengguna,
            expiresAt: expiresAt
        });

        // Hitung sisa waktu dalam format mm:ss
        const expiresInMs = expiresAt - Date.now();
        const minutes = Math.floor(expiresInMs / 60000);
        const seconds = Math.floor((expiresInMs % 60000) / 1000);
        const expiresIn = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        res.json({
            success: true,
            message: "Verifikasi berhasil! Berikut kode OTP Anda.",
            code: code,
            expiresIn: expiresIn,
            username: user.nama_pengguna
        });

    } catch (e) {
        console.error('Error verify-and-generate-otp:', e);
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});

// Endpoint: Admin generate reset code untuk user (backup)
app.post("/api/admin/generate-reset-code", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "User ID tidak ditemukan." });

        // Cek apakah user ada
        const { data: user, error } = await supabase
            .from('pengguna')
            .select('id, nama_pengguna, email')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: "User tidak ditemukan." });
        }

        // Generate kode dan set expiry 15 menit
        const code = generateResetCode();
        const expiresAt = Date.now() + (15 * 60 * 1000); // 15 menit

        // Simpan ke memory (key = code, value = userId + expiresAt)
        resetCodes.set(code, {
            userId: user.id,
            username: user.nama_pengguna,
            expiresAt: expiresAt
        });

        // Hitung sisa waktu dalam format mm:ss
        const expiresInMs = expiresAt - Date.now();
        const minutes = Math.floor(expiresInMs / 60000);
        const seconds = Math.floor((expiresInMs % 60000) / 1000);
        const expiresIn = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        res.json({
            message: "Kode reset berhasil dibuat.",
            code: code,
            expiresAt: expiresAt,
            expiresIn: expiresIn,
            username: user.nama_pengguna
        });

    } catch (e) {
        res.status(500).json({ message: "Gagal membuat kode reset.", error: e.message });
    }
});

// Endpoint: User reset password dengan kode OTP
app.post("/api/reset-password-with-code", async (req, res) => {
    try {
        const { code, newPassword } = req.body;

        if (!code || !newPassword) {
            return res.status(400).json({ message: "Kode dan password baru wajib diisi." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password minimal 6 karakter." });
        }

        // Cek apakah kode ada dan valid
        const resetData = resetCodes.get(code);

        if (!resetData) {
            return res.status(400).json({ message: "Kode tidak valid atau sudah digunakan." });
        }

        // Cek apakah kode sudah expired
        if (Date.now() > resetData.expiresAt) {
            resetCodes.delete(code); // Hapus kode yang expired
            return res.status(400).json({ message: "Kode sudah kadaluarsa. Silakan minta kode baru ke admin." });
        }

        // Hash password baru
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        // Update password di database
        const { error } = await supabase
            .from('pengguna')
            .update({ kata_sandi: password_hash })
            .eq('id', resetData.userId);

        if (error) throw error;

        // Hapus kode setelah digunakan (sekali pakai)
        resetCodes.delete(code);

        res.json({
            message: "Password berhasil diubah! Silakan login dengan password baru Anda.",
            username: resetData.username
        });

    } catch (e) {
        res.status(500).json({ message: "Gagal mereset password.", error: e.message });
    }
});

// ===================================
// --- SETTINGS/PENGATURAN CRUD API ---
// ===================================

// GET: All Settings
app.get("/api/admin/settings", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from('pengaturan').select('*');
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil pengaturan.", error: e.message });
    }
});

// PUT: Update Setting (upsert)
app.put("/api/admin/settings", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { nama, nilai } = req.body;
        if (!nama) return res.status(400).json({ message: "Nama setting wajib diisi." });

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
    try {
        const { settings } = req.body;
        if (!settings || !Array.isArray(settings)) {
            return res.status(400).json({ message: "Format data tidak valid." });
        }

        const { error } = await supabase
            .from('pengaturan')
            .upsert(settings, { onConflict: 'nama' });

        if (error) throw error;
        res.json({ message: "Semua pengaturan berhasil diupdate!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate pengaturan.", error: e.message });
    }
});

// ===================================
// --- MEMBERS CRUD API ---
// ===================================

// GET: Semua member (Public)
app.get("/api/public/members", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data member.", error: e.message });
    }
});

// GET: Semua member untuk admin (termasuk non-active)
app.get("/api/admin/members", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data member.", error: e.message });
    }
});

// POST: Tambah member baru
app.post("/api/admin/members", authenticateToken, authorizeAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, role, price, sifat, hobi, jiko, display_order } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Nama member wajib diisi." });
        }

        let image_url = null;

        // Upload image to Supabase Storage if provided
        if (req.file) {
            const fileName = `members/${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('public-images')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);

            // Get public URL
            const { data: urlData } = supabase.storage.from('public-images').getPublicUrl(fileName);
            image_url = urlData.publicUrl;
        }

        // Insert to database
        const { data, error } = await supabase.from('members').insert([{
            name,
            role: role || 'Member',
            image_url,
            details: { sifat: sifat || '', hobi: hobi || '', jiko: jiko || '' },
            display_order: parseInt(display_order) || 0,
            is_active: true
        }]).select().single();

        if (error) throw error;
        res.status(201).json({ message: "Member berhasil ditambahkan!", member: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambahkan member.", error: e.message });
    }
});

// PUT: Update member
app.put("/api/admin/members/:id", authenticateToken, authorizeAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, price, sifat, hobi, jiko, display_order, is_active } = req.body;

        const updateData = {
            name,
            role,
            details: { sifat: sifat || '', hobi: hobi || '', jiko: jiko || '' },
            display_order: parseInt(display_order) || 0,
            is_active: is_active === 'true' || is_active === true,
            updated_at: new Date().toISOString()
        };

        // Upload new image if provided
        if (req.file) {
            const fileName = `members/${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage
                .from('public-images')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);

            const { data: urlData } = supabase.storage.from('public-images').getPublicUrl(fileName);
            updateData.image_url = urlData.publicUrl;
        }

        const { data, error } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Member berhasil diupdate!", member: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate member.", error: e.message });
    }
});

// DELETE: Hapus member
app.delete("/api/admin/members/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) throw error;

        res.json({ message: "Member berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus member.", error: e.message });
    }
});

// ===================================
// --- NEWS CRUD API ---
// ===================================

app.get("/api/public/news", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil berita.", error: e.message });
    }
});

app.get("/api/admin/news", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil berita.", error: e.message });
    }
});

app.post("/api/admin/news", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { title, content, date } = req.body;
        if (!title) return res.status(400).json({ message: "Judul berita wajib diisi." });

        const { data, error } = await supabase.from('news').insert([{
            title, content, date, is_published: true
        }]).select().single();

        if (error) throw error;
        res.status(201).json({ message: "Berita berhasil ditambahkan!", news: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambahkan berita.", error: e.message });
    }
});

app.put("/api/admin/news/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, date, is_published } = req.body;

        const { data, error } = await supabase
            .from('news')
            .update({ title, content, date, is_published })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Berita berhasil diupdate!", news: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate berita.", error: e.message });
    }
});

app.delete("/api/admin/news/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('news').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: "Berita berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus berita.", error: e.message });
    }
});

// ===================================
// --- GALLERY CRUD API ---
// ===================================

app.get("/api/public/gallery", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('gallery')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil galeri.", error: e.message });
    }
});

app.post("/api/admin/gallery", authenticateToken, authorizeAdmin, upload.single('image'), async (req, res) => {
    try {
        const { alt_text, display_order, category } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "File gambar wajib diupload." });
        }

        const fileName = `gallery/${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage
            .from('public-images')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype
            });

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
        res.status(500).json({ message: "Gagal menambahkan foto.", error: e.message });
    }
});

// PUT: Update Gallery Item (edit category, alt_text, display_order)
app.put("/api/admin/gallery/:id", authenticateToken, authorizeAdmin, async (req, res) => {
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
    try {
        const { id } = req.params;
        const { error } = await supabase.from('gallery').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: "Foto berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus foto.", error: e.message });
    }
});

// --- Server Listener ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));

module.exports = app;