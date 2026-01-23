const supabase = require("../config/supabase");

const isDemoMode = !process.env.JWT_SECRET;

// ============================================================
// GET ALL GALLERY IMAGES
// ============================================================
const getAllGallery = async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', image_url: '/img/member/group.webp', category: 'group', caption: 'Demo Image' },
            { id: '2', image_url: '/img/member/NEaca.webp', category: 'member', caption: 'Demo Member' }
        ]);
    }

    try {
        const { category } = req.query;

        let query = supabase
            .from('gallery')
            .select('*, members(name, role)')
            .order('created_at', { ascending: false });

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data galeri.", error: e.message });
    }
};

// ============================================================
// GET SINGLE GALLERY IMAGE
// ============================================================
const getGalleryById = async (req, res) => {
    if (isDemoMode) {
        return res.json({ id: req.params.id, image_url: '/img/member/group.webp', caption: 'Demo' });
    }

    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('gallery')
            .select('*, members(name, role)')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Foto tidak ditemukan." });

        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data galeri.", error: e.message });
    }
};

// ============================================================
// CREATE GALLERY IMAGE
// ============================================================
const createGallery = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Foto berhasil ditambahkan! (Demo)", id: 'demo-123' });
    }

    try {
        const { image_url, caption, category, member_id } = req.body;

        if (!image_url || !category) {
            return res.status(400).json({ message: "URL gambar dan kategori wajib diisi." });
        }

        const { data, error } = await supabase
            .from('gallery')
            .insert({
                image_url,
                caption: caption || null,
                category,
                member_id: member_id || null
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: "Foto berhasil ditambahkan!", gallery: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambahkan foto.", error: e.message });
    }
};

// ============================================================
// UPDATE GALLERY IMAGE
// ============================================================
const updateGallery = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Foto berhasil diupdate! (Demo)" });
    }

    try {
        const { id } = req.params;
        const { image_url, caption, category, member_id } = req.body;

        // Build update object dynamically
        const updateData = {};
        if (image_url !== undefined) updateData.image_url = image_url;
        if (caption !== undefined) updateData.caption = caption;
        if (category !== undefined) updateData.category = category;
        if (member_id !== undefined) updateData.member_id = member_id;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "Tidak ada data yang diupdate." });
        }

        const { data, error } = await supabase
            .from('gallery')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Foto tidak ditemukan." });

        res.json({ message: "Foto berhasil diupdate!", gallery: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate foto.", error: e.message });
    }
};

// ============================================================
// DELETE GALLERY IMAGE
// ============================================================
const deleteGallery = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Foto berhasil dihapus! (Demo)" });
    }

    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('gallery')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: "Foto berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus foto.", error: e.message });
    }
};

module.exports = {
    getAllGallery,
    getGalleryById,
    createGallery,
    updateGallery,
    deleteGallery
};
