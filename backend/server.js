// backend/server.js

const express = require('express');
const midtransClient = require('midtrans-client');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware CORS
app.use(cors({
  origin: '*', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// Inisialisasi Midtrans Snap API
let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY 
});

// Endpoint untuk membuat transaksi dan mendapatkan token
app.post('/get-snap-token', (req, res) => {
    const parameter = req.body;
    console.log("Menerima request untuk membuat token:", JSON.stringify(parameter, null, 2));

    // Gunakan CoreApi untuk mendapatkan detail QR code
    // Ganti 'snap.createTransaction' menjadi 'coreApi.charge'
    let coreApi = new midtransClient.CoreApi({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    coreApi.charge(parameter)
        .then((chargeResponse) => {
            // [PENTING] Di sinilah URL QR Code akan muncul
            console.log('Respon dari Midtrans Core API:');
            console.log(JSON.stringify(chargeResponse, null, 2));

            // Jika pembayaran QRIS, cari URL QR code di dalam actions
            if (chargeResponse.actions && chargeResponse.payment_type === 'qris') {
                const qrCodeUrl = chargeResponse.actions.find(action => action.name === 'generate-qr-code');
                if (qrCodeUrl) {
                    console.log('================================================');
                    console.log('✅ QR CODE IMAGE URL DITEMUKAN:');
                    console.log(qrCodeUrl.url);
                    console.log('================================================');
                }
            }

            // Untuk pop-up di frontend, kita tetap butuh Snap Token
            // Jadi kita buat transaksi Snap setelah mendapatkan URL
            snap.createTransaction(parameter)
                .then(transaction => {
                    res.json({ token: transaction.token });
                });
        })
        .catch((e) => {
            console.error('Error saat charge ke Midtrans Core API:', e.message);
            res.status(500).json({ error: e.message });
        });
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});