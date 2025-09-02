// api/submit-order.js
import { getConnection } from '../../lib/db';

export default async function handler(req, res) {
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

        // 1. Ambil stok saat ini & kunci barisnya agar tidak ada yang bisa mengubahnya
        const [rows] = await db.execute(
            "SELECT setting_value FROM settings WHERE setting_key = 'event_ticket_stock' FOR UPDATE"
        );
        
        const currentStock = parseInt(rows[0].setting_value, 10);

        // 2. Cek apakah stok mencukupi
        if (currentStock < totalChekis) {
            throw new Error('Stok tiket tidak mencukupi!');
        }

        // 3. Kurangi stok di database
        const newStock = currentStock - totalChekis;
        await db.execute(
            "UPDATE settings SET setting_value = ? WHERE setting_key = 'event_ticket_stock'",
            [newStock]
        );
        
        // 4. Kirim log ke Google Sheets (ini bisa gagal, tapi stok sudah aman)
        const GAS_URL = process.env.GAS_WEB_APP_URL;
        await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'recordOrder', orderData: orderData })
        });
        
        // 5. Jika semua berhasil, commit transaksi
        await db.commit();
        await db.end();

        res.status(200).json({ message: 'Order submitted successfully!', data: { newStock: newStock } });

    } catch (error) {
        // Jika ada error, batalkan semua perubahan
        await db.rollback();
        await db.end();
        res.status(400).json({ message: error.message });
    }
}