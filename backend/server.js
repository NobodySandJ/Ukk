// backend/server.js

const express = require('express');
const midtransClient = require('midtrans-client');
const cors = require('cors');
require('dotenv').config(); // [TAMBAHKAN INI] di baris paling atas

const app = express();
const port = 3000;

// ... (kode cors tetap sama)
const corsOptions = {
  origin: '*', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());


// [UBAH INI] Inisialisasi Snap dengan variabel dari .env
let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY 
});

// ... (sisa kode Anda tetap sama)
app.post('/get-snap-token', (req, res) => {
    // ...
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});