// backend/server.js

const express = require('express');
const midtransClient = require('midtrans-client');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
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

// Endpoint untuk membuat Snap Token
app.post('/get-snap-token', async (req, res) => {
    const parameter = req.body;
    
    try {
        // [PERBAIKAN] Menggunakan nama kolom Bahasa Indonesia sesuai database
        const { data, error } = await supabase
            .from('orders') // Pastikan 'orders' adalah nama tabel Anda
            .insert([
                {
                    id_pesanan: parameter.transaction_details.order_id,
                    total_harga: parameter.transaction_details.gross_amount,
                    nama_pelanggan: parameter.customer_details.first_name,
                    email_pelanggan: parameter.customer_details.email,
                    kontak_pelanggan: parameter.customer_details.phone,
                    detail_item: parameter.item_details,
                    status_transaksi: 'pending'
                }
            ])
            .select();

        if (error) {
            throw error;
        }

        console.log('Pesanan awal berhasil disimpan ke Supabase:', data);

        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token });

    } catch (e) {
        console.error("Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint untuk menerima Notifikasi Pembayaran dari Midtrans
app.post('/payment-notification', (req, res) => {
    const notificationJson = req.body;
    
    snap.transaction.notification(notificationJson)
        .then(async (statusResponse) => {
            const orderId = statusResponse.order_id;
            const transactionStatus = statusResponse.transaction_status;
            
            // [PERBAIKAN] Menggunakan nama kolom Bahasa Indonesia sesuai database
            const { data, error } = await supabase
                .from('orders') // Pastikan 'orders' adalah nama tabel Anda
                .update({ 
                    status_transaksi: transactionStatus,
                    tipe_pembayaran: statusResponse.payment_type
                })
                .eq('id_pesanan', orderId);

            if (error) {
                console.error('Gagal update status ke Supabase:', error);
            } else {
                console.log('Status pesanan berhasil diupdate di Supabase');
            }
            
            res.status(200).send('OK');
        })
        .catch((e) => {
            console.error('Error memproses notifikasi:', e.message);
            res.status(500).json({ error: e.message });
        });
});

module.exports = app;