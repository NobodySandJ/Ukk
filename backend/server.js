// backend/server.js

const express = require('express');
const midtransClient = require('midtrans-client');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs'); // <-- Library untuk enkripsi password
const jwt = require('jsonwebtoken'); // <-- Library untuk token sesi
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Midtrans
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Inisialisasi Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// ===== [BARU] Endpoint Registrasi Pengguna =====
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, whatsapp_number, instagram_username } = req.body;

        // Validasi input dasar
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, dan password wajib diisi.' });
        }

        // Enkripsi password sebelum disimpan
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Simpan ke database Supabase
        const { data, error } = await supabase
            .from('users')
            .insert([{
                username,
                email,
                password_hash,
                whatsapp_number,
                instagram_username
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Kode error untuk duplicate key
                return res.status(409).json({ message: 'Username atau email sudah terdaftar.' });
            }
            throw error;
        }

        res.status(201).json({ message: 'Registrasi berhasil!', user: data });

    } catch (e) {
        console.error('Gagal saat registrasi:', e.message);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: e.message });
    }
});


// ===== [BARU] Endpoint Login Pengguna =====
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body; // Kita tetap sebut 'email' dari frontend
        if (!email || !password) {
            return res.status(400).json({ message: 'Input tidak boleh kosong.' });
        }

        // 1. Cari pengguna berdasarkan email ATAU username
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${email},username.eq.${email}`) // <-- LOGIKA BARU DI SINI
            .single();

        if (error || !user) {
            return res.status(404).json({ message: 'Username atau email tidak ditemukan.' });
        }

        // ... (sisa logika login tetap sama)
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password salah.' });
        }
        
        const payload = { userId: user.id, username: user.username, email: user.email, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        delete user.password_hash;
        res.json({ message: 'Login berhasil!', token, user });

    } catch (e) {
        console.error('Gagal saat login:', e.message);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: e.message });
    }
});


// ===== [BARU] Middleware untuk memverifikasi token =====
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // Tidak ada token

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token tidak valid
        req.user = user; // Simpan data user dari token ke request
        next();
    });
}


// ===== [MODIFIKASI] Endpoint get-snap-token sekarang dilindungi =====
app.post('/get-snap-token', authenticateToken, async (req, res) => {
    try {
        const parameter = req.body.orderData; // Ambil parameter dari nested object
        const user = req.user; // Ambil data user dari token yang sudah diverifikasi

        const { data, error } = await supabase.from('orders').insert([{
            id_pesanan: parameter.transaction_details.order_id,
            total_harga: parameter.transaction_details.gross_amount,
            nama_pelanggan: parameter.customer_details.first_name,
            email_pelanggan: parameter.customer_details.email,
            kontak_pelanggan: parameter.customer_details.phone,
            detail_item: parameter.item_details,
            status_transaksi: 'pending',
            user_id: user.userId // <-- [PENTING] Menghubungkan pesanan dengan user
        }]).select();

        if (error) throw error;
        
        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token });

    } catch (e) {
        console.error("GAGAL MEMBUAT TOKEN:", e);
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});


// ===== [BARU] Endpoint untuk mengambil riwayat pesanan pengguna =====
app.get('/api/my-orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }); // Urutkan dari terbaru

        if (error) throw error;
        res.json(data);

    } catch (e) {
        console.error('Gagal mengambil pesanan:', e.message);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: e.message });
    }
});


// Endpoint update status (tidak berubah, tetap publik)
app.post('/update-order-status', async (req, res) => {
    // ... kode tetap sama ...
});

module.exports = app;

// ===== [BARU] Middleware untuk otentikasi ADMIN =====
async function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const { data: user, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', decoded.userId)
            .single();

        if (error || !user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Akses ditolak: Wajib admin.' });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Token tidak valid.' });
    }
}

// ===== [BARU] Endpoint Admin: Mengambil SEMUA pesanan =====
app.get('/api/admin/all-orders', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// ===== [BARU] Endpoint Admin: Mengubah status tiket =====
app.post('/api/admin/update-ticket-status', authenticateAdmin, async (req, res) => {
    const { order_id, new_status } = req.body;
    if (!order_id || !new_status) {
        return res.status(400).json({ message: 'Order ID dan status baru diperlukan.' });
    }

    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ status_tiket: new_status })
            .eq('id_pesanan', order_id)
            .select();
        if (error) throw error;
        res.json({ message: 'Status tiket berhasil diupdate!', updatedOrder: data });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// ===== [BARU] Endpoint Admin: Statistik =====
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const { data: orders, error } = await supabase.from('orders').select('total_harga, detail_item');
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

    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = app;