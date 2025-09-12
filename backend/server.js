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
        const { data, error } = await supabase
            .from('orders')
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
        console.error("GAGAL MEMBUAT TOKEN, ERROR LENGKAP:", e); 
        res.status(500).json({ 
            message: "Terjadi kesalahan pada server.",
            error: e.message
        });
    }
});

// Endpoint untuk menerima Notifikasi Pembayaran dari Midtrans (tetap ada jika nanti berhasil)
app.post('/payment-notification', (req, res) => {
    const notificationJson = req.body;
    
    snap.transaction.notification(notificationJson)
        .then(async (statusResponse) => {
            const orderId = statusResponse.order_id;
            const transactionStatus = statusResponse.transaction_status;
            
            const { data, error } = await supabase
                .from('orders')
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

// [ALTERNATIF] Endpoint untuk update status dari sisi client
app.post('/update-order-status', async (req, res) => {
    try {
        const { order_id, transaction_status, payment_type } = req.body;

        if (!order_id || !transaction_status) {
            return res.status(400).json({ error: 'Order ID dan status transaksi diperlukan.' });
        }

        const { data, error } = await supabase
            .from('orders')
            .update({ 
                status_transaksi: transaction_status,
                tipe_pembayaran: payment_type 
            })
            .eq('id_pesanan', order_id);

        if (error) {
            throw error;
        }

        console.log(`Status pesanan ${order_id} berhasil diupdate dari client.`);
        res.status(200).json({ message: 'Status berhasil diupdate.' });

    } catch (e) {
        console.error('Gagal update status dari client:', e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = app;