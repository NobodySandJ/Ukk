// backend/server.js

const express = require('express');
const midtransClient = require('midtrans-client');
const cors = require('cors');
const axios = require('axios'); // <-- [TAMBAHKAN] Import axios
const crypto = require('crypto'); // <-- [TAMBAHKAN] Import crypto untuk verifikasi
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Inisialisasi Midtrans
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Endpoint untuk membuat Snap Token
app.post('/get-snap-token', (req, res) => {
    const parameter = req.body;
    snap.createTransaction(parameter)
        .then(transaction => res.json({ token: transaction.token }))
        .catch(e => res.status(500).json({ error: e.message }));
});

// [BARU] Endpoint untuk menerima Notifikasi Pembayaran dari Midtrans
app.post('/payment-notification', (req, res) => {
    const notificationJson = req.body;
    console.log('Menerima notifikasi:', JSON.stringify(notificationJson, null, 2));

    // 1. Verifikasi notifikasi menggunakan signature key
    const signatureKey = crypto.createHash('sha512')
        .update(notificationJson.order_id + notificationJson.status_code + notificationJson.gross_amount + process.env.MIDTRANS_SERVER_KEY)
        .digest('hex');

    if (signatureKey !== notificationJson.signature_key) {
        console.error('Signature key tidak valid!');
        return res.status(400).send('Invalid signature');
    }

    // 2. Cek status transaksi
    const transactionStatus = notificationJson.transaction_status;
    const fraudStatus = notificationJson.fraud_status;

    if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
        if (fraudStatus == 'accept') {
            console.log('Pembayaran berhasil dan aman!');
            
            // 3. Siapkan dan kirim data ke Google Script
            // Anda mungkin perlu mengambil detail order dari database Anda di sini
            // Untuk contoh ini, kita asumsikan data yang relevan ada di notifikasi
            const orderDataForSheet = {
                order_id: notificationJson.order_id,
                gross_amount: notificationJson.gross_amount,
                payment_type: notificationJson.payment_type,
                transaction_time: notificationJson.transaction_time,
                // Tambahkan data lain yang Anda butuhkan
            };

            const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-XC_EiQD2-0VaOIxD6d5PnnPr_WocUHh2xfZWN25pmYwmXRpDaFCI4N987igRNRRvww/exec'; // <-- Ganti dengan URL Anda

            axios.post(GOOGLE_SCRIPT_URL, JSON.stringify(orderDataForSheet))
                .then(response => {
                    console.log('Berhasil mengirim data ke Google Sheet:', response.data);
                })
                .catch(error => {
                    console.error('Gagal mengirim data ke Google Sheet:', error.message);
                });
        }
    } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
        console.log('Pembayaran dibatalkan atau gagal.');
    } else if (transactionStatus == 'pending') {
        console.log('Pembayaran masih menunggu.');
    }

    // Kirim respons OK ke Midtrans
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});