const supabase = require("../config/supabase");

const isDemoMode = !process.env.JWT_SECRET;

// ============================================================
// GET ALL NEWS
// ============================================================
const getAllNews = async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', title: 'Demo News 1', content: 'Demo content', created_at: new Date().toISOString() },
            { id: '2', title: 'Demo News 2', content: 'Demo content', created_at: new Date().toISOString() }
        ]);
    }

    try {
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data berita.", error: e.message });
    }
};

// ============================================================
// GET SINGLE NEWS
// ============================================================
const getNewsById = async (req, res) => {
    if (isDemoMode) {
        return res.json({ id: req.params.id, title: 'Demo News', content: 'Demo content' });
    }

    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Berita tidak ditemukan." });

        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data berita.", error: e.message });
    }
};

// ============================================================
// CREATE NEWS
// ============================================================
const createNews = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Berita berhasil ditambahkan! (Demo)", id: 'demo-123' });
    }

    try {
        const { title, content, image_url, category } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: "Judul dan konten wajib diisi." });
        }

        const { data, error } = await supabase
            .from('news')
            .insert({
                title,
                content,
                image_url: image_url || null,
                category: category || 'general'
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: "Berita berhasil ditambahkan!", news: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambahkan berita.", error: e.message });
    }
};

// ============================================================
// UPDATE NEWS
// ============================================================
const updateNews = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Berita berhasil diupdate! (Demo)" });
    }

    try {
        const { id } = req.params;
        const { title, content, image_url, category } = req.body;

        // Build update object dynamically
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (image_url !== undefined) updateData.image_url = image_url;
        if (category !== undefined) updateData.category = category;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "Tidak ada data yang diupdate." });
        }

        const { data, error } = await supabase
            .from('news')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Berita tidak ditemukan." });

        res.json({ message: "Berita berhasil diupdate!", news: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate berita.", error: e.message });
    }
};

// ============================================================
// DELETE NEWS
// ============================================================
const deleteNews = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Berita berhasil dihapus! (Demo)" });
    }

    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('news')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: "Berita berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus berita.", error: e.message });
    }
};

module.exports = {
    getAllNews,
    getNewsById,
    createNews,
    updateNews,
    deleteNews
};
