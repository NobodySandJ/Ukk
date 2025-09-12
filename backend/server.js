// backend/server.js

const express = require('express');
const midtransClient = require('midtrans-client');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js'); // <-- Import Supabase
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
    
    // Sebelum membuat transaksi Midtrans, simpan dulu data awal ke Supabase
    try {
        const { data, error } = await supabase
            .from('orders')
            .insert([
                {
                    order_id: parameter.transaction_details.order_id,
                    gross_amount: parameter.transaction_details.gross_amount,
                    customer_name: parameter.customer_details.first_name,
                    customer_email: parameter.customer_details.email,
                    customer_social: parameter.customer_details.phone,
                    items: parameter.item_details, // Simpan detail item sebagai JSON
                    transaction_status: 'pending' // Status awal
                }
            ])
            .select();

        if (error) {
            throw error;
        }

        console.log('Pesanan awal berhasil disimpan ke Supabase:', data);

        // Lanjutkan membuat token Midtrans
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
            const fraudStatus = statusResponse.fraud_status;

            console.log(`Transaksi ID ${orderId}: ${transactionStatus}, Status Fraud: ${fraudStatus}`);

            if (transactionStatus == 'capture' || transactionStatus == 'settlement' || transactionStatus == 'cancel' || transactionStatus == 'expire') {
                
                // Update status transaksi di tabel Supabase
                const { data, error } = await supabase
                    .from('orders')
                    .update({ 
                        transaction_status: transactionStatus,
                        payment_type: statusResponse.payment_type
                    })
                    .eq('order_id', orderId);

                if (error) {
                    console.error('Gagal update status ke Supabase:', error);
                } else {
                    console.log('Status pesanan berhasil diupdate di Supabase:', data);
                }
            }
            
            res.status(200).send('OK');
        })
        .catch((e) => {
            console.error('Error memproses notifikasi:', e.message);
            res.status(500).json({ error: e.message });
        });
});

module.exports = app;