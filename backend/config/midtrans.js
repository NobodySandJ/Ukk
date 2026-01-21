const midtransClient = require("midtrans-client");

let snap = null;
const requiredEnv = ['MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length === 0) {
    snap = new midtransClient.Snap({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
    console.log(`[INIT] Midtrans Client Initialized`);
} else {
    console.warn(`[INIT] Midtrans NOT initialized. Missing: ${missingEnv.join(', ')}`);
}

module.exports = snap;
