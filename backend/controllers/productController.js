const supabase = require("../config/supabase");
const { getChekiStock } = require("../utils/stockUtils");
const productData = require("../../data.json"); // Assuming backend is root, data.json is in parent of backend??
// Wait, server.js was in c:\Githab\Ukk\backend\server.js and required '../data.json'.
// So data.json is in c:\Githab\Ukk\data.json.
// Controller is in c:\Githab\Ukk\backend\controllers\.
// So it should be require('../../data.json'). Correct.

const isDemoMode = !process.env.JWT_SECRET;

const getProductsAndStock = async (req, res) => {
    try {
        let responseData = JSON.parse(JSON.stringify(productData));

        if (!isDemoMode) {
            try {
                // Fetch ALL dynamic data from Supabase in parallel
                const [productsRes, settingsRes, newsRes, galleryRes] = await Promise.all([
                    supabase.from('products').select('*, members(name, role, image_url, details)').eq('is_active', true).order('created_at', { ascending: true }),
                    supabase.from('pengaturan').select('nama, nilai'),
                    supabase.from('news').select('title, content, date').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
                    supabase.from('gallery').select('image_url, alt_text, category').eq('is_active', true).order('display_order', { ascending: true })
                ]);

                // Parse settings into object
                const settings = {};
                (settingsRes.data || []).forEach(s => { settings[s.nama] = s.nilai; });

                // Process Products from new table
                const allProducts = productsRes.data || [];
                const groupProduct = allProducts.find(p => p.category === 'cheki_group');
                const memberProducts = allProducts.filter(p => p.category === 'cheki_member');

                // Transform Group Cheki
                if (groupProduct) {
                    responseData.group_cheki = {
                        id: groupProduct.id,
                        name: groupProduct.name || 'Cheki Grup',
                        image: groupProduct.image_url || 'img/member/group.webp',
                        price: groupProduct.price,
                        stock: groupProduct.stock
                    };
                }

                // Transform Individual Members
                const dbMembers = memberProducts.map(p => ({
                    id: p.id,
                    name: p.name.replace('Cheki ', ''), // Remove prefix for display
                    role: p.members?.role || 'Member',
                    image: p.image_url || p.members?.image_url || `img/member/placeholder.webp`,
                    price: p.price,
                    stock: p.stock,
                    details: p.members?.details || {}
                }));

                // Transform News
                const dbNews = newsRes.data || [];

                // Transform Gallery
                const dbGallery = (galleryRes.data || [])
                    .filter(g => !g.category || g.category === 'carousel')
                    .map(g => ({
                        src: g.image_url,
                        alt: g.alt_text
                    }));

                // Override JSON data if DB has data
                if (dbMembers.length > 0) responseData.members = dbMembers;
                if (dbNews.length > 0) responseData.news = dbNews;
                if (dbGallery.length > 0) responseData.gallery = dbGallery;

                // Add event info from settings
                responseData.event = {
                    tanggal: settings.event_tanggal || null,
                    lokasi: settings.event_lokasi || null,
                    lineup: settings.event_lineup || null
                };

                // GLOBAL STOCK
                responseData.cheki_stock = parseInt(settings.stok_cheki || '0', 10);
            } catch (dbError) {
                console.error("DB Fetch Error (using JSON fallback):", dbError.message);
                responseData.cheki_stock = await getChekiStock();
            }
        } else {
            responseData.cheki_stock = await getChekiStock();
        }

        res.json(responseData);
    } catch (e) {
        res.status(500).json({ message: "Tidak dapat memuat data produk." });
    }
};

const getGlobalLeaderboard = async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { username: 'sultan_aca', oshi: 'Aca', totalCheki: 25 },
            { username: 'fan_sinta', oshi: 'Sinta', totalCheki: 18 },
            { username: 'demo_user', oshi: 'Cissi', totalCheki: 12 }
        ]);
    }

    try {
        const { data: orders, error } = await supabase
            .from('pesanan')
            .select('detail_item, id_pengguna, pengguna(nama_pengguna, oshi)')
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);

        if (error) throw error;

        // Hitung total per user
        const userTotals = {};
        orders.forEach(order => {
            const uid = order.id_pengguna;
            if (!userTotals[uid]) {
                userTotals[uid] = {
                    username: order.pengguna?.nama_pengguna || 'Unknown',
                    oshi: order.pengguna?.oshi || '-',
                    totalCheki: 0
                };
            }
            (order.detail_item || []).forEach(item => {
                userTotals[uid].totalCheki += item.quantity;
            });
        });

        res.json(Object.values(userTotals).sort((a, b) => b.totalCheki - a.totalCheki).slice(0, 10));
    } catch (e) {
        res.status(500).json({ message: "Gagal memuat leaderboard.", error: e.message });
    }
};

const getMemberLeaderboard = async (req, res) => {
    const { memberName } = req.query;
    if (!memberName) return res.status(400).json({ message: "Nama member diperlukan." });

    if (isDemoMode) {
        const demoData = [
            { username: 'sultan_piya', totalQuantity: 15 },
            { username: 'fan_piya', totalQuantity: 8 },
            { username: 'demo_user', totalQuantity: 5 }
        ];
        return res.json(demoData);
    }

    try {
        const { data: orders, error } = await supabase
            .from('pesanan')
            .select('detail_item, id_pengguna, pengguna(nama_pengguna)')
            .in('status_tiket', ['berlaku', 'sudah_dipakai']);

        if (error) throw error;

        if (!orders || !Array.isArray(orders)) return res.json([]);

        const fanTotals = {};
        orders.forEach(order => {
            const items = order.detail_item || [];
            if (!Array.isArray(items)) return;

            items.forEach(item => {
                if (item.name && item.name.toLowerCase().includes(memberName.toLowerCase())) {
                    const uid = order.id_pengguna;
                    if (!uid) return;

                    if (!fanTotals[uid]) {
                        fanTotals[uid] = {
                            username: order.pengguna?.nama_pengguna || 'Unknown',
                            totalQuantity: 0
                        };
                    }
                    fanTotals[uid].totalQuantity += (item.quantity || 0);
                }
            });
        });

        const leaderboard = Object.values(fanTotals)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 10);

        res.json(leaderboard);
    } catch (e) {
        console.error("Leaderboard Per-Member API Error:", e);
        res.status(500).json({ message: "Gagal memuat leaderboard member.", error: e.message });
    }
};

module.exports = { getProductsAndStock, getGlobalLeaderboard, getMemberLeaderboard };
