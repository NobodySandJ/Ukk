// lib/db.js
const mysql = require('mysql2/promise');

// Fungsi untuk membuat dan mengembalikan koneksi
async function getConnection() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        // Opsi tambahan untuk Vercel/PlanetScale
        ssl: {
            rejectUnauthorized: true
        }
    });
    return connection;
}

module.exports = { getConnection };