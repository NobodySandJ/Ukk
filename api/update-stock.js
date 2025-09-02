// api/update-stock.js
import { getConnection } from '../../lib/db';
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    // ... (kode autentikasi JWT tetap sama seperti sebelumnya) ...
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
    // ... (akhir kode autentikasi) ...

    const { add } = req.body;
    if (typeof add !== 'number' || add <= 0) {
        return res.status(400).json({ message: 'Invalid amount to add' });
    }

    try {
        const db = await getConnection();
        // Menggunakan "ON DUPLICATE KEY UPDATE" untuk menambah stok
        await db.execute(
            `INSERT INTO settings (setting_key, setting_value) 
             VALUES ('event_ticket_stock', ?)
             ON DUPLICATE KEY UPDATE setting_value = setting_value + ?`,
            [add, add]
        );
        await db.end();
        
        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}