const supabase = require("../config/supabase");

const isDemoMode = !process.env.JWT_SECRET;

// ============================================================
// GET ALL MEMBERS
// ============================================================
const getAllMembers = async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', name: 'Aca', role: 'Member', image_url: '/img/member/NEaca.webp' },
            { id: '2', name: 'Sinta', role: 'Member', image_url: '/img/member/NEsinta.webp' }
        ]);
    }

    try {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data member.", error: e.message });
    }
};

// ============================================================
// GET SINGLE MEMBER
// ============================================================
const getMemberById = async (req, res) => {
    if (isDemoMode) {
        return res.json({ id: req.params.id, name: 'Demo Member', role: 'Member' });
    }

    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Member tidak ditemukan." });

        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data member.", error: e.message });
    }
};

// ============================================================
// CREATE MEMBER
// ============================================================
const createMember = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Member berhasil ditambahkan! (Demo)", id: 'demo-123' });
    }

    try {
        const { name, role, image_url, details } = req.body;

        if (!name || !role) {
            return res.status(400).json({ message: "Nama dan role wajib diisi." });
        }

        const { data, error } = await supabase
            .from('members')
            .insert({
                name,
                role,
                image_url: image_url || '/img/member/placeholder.webp',
                details: details || {}
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: "Member berhasil ditambahkan!", member: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambahkan member.", error: e.message });
    }
};

// ============================================================
// UPDATE MEMBER
// ============================================================
const updateMember = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Member berhasil diupdate! (Demo)" });
    }

    try {
        const { id } = req.params;
        const { name, role, image_url, details } = req.body;

        // Build update object dynamically
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (image_url !== undefined) updateData.image_url = image_url;
        if (details !== undefined) updateData.details = details;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "Tidak ada data yang diupdate." });
        }

        const { data, error } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Member tidak ditemukan." });

        res.json({ message: "Member berhasil diupdate!", member: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate member.", error: e.message });
    }
};

// ============================================================
// DELETE MEMBER
// ============================================================
const deleteMember = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Member berhasil dihapus! (Demo)" });
    }

    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('members')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: "Member berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus member.", error: e.message });
    }
};

module.exports = {
    getAllMembers,
    getMemberById,
    createMember,
    updateMember,
    deleteMember
};
