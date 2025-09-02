// api/update-stock.js
const { getConnection } = require('../../lib/db');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

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

    const { add } = req.body;
    if (typeof add !== 'number' || add <= 0) {
        return res.status(400).json({ message: 'Invalid amount to add' });
    }

    try {
        const db = await getConnection();
        await db.execute(
            `INSERT INTO settings (setting_key, setting_value) 
             VALUES ('event_ticket_stock', ?)
             ON DUPLICATE KEY UPDATE setting_value = setting_value + ?`,
            [add, add]
        );
        await db.end();
        
        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};