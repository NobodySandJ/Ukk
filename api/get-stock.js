// api/get-stock.js
import { getConnection } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const db = await getConnection();
        const [rows] = await db.execute(
            "SELECT setting_value FROM settings WHERE setting_key = 'event_ticket_stock'"
        );
        await db.end();

        if (rows.length > 0) {
            const stock = parseInt(rows[0].setting_value, 10);
            res.status(200).json({ stock: stock });
        } else {
            // Jika key belum ada, default ke 0
            res.status(200).json({ stock: 0 });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}