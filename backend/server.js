// backend/server.js

const express = require('express');
const midtransClient = require('midtrans-client');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend'); // <-- Impor Resend
const QRCode = require('qrcode'); // <-- Impor QRCode
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

// Inisialisasi Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Endpoint untuk membuat Snap Token (Tidak ada perubahan di sini)
app.post('/get-snap-token', async (req, res) => {
    const parameter = req.body;
    try {
        const { data, error } = await supabase.from('orders').insert([{
            id_pesanan: parameter.transaction_details.order_id,
            total_harga: parameter.transaction_details.gross_amount,
            nama_pelanggan: parameter.customer_details.first_name,
            email_pelanggan: parameter.customer_details.email,
            kontak_pelanggan: parameter.customer_details.phone,
            detail_item: parameter.item_details,
            status_transaksi: 'pending'
        }]).select();
        if (error) throw error;
        console.log('Pesanan awal berhasil disimpan ke Supabase:', data);
        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token });
    } catch (e) {
        console.error("GAGAL MEMBUAT TOKEN, ERROR LENGKAP:", e);
        res.status(500).json({ message: "Terjadi kesalahan pada server.", error: e.message });
    }
});

// Endpoint notifikasi dari Midtrans (Tidak ada perubahan di sini)
app.post('/payment-notification', (req, res) => {
    // ... (kode ini tetap sama)
});


// ===== [REVISI BESAR] Endpoint update status sekarang juga mengirim email =====
app.post('/update-order-status', async (req, res) => {
    try {
        const { order_id, transaction_status, payment_type } = req.body;
        if (!order_id || !transaction_status) {
            return res.status(400).json({ error: 'Order ID dan status transaksi diperlukan.' });
        }

        // 1. Update status di Supabase
        const { data: updatedOrder, error } = await supabase
            .from('orders')
            .update({ status_transaksi: transaction_status, tipe_pembayaran: payment_type })
            .eq('id_pesanan', order_id)
            .select() // <-- Tambahkan .select() untuk mendapatkan data yang diupdate
            .single(); // <-- Ambil sebagai satu objek, bukan array

        if (error) throw error;
        if (!updatedOrder) throw new Error('Pesanan tidak ditemukan untuk diupdate.');

        console.log(`Status pesanan ${order_id} berhasil diupdate dari client.`);

        // 2. Jika pembayaran sukses (settlement), kirim email tiket
        if (transaction_status === 'settlement' || transaction_status === 'capture') {
            
            // Buat QR Code sebagai Data URL (gambar yang bisa disisipkan di email)
            const qrCodeDataURL = await QRCode.toDataURL(order_id);

            // Kirim email menggunakan Resend
            await resend.emails.send({
                from: 'tiket@domain-verifikasi-anda.com', // GANTI dengan email dari domain yang Anda verifikasi di Resend
                to: updatedOrder.email_pelanggan, // Ambil email dari data yang diupdate
                subject: `Tiket Digital Anda untuk Pesanan ${order_id}`,
                html: `
                    <h1>Pembayaran Berhasil!</h1>
                    <p>Terima kasih, ${updatedOrder.nama_pelanggan}. Pesanan Anda telah kami terima.</p>
                    <p>Silakan tunjukkan QR Code di bawah ini untuk ditukarkan di lokasi.</p>
                    <div style="padding: 20px; border: 1px dashed #333;">
                        <h2>Tiket Digital</h2>
                        <p><strong>Nama:</strong> ${updatedOrder.nama_pelanggan}</p>
                        <p><strong>ID Pesanan:</strong> ${order_id}</p>
                        <img src="${qrCodeDataURL}" alt="QR Code Tiket">
                    </div>
                    <p>Sampai jumpa!</p>
                `
            });
            console.log(`Email tiket berhasil dikirim ke ${updatedOrder.email_pelanggan}`);
        }

        res.status(200).json({ message: 'Status berhasil diupdate dan email tiket dikirim.' });

    } catch (e) {
        console.error('Gagal update status / kirim email dari client:', e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = app;