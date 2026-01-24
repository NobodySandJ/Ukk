const supabase = require("../config/supabase");
const { getChekiStock } = require("../utils/stockUtils");
const otpStorage = require("../utils/otpStore");

const isDemoMode = !process.env.JWT_SECRET;

const getAdminStats = async (req, res) => {
    if (isDemoMode) {
        return res.json({
            totalRevenue: 1500000,
            totalCheki: 50,
            chekiPerMember: { 'Aca': 20, 'Sinta': 15, 'Cissi': 15 }
        });
    }
    try {
        const { data: revenueData } = await supabase
            .from('pesanan')
            .select('total_harga')
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);
        const totalRevenue = (revenueData || []).reduce((sum, o) => sum + o.total_harga, 0);

        const { data: itemStats } = await supabase
            .from('order_items')
            .select('quantity, products(name)');

        let totalCheki = 0;
        const chekiPerMember = {};
        (itemStats || []).forEach(item => {
            totalCheki += item.quantity;
            const productName = item.products?.name?.replace('Cheki ', '') || 'Unknown';
            chekiPerMember[productName] = (chekiPerMember[productName] || 0) + item.quantity;
        });

        res.json({ totalRevenue, totalCheki, chekiPerMember });
    } catch (e) {
        res.status(500).json({ message: 'Gagal mengambil statistik.', error: e.message });
    }
};

const getDashboardStats = async (req, res) => {
    if (isDemoMode) {
        return res.json({
            users: 15,
            active_orders: 5,
            revenue: 1500000,
            stock: 8
        });
    }
    try {
        const { count: users } = await supabase.from('pengguna').select('*', { count: 'exact', head: true }).neq('peran', 'admin');
        const { count: active_orders } = await supabase.from('pesanan').select('*', { count: 'exact', head: true }).eq('status_tiket', 'berlaku');
        const { data: revenueData } = await supabase.from('pesanan').select('total_harga').in('status_tiket', ['berlaku', 'sudah_dipakai']);
        const revenue = (revenueData || []).reduce((sum, o) => sum + (o.total_harga || 0), 0);
        const stock = await getChekiStock();

        res.json({ users, active_orders, revenue, stock });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data dashboard.", error: e.message });
    }
};

const getAllUsers = async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', nama_pengguna: 'demo_user', email: 'demo@example.com', nomor_whatsapp: '081234567890' },
            { id: '2', nama_pengguna: 'test_user', email: 'test@example.com', nomor_whatsapp: '089876543210' }
        ]);
    }
    try {
        const { data, error } = await supabase
            .from('pengguna')
            .select('id, nama_pengguna, email, nomor_whatsapp')
            .neq('peran', 'admin')
            .order('id', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data pengguna.", error: e.message });
    }
};

const getSettings = async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { nama: 'stok_cheki', nilai: '100' },
            { nama: 'harga_cheki_member', nilai: '25000' },
            { nama: 'harga_cheki_grup', nilai: '30000' },
            { nama: 'event_tanggal', nilai: '2026-02-14' },
            { nama: 'event_lokasi', nilai: 'Jakarta' },
            { nama: 'event_lineup', nilai: 'Aca,Sinta,Cissi' }
        ]);
    }
    try {
        const { data, error } = await supabase.from('pengaturan').select('*');
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil pengaturan.", error: e.message });
    }
};

const updateSetting = async (req, res) => {
    if (isDemoMode) return res.json({ message: "Pengaturan berhasil diupdate! (Demo)" });

    try {
        const { nama, nilai } = req.body;
        if (!nama) return res.status(400).json({ message: "Nama setting wajib diisi." });

        const { data, error } = await supabase
            .from('pengaturan')
            .upsert({ nama, nilai }, { onConflict: 'nama' })
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Pengaturan berhasil diupdate!", setting: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate pengaturan.", error: e.message });
    }
};

const bulkUpdateSettings = async (req, res) => {
    if (isDemoMode) return res.json({ message: "Pengaturan berhasil diupdate! (Demo)" });

    try {
        const { settings } = req.body;
        if (!settings || !Array.isArray(settings)) {
            return res.status(400).json({ message: "Format settings tidak valid." });
        }

        await Promise.all(settings.map(async (item) => {
            const { nama, nilai } = item;
            if (nama) {
                const { error } = await supabase.from('pengaturan').upsert({ nama, nilai }, { onConflict: 'nama' });
                if (error) throw error;

                // Sync Price logic
                if (nama === 'harga_cheki_member') {
                    await supabase.from('products').update({ price: parseInt(nilai, 10) }).eq('category', 'cheki_member');
                } else if (nama === 'harga_cheki_grup') {
                    await supabase.from('products').update({ price: parseInt(nilai, 10) }).eq('category', 'cheki_group');
                }
            }
        }));

        res.json({ message: "Pengaturan berhasil diperbarui." });
    } catch (e) {
        res.status(500).json({ message: "Gagal memperbarui pengaturan.", error: e.message });
    }
};

const setChekiStock = async (req, res) => {
    if (isDemoMode) return res.json({ message: 'Stok berhasil diset! (Demo)', newStock: req.body.stockValue || 10 });

    try {
        const { stockValue } = req.body;
        if (typeof stockValue !== 'number' || stockValue < 0) {
            return res.status(400).json({ message: 'Nilai stok tidak valid.' });
        }

        const { error } = await supabase
            .from('pengaturan')
            .update({ nilai: stockValue.toString() })
            .eq('nama', 'stok_cheki');

        if (error) throw new Error(`Gagal update stok: ${error.message}`);
        res.json({ message: 'Stok berhasil disimpan!', newStock: stockValue });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

const updateChekiStock = async (req, res) => {
    if (isDemoMode) return res.json({ message: 'Stok diperbarui! (Demo)', newStock: 10 });

    try {
        const { changeValue } = req.body;
        if (typeof changeValue !== 'number') return res.status(400).json({ message: 'Nilai tidak valid.' });

        const currentStock = await getChekiStock();
        const newStock = Math.max(0, currentStock + changeValue);

        const { error } = await supabase
            .from('pengaturan')
            .update({ nilai: newStock.toString() })
            .eq('nama', 'stok_cheki');

        if (error) throw new Error(`Gagal update stok: ${error.message}`);
        res.json({ message: 'Stok berhasil diperbarui!', newStock });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

const undoTicketStatus = async (req, res) => {
    if (isDemoMode) return res.json({ message: 'Status tiket berhasil di-undo. (Demo)' });
    try {
        const { order_id } = req.body;
        if (!order_id) return res.status(400).json({ message: "ID pesanan diperlukan." });

        const { data: order, error: fetchError } = await supabase.from('pesanan').select('status_tiket, dipakai_pada').eq('id_pesanan', order_id).single();
        if (fetchError || !order) return res.status(404).json({ message: "Pesanan tidak ditemukan." });

        if (order.status_tiket !== 'sudah_dipakai') return res.status(400).json({ message: "Hanya tiket dengan status 'sudah_dipakai' yang bisa di-undo." });

        if (order.dipakai_pada) {
            const usedAt = new Date(order.dipakai_pada);
            const now = new Date();
            const diffMinutes = (now - usedAt) / (1000 * 60);
            if (diffMinutes > 5) return res.status(400).json({ message: "Waktu undo sudah lewat (maksimal 5 menit)." });
        }

        const { error: updateError } = await supabase.from('pesanan').update({ status_tiket: 'berlaku', dipakai_pada: null }).eq('id_pesanan', order_id);
        if (updateError) throw updateError;
        res.json({ message: "Status tiket berhasil dikembalikan ke 'berlaku'." });
    } catch (e) {
        res.status(500).json({ message: "Gagal undo status tiket.", error: e.message });
    }
};

const deleteOrder = async (req, res) => {
    if (isDemoMode) return res.json({ message: 'Pesanan berhasil dihapus. (Demo)' });
    try {
        const { id } = req.params;
        const { data: order, error: fetchError } = await supabase.from('pesanan').select('detail_item, status_tiket').eq('id_pesanan', id).single();

        if (fetchError || !order) return res.status(404).json({ message: "Pesanan tidak ditemukan." });

        // Restore Stock to Global Settings if order was valid
        if (order.status_tiket === 'berlaku' || order.status_tiket === 'sudah_dipakai') {
            if (Array.isArray(order.detail_item)) {
                const totalQuantity = order.detail_item.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const currentStock = await getChekiStock();
                const newStock = currentStock + totalQuantity;

                await supabase.from('pengaturan').update({ nilai: newStock.toString() }).eq('nama', 'stok_cheki');
            }
        }

        const { error: deleteError } = await supabase.from('pesanan').delete().eq('id_pesanan', id);
        if (deleteError) throw deleteError;
        res.json({ message: 'Pesanan berhasil dihapus.' });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus pesanan.", error: e.message });
    }
};

const getMonthlyStats = async (req, res) => {
    if (isDemoMode) {
        return res.json({ revenue: 1500000, percentChange: 12.5 });
    }

    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

        // Current Month Revenue
        const { data: currentData } = await supabase
            .from('pesanan')
            .select('total_harga')
            .gte('dibuat_pada', startOfMonth)
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);

        const currentRevenue = (currentData || []).reduce((sum, o) => sum + (o.total_harga || 0), 0);

        // Last Month Revenue
        const { data: lastData } = await supabase
            .from('pesanan')
            .select('total_harga')
            .gte('dibuat_pada', startOfLastMonth)
            .lte('dibuat_pada', endOfLastMonth)
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);

        const lastRevenue = (lastData || []).reduce((sum, o) => sum + (o.total_harga || 0), 0);

        // Calculate Percentage Change
        let percentChange = 0;
        if (lastRevenue === 0) {
            percentChange = currentRevenue > 0 ? 100 : 0;
        } else {
            percentChange = ((currentRevenue - lastRevenue) / lastRevenue) * 100;
        }

        res.json({
            revenue: currentRevenue,
            percentChange: parseFloat(percentChange.toFixed(1))
        });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil statistik bulanan.", error: e.message });
    }
};

const generateResetCode = async (req, res) => {
    // Admin generates OTP for a user
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "User ID diperlukan." });

        // Get user email
        const { data: user, error } = await supabase.from('pengguna').select('id, email').eq('id', userId).single();
        if (error || !user) return res.status(404).json({ message: "User tidak ditemukan." });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store in Shared Map
        otpStorage.set(user.email.toLowerCase(), {
            code: otp,
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
            userId: user.id
        });

        console.log(`[ADMIN GENERATED OTP] For ${user.email}: ${otp}`);

        res.json({ message: "Kode OTP berhasil di-generate.", code: otp, email: user.email });

    } catch (e) {
        res.status(500).json({ message: "Gagal generate OTP.", error: e.message });
    }
};

const cleanupOrders = async (req, res) => {
    // Note: User requested this for testing "local and deploy".
    // We strictly enforce Admin Auth (handled by middleware).

    try {
        const { range } = req.body; // 'week', 'month', 'year'
        if (!['week', 'month', 'year', 'all'].includes(range)) {
            return res.status(400).json({ message: "Range tidak valid. Gunakan: week, month, year, atau all." });
        }

        let startDate;
        const now = new Date();

        if (range === 'week') {
            startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
        } else if (range === 'month') {
            startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        } else if (range === 'year') {
            startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
        }
        // 'all' means delete everything, so startDate stays undefined (or logic handles it)

        let query = supabase.from('pesanan').delete();

        if (range !== 'all') {
            query = query.gte('dibuat_pada', startDate);
        } else {
            // For safety, require 'all' to explicitly check strict condition? 
            // supabase delete without 'eq' or filter deletes ALL? Yes.
            // But usually requires at least one filter?
            // "neq" id 0 is a hack, but "gt" created_at 1970 works.
            query = query.neq('id_pesanan', 'safeguard_impossible_id');
        }

        // Execute
        const { error, count } = await query;

        if (error) throw error;

        // Also reset Stock? 
        // User didn't specify, but usually "Testing Reset" implies restocking.
        // But stock is global setting. 
        // If we delete orders, we theoretically 'return' stock?
        // Or just clear orders history?
        // Let's just clear orders. Stock management is manual via Settings.

        res.json({ message: `Data pesanan (${range}) berhasil dibersihkan.` });

    } catch (e) {
        res.status(500).json({ message: "Gagal membersihkan data.", error: e.message });
    }
};

const getAllOrders = async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id_pesanan: 'ORDER-123', nama_pelanggan: 'Demo User', total_harga: 50000, status_tiket: 'berlaku' }
        ]);
    }

    try {
        const { data, error } = await supabase
            .from('pesanan')
            .select('*')
            .order('dibuat_pada', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data pesanan.", error: e.message });
    }
};

module.exports = {
    getAdminStats,
    getDashboardStats,
    getAllUsers,
    getSettings,
    updateSetting,
    bulkUpdateSettings,
    setChekiStock,
    updateChekiStock,
    undoTicketStatus,
    deleteOrder,
    getAllOrders,
    getAllOrders,
    getMonthlyStats,
    getMonthlyStats,
    cleanupOrders,
    generateResetCode
};
