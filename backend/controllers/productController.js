const supabase = require("../config/supabase");
const { getChekiStock } = require("../utils/stockUtils");

const isDemoMode = !process.env.JWT_SECRET;

const getProductsAndStock = async (req, res) => {
    try {
        let responseData = {};

        if (!isDemoMode) {
            try {
                // Fetch ALL dynamic data from Supabase in parallel
                const [productsRes, settingsRes, newsRes, galleryRes, groupMemberRes, allMembersRes] = await Promise.all([
                    supabase.from('products').select('*, members(id, name, role, image_url, details)').eq('is_active', true).order('created_at', { ascending: true }),
                    supabase.from('pengaturan').select('nama, nilai'),
                    supabase.from('news').select('title, content, date').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
                    supabase.from('gallery').select('image_url, alt_text, category').eq('is_active', true).order('display_order', { ascending: true }),
                    supabase.from('members').select('name, image_url').eq('member_type', 'group').single(),
                    // Fetch ALL individual members directly for accurate details
                    supabase.from('members').select('id, name, role, image_url, details').eq('member_type', 'individual').eq('is_active', true)
                ]);

                // Parse settings into object
                const settings = {};
                (settingsRes.data || []).forEach(s => { settings[s.nama] = s.nilai; });

                // Get group member image from members table
                const groupMember = groupMemberRes.data;
                
                // Get all individual members for lookup
                const allMembers = allMembersRes.data || [];

                // Process Products from new table
                const allProducts = productsRes.data || [];
                const groupProduct = allProducts.find(p => p.category === 'cheki_group');
                const memberProducts = allProducts.filter(p => p.category === 'cheki_member');

                // Transform Group Cheki
                if (groupProduct) {
                    // Priority: Members Table (Admin) > Settings > Product Image > Default
                    const groupImg = groupMember?.image_url || settings.group_photo_url || groupProduct.image_url || 'img/member/group.webp';

                    responseData.group_cheki = {
                        id: groupProduct.id,
                        name: groupProduct.name || 'Cheki Grup',
                        image: groupImg,
                        price: groupProduct.price,
                        stock: groupProduct.stock
                    };
                }

                // Transform Individual Members
                // Prioritize data from members table (edited via admin) over product join
                const dbMembers = memberProducts.map(p => {
                    // Find the member directly from members table by matching name or member_id
                    const memberName = p.name.replace('Cheki ', '');
                    const directMember = allMembers.find(m => 
                        m.name.toLowerCase() === memberName.toLowerCase() || 
                        m.id === p.member_id
                    );
                    
                    // Use direct member data if available, fallback to joined data
                    const memberData = directMember || p.members || {};
                    
                    return {
                        id: p.id,
                        name: memberName,
                        role: memberData.role || p.members?.role || 'Member',
                        image: memberData.image_url || p.members?.image_url || p.image_url || `img/member/placeholder.webp`,
                        price: p.price,
                        stock: p.stock,
                        details: memberData.details || p.members?.details || {}
                    };
                });

                // Transform News
                const dbNews = newsRes.data || [];

                // Transform Gallery (For Homepage Slider)
                const dbGallery = (galleryRes.data || [])
                    // Include 'carousel' AND 'group' (as they are usually landscape/header worthy)
                    .filter(g => !g.category || g.category === 'carousel' || g.category === 'group')
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

                // Add Group Info (Required by frontend)
                responseData.group = {
                    name: settings.group_name || 'Refresh Breeze',
                    tagline: settings.group_tagline || 'Original Idol Group',
                    about: settings.group_about || 'Refresh Breeze adalah idol group original yang membawa angin segar dalam industri musik.'
                };

                // Add Static Data (defaults)
                responseData.how_to_order = [
                    { title: "1. Login / Daftar", description: "Kamu wajib punya akun dulu ya. Klik tombol **Login** di pojok kanan atas. Kalau belum punya, daftar dulu gampang kok!" },
                    { title: "2. Pilih Oshi Kamu", description: "Buka menu **Cheki**, lalu pilih member favorit (Oshi) yang mau kamu ajak foto 2-shot." },
                    { title: "3. Checkout & Bayar", description: "Masukkan jumlah tiket, lalu klik Checkout. Bayar pakai **QRIS atau Virtual Account** (BCA/Mandiri/dll) biar praktis." },
                    { title: "4. Tiket Siap!", description: "Setelah bayar, tiket QR Code otomatis muncul di menu **Dashboard**. Tunjukkan ke staf saat event ya!" }
                ];

                responseData.faq = [
                    { question: "Kak, tiketnya bisa di-refund gak?", answer: "Maaf banget, tiket yang sudah dibeli **tidak bisa dikembalikan (Non-Refundable)** kecuali acaranya batal dari pihak kami." },
                    { question: "Batas waktu bayarnya berapa lama?", answer: "Kamu punya waktu **15 menit** untuk transfer. Kalau lewat, pesanan otomatis batal dan harus ulang lagi." },
                    { question: "Cheki itu ngapain aja sih?", answer: "Cheki itu sesi foto instan (Polaroid) berdua bareng member setelah perform. Kamu bisa request gaya yang sopan ya!" },
                    { question: "Aman gak nih transaksinya?", answer: "Aman dong! Kita pakai **Midtrans** (Payment Gateway Resmi) dan sistem stok otomatis. Jadi gak bakal rebutan kalau udah dapet token bayar." },
                    { question: "Gimana kalau ada masalah atau butuh bantuan?", answer: "Jika ada kendala teknis, pembayaran, atau pertanyaan lainnya, langsung aja hubungi **Admin** melalui WhatsApp di **085765907580**. Kami siap membantu!" }
                ];

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

const getGalleryImages = async (req, res) => {
    if (isDemoMode) {
        // Demo data with actual images
        return res.json([
            { image_url: 'img/member/group.webp', alt_text: 'Group Photo', category: 'group' },
            { image_url: 'img/member/aca.webp', alt_text: 'Aca', category: 'member' },
            { image_url: 'img/member/cally.webp', alt_text: 'Cally', category: 'member' },
            { image_url: 'img/member/cissi.webp', alt_text: 'Cissi', category: 'member' },
            { image_url: 'img/member/piya.webp', alt_text: 'Piya', category: 'member' },
            { image_url: 'img/member/sinta.webp', alt_text: 'Sinta', category: 'member' },
            { image_url: 'img/member/yanyee.webp', alt_text: 'Yanyee', category: 'member' }
        ]);
    }

    try {
        const { data, error } = await supabase
            .from('gallery')
            .select('image_url, alt_text, category')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;

        res.json(data || []);
    } catch (e) {
        console.error("Gallery API Error:", e);
        res.status(500).json({ message: "Gagal memuat galeri.", error: e.message });
    }
};

module.exports = { getProductsAndStock, getGlobalLeaderboard, getMemberLeaderboard, getGalleryImages };
