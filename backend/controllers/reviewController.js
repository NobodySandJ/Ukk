const supabase = require("../config/supabase");

const isDemoMode = !process.env.JWT_SECRET;

// ============================================================
// GET ALL REVIEWS (Public - untuk homepage)
// ============================================================
const getAllReviews = async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: 1, nama_pengguna: 'demo_user', oshi: 'Aca', rating: 5, komentar: 'Cheki-nya bagus banget!', created_at: new Date().toISOString() }
        ]);
    }
    try {
        const { data, error } = await supabase
            .from("ulasan")
            .select("id, rating, komentar, created_at, pengguna:id_pengguna(nama_pengguna, oshi)")
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) throw error;

        // Flatten the joined data
        const reviews = (data || []).map(r => ({
            id: r.id,
            rating: r.rating,
            komentar: r.komentar,
            created_at: r.created_at,
            nama_pengguna: r.pengguna?.nama_pengguna || 'Anonim',
            oshi: r.pengguna?.oshi || ''
        }));

        res.json(reviews);
    } catch (e) {
        res.status(500).json({ message: "Gagal memuat ulasan", error: e.message });
    }
};

// ============================================================
// CREATE REVIEW (User - harus punya pesanan berlaku)
// ============================================================
const createReview = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Review submitted (Demo)", review: { id: Date.now(), ...req.body } });
    }
    try {
        const userId = req.user.userId;
        const { rating, komentar } = req.body;

        // Validasi input
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating harus antara 1-5" });
        }
        if (!komentar || komentar.trim().length < 5) {
            return res.status(400).json({ message: "Komentar minimal 5 karakter" });
        }

        // Cek apakah user punya pesanan yang berlaku (verified purchaser)
        const { data: orders } = await supabase
            .from("pesanan")
            .select("id_pesanan")
            .eq("id_pengguna", userId)
            .eq("status_tiket", "berlaku")
            .limit(1);

        if (!orders || orders.length === 0) {
            return res.status(403).json({
                message: "Hanya pembeli yang sudah menggunakan tiket yang bisa memberikan ulasan."
            });
        }

        // Cek apakah user sudah pernah review
        const { data: existingReview } = await supabase
            .from("ulasan")
            .select("id")
            .eq("id_pengguna", userId)
            .limit(1);

        if (existingReview && existingReview.length > 0) {
            return res.status(409).json({
                message: "Anda sudah pernah memberikan ulasan. Silakan edit ulasan Anda."
            });
        }

        // Insert review
        const { data: newReview, error } = await supabase
            .from("ulasan")
            .insert([{
                id_pengguna: userId,
                rating: parseInt(rating),
                komentar: komentar.trim()
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: "Ulasan berhasil dikirim!", review: newReview });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengirim ulasan", error: e.message });
    }
};

// ============================================================
// UPDATE REVIEW (User - edit ulasan sendiri)
// ============================================================
const updateReview = async (req, res) => {
    if (isDemoMode) return res.json({ message: "Updated (Demo)" });

    try {
        const userId = req.user.userId;
        const { rating, komentar } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating harus antara 1-5" });
        }
        if (!komentar || komentar.trim().length < 5) {
            return res.status(400).json({ message: "Komentar minimal 5 karakter" });
        }

        const { data, error } = await supabase
            .from("ulasan")
            .update({ rating: parseInt(rating), komentar: komentar.trim() })
            .eq("id_pengguna", userId)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Ulasan tidak ditemukan" });

        res.json({ message: "Ulasan diperbarui!", review: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal memperbarui ulasan", error: e.message });
    }
};

// ============================================================
// GET MY REVIEW (User - cek apakah sudah review)
// ============================================================
const getMyReview = async (req, res) => {
    if (isDemoMode) return res.json(null);

    try {
        const { data, error } = await supabase
            .from("ulasan")
            .select("*")
            .eq("id_pengguna", req.user.userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        res.json(data || null);
    } catch (e) {
        res.status(500).json({ message: "Gagal memuat ulasan", error: e.message });
    }
};

// ============================================================
// CHECK REVIEW ELIGIBILITY (User - boleh review atau belum)
// ============================================================
const checkEligibility = async (req, res) => {
    if (isDemoMode) return res.json({ eligible: true, hasReview: false });

    try {
        const userId = req.user.userId;

        // Cek apakah punya pesanan berlaku
        const { data: orders } = await supabase
            .from("pesanan")
            .select("id_pesanan")
            .eq("id_pengguna", userId)
            .eq("status_tiket", "berlaku")
            .limit(1);

        const hasPurchase = orders && orders.length > 0;

        // Cek apakah sudah review
        const { data: existingReview } = await supabase
            .from("ulasan")
            .select("id")
            .eq("id_pengguna", userId)
            .limit(1);

        const hasReview = existingReview && existingReview.length > 0;

        res.json({
            eligible: hasPurchase,
            hasReview
        });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengecek eligibility", error: e.message });
    }
};

module.exports = { getAllReviews, createReview, updateReview, getMyReview, checkEligibility };
