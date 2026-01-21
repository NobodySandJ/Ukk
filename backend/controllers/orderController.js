const supabase = require("../config/supabase");
const snap = require("../config/midtrans");
const { getChekiStock } = require("../utils/stockUtils");

const isDemoMode = !process.env.JWT_SECRET;

const getSnapToken = async (req, res) => {
    if (isDemoMode) return res.json({ token: 'demo_snap_token_' + Date.now() });

    try {
        const { transaction_details, item_details, customer_details } = req.body;

        const totalQuantity = item_details.reduce((sum, item) => sum + item.quantity, 0);
        const globalStock = await getChekiStock();

        if (globalStock < totalQuantity) {
            return res.status(400).json({
                message: `Stok tidak cukup. Tersisa: ${globalStock} tiket, diminta: ${totalQuantity} tiket`
            });
        }

        const enhanced_customer_details = { ...customer_details, first_name: req.user.username, email: req.user.email };

        const parameter = {
            transaction_details,
            item_details,
            customer_details: enhanced_customer_details,
            enabled_payments: ['qris', 'gopay', 'shopeepay', 'other_qris', 'credit_card', 'bca_va']
        };

        const token = await snap.createTransactionToken(parameter);
        const orderId = transaction_details.order_id;

        const { error: orderError } = await supabase.from("pesanan").insert([{
            id_pesanan: orderId,
            id_pengguna: req.user.userId,
            nama_pelanggan: req.user.username,
            total_harga: transaction_details.gross_amount,
            status_tiket: 'pending',
            detail_item: item_details
        }]);
        if (orderError) throw new Error(`Basis Data Error: ${orderError.message}`);

        const orderItemsToInsert = item_details.map(item => ({
            order_id: orderId,
            product_id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.price,
            subtotal: item.quantity * item.price
        }));

        const { error: itemsError } = await supabase.from("order_items").insert(orderItemsToInsert);
        if (itemsError) console.warn("Peringatan Insert Order Items:", itemsError.message);

        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: "Gagal membuat token pembayaran.", error: error.message });
    }
};

const updateOrderStatus = async (req, res) => {
    if (isDemoMode) return res.status(200).json({ message: "OK (Mode Demo)" });

    try {
        const { order_id, transaction_status } = req.body;
        if (!order_id || !transaction_status) return res.status(400).json({ message: "Muatan data (payload) tidak valid" });

        if (transaction_status === "settlement" || transaction_status === "capture") {
            const { data: existingOrder } = await supabase
                .from("pesanan")
                .select("status_tiket")
                .eq("id_pesanan", order_id)
                .single();

            if (existingOrder && existingOrder.status_tiket === 'berlaku') {
                return res.status(200).json({ message: "Pesanan sudah diproses sebelumnya." });
            }

            const { error: updateError } = await supabase
                .from("pesanan").update({ status_tiket: "berlaku" })
                .eq("id_pesanan", order_id);

            if (updateError) throw new Error("Update failed: " + updateError.message);

            const { data: pesanan } = await supabase
                .from("pesanan")
                .select("detail_item")
                .eq("id_pesanan", order_id)
                .single();

            if (pesanan?.detail_item) {
                const totalQuantity = pesanan.detail_item.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const currentStock = await getChekiStock();
                const newStock = Math.max(0, currentStock - totalQuantity);

                await supabase
                    .from('pengaturan')
                    .update({ nilai: newStock.toString() })
                    .eq('nama', 'stok_cheki');

                console.log(`[STOCK] Global stock reduced using Util: ${currentStock} -> ${newStock} for order ${order_id}`);
            }
        }
        res.status(200).json({ message: "Status updated" });
    } catch (e) {
        console.error('[ERROR] update-order-status:', e.message);
        res.status(500).json({ message: "Error processing notification", error: e.message });
    }
};

const getMyOrders = async (req, res) => {
    if (isDemoMode) return res.json([]);
    const { data } = await supabase.from("pesanan").select("*").eq("id_pengguna", req.user.userId);
    res.json(data || []);
};

const getMidtransClientKey = (req, res) => {
    if (isDemoMode) return res.json({ clientKey: 'demo_client_key' });
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
};

module.exports = { getSnapToken, updateOrderStatus, getMyOrders, getMidtransClientKey };
