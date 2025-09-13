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
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email dan password wajib diisi.' });
        }

        // 1. Cari pengguna berdasarkan email
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: 'Email tidak ditemukan.' });
        }

        // 2. Bandingkan password yang diinput dengan hash di database
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password salah.' });
        }

        // 3. Buat Token Sesi (JWT)
        const payload = {
            userId: user.id,
            username: user.username,
            email: user.email
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }); // Token berlaku 1 hari

        // Hapus hash password dari data yang dikirim kembali
        delete user.password_hash;

        res.json({
            message: 'Login berhasil!',
            token,
            user
        });

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