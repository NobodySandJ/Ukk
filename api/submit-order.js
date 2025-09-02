// api/submit-order.js
const { getConnection } = require('../../lib/db');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const orderData = req.body;
    const totalChekis = Object.values(orderData.items).reduce((a, b) => a + b, 0);

    if (totalChekis <= 0) {
        return res.status(400).json({ message: 'Invalid order data' });
    }

    const db = await getConnection();
    try {
        await db.beginTransaction();

        const [rows] = await db.execute(
            "SELECT setting_value FROM settings WHERE setting_key = 'event_ticket_stock' FOR UPDATE"
        );
        
        const currentStock = parseInt(rows[0].setting_value, 10);

        if (currentStock < totalChekis) {
            await db.rollback(); // Batalkan transaksi
            await db.end();
            return res.status(400).json({ message: 'Stok tiket tidak mencukupi!' });
        }

        const newStock = currentStock - totalChekis;
        await db.execute(
            "UPDATE settings SET setting_value = ? WHERE setting_key = 'event_ticket_stock'",
            [newStock]
        );
        
        const GAS_URL = process.env.GAS_WEB_APP_URL;
        if (GAS_URL) {
            await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'recordOrder', orderData: orderData })
            });
        }
        
        await db.commit();
        await db.end();

        res.status(200).json({ message: 'Order submitted successfully!', data: { newStock: newStock } });

    } catch (error) {
        await db.rollback();
        await db.end();
        console.error('Error submitting order:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};