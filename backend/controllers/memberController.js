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
// CREATE MEMBER (SUPABASE STORAGE VERSION)
// ============================================================
const createMember = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Member berhasil ditambahkan! (Demo)", id: 'demo-123' });
    }

    try {
        const { name, role, jiko, instagram, details } = req.body;

        if (!name || !role) {
            return res.status(400).json({ message: "Nama dan role wajib diisi." });
        }

        // Handle image upload to Supabase Storage
        let image_url = req.body.image_url || '/img/member/placeholder.webp';
        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;
            const filePath = `members/${fileName}`;
            
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('public-images')
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('public-images')
                .getPublicUrl(filePath);

            image_url = publicUrlData.publicUrl;
        }

        const { data, error } = await supabase
            .from('members')
            .insert({
                name,
                role,
                image_url,
                details: { 
                    ...(details || {}), 
                    jiko: jiko || '',
                    instagram: instagram || ''
                }
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: "Member berhasil ditambahkan ke Supabase Storage!", member: data });
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
        const { name, role, details, jiko, instagram } = req.body;

        // Fetch existing member to merge details
        const { data: existing, error: fetchError } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ message: "Member tidak ditemukan." });
        }

        // Build update object dynamically
        const updateData = {};
        if (name !== undefined && name !== '') updateData.name = name;
        if (role !== undefined && role !== '') updateData.role = role;
        
        // Handle image upload
        if (req.file) {
            updateData.image_url = `img/member/${req.file.filename}`;
        } else if (req.body.image_url !== undefined) {
            updateData.image_url = req.body.image_url;
        }

        // Handle details (merge with existing)
        const existingDetails = existing.details || {};
        updateData.details = {
            ...existingDetails,
            ...(details || {}),
            ...(jiko !== undefined ? { jiko } : {}),
            ...(instagram !== undefined ? { instagram } : {})
        };

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

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

        // 1. Delete or deactivate associated products (Cheki) linked to this member
        const { error: productError } = await supabase
            .from('products')
            .update({ is_active: false })
            .eq('member_id', id);

        if (productError) {
            console.error("Warning: Failed to deactivate products:", productError.message);
            // Continue with member deletion even if product deactivation fails
        }

        // 2. Delete or deactivate gallery images linked to this member
        const { error: galleryError } = await supabase
            .from('gallery')
            .update({ is_active: false })
            .eq('member_id', id);

        if (galleryError) {
            console.error("Warning: Failed to deactivate gallery:", galleryError.message);
        }

        // 3. Delete the member
        const { error } = await supabase
            .from('members')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: "Member dan produk terkait berhasil dihapus!" });
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
