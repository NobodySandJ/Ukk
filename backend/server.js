// backend/server.js

const express = require('express');
const midtransClient = require('midtrans-client');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Konfigurasi CORS yang lebih fleksibel untuk Vercel
app.use(cors()); // Izinkan semua origin, Vercel akan mengelola ini dengan aman.

app.use(express.json());

// Inisialisasi Midtrans
const snap = new midtransClient.Snap({
    isProduction: false, // Tetap false karena menggunakan Sandbox
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Endpoint untuk membuat Snap Token
app.post('/get-snap-token', (req, res) => {
    const parameter = req.body;
    snap.createTransaction(parameter)
        .then(transaction => {
            res.json({ token: transaction.token });
        })
        .catch(e => {
            // Kirim pesan error yang lebih jelas ke frontend
            console.error("Midtrans Error:", e.message);
            res.status(500).json({ error: e.message });
        });
});

// Endpoint untuk menerima Notifikasi Pembayaran dari Midtrans
app.post('/payment-notification', (req, res) => {
    const notificationJson = req.body;
    console.log('Menerima notifikasi:', JSON.stringify(notificationJson, null, 2));

    snap.transaction.notification(notificationJson)
        .then((statusResponse) => {
            const orderId = statusResponse.order_id;
            const transactionStatus = statusResponse.transaction_status;
            const fraudStatus = statusResponse.fraud_status;

            console.log(`Transaksi ID ${orderId}: ${transactionStatus}, Status Fraud: ${fraudStatus}`);

            if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
                if (fraudStatus == 'accept') {
                    console.log('Pembayaran berhasil dan aman!');
                    // Di sini Anda bisa menambahkan logika untuk update database, dll.
                    // Contoh: mengirim data ke Google Sheet
                    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL; // Ambil dari env
                    if (GOOGLE_SCRIPT_URL) {
                        axios.post(GOOGLE_SCRIPT_URL, JSON.stringify(statusResponse))
                            .then(response => console.log('Berhasil mengirim data ke Google Sheet:', response.data))
                            .catch(error => console.error('Gagal mengirim data ke Google Sheet:', error.message));
                    }
                }
            } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
                console.log('Pembayaran dibatalkan atau gagal.');
            } else if (transactionStatus == 'pending') {
                console.log('Pembayaran masih menunggu.');
            }

            res.status(200).send('OK');
        })
        .catch((e) => {
            console.error('Error memproses notifikasi:', e.message);
            res.status(500).json({ error: e.message });
        });
});

// Ekspor 'app' untuk Vercel
module.exports = app;