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
// CREATE GALLERY IMAGE (SUPABASE STORAGE VERSION)
// ============================================================
const createGallery = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Foto berhasil ditambahkan! (Demo)", id: 'demo-123' });
    }

    try {
        const { caption, category, member_id } = req.body;
        let image_url = req.body.image_url;

        // Handle File Upload to Supabase Storage
        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;
            const filePath = `gallery/${fileName}`;
            
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('public-images') // Bucket name: 'public-images'
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

        if (!image_url || !category) {
            return res.status(400).json({ message: "URL gambar dan kategori wajib diisi." });
        }

        const { data, error } = await supabase
            .from('gallery')
            .insert({
                image_url,
                alt_text: caption || req.body.alt_text || null,
                category,
                member_id: (member_id === '' || member_id === 'null') ? null : (member_id || null)
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: "Foto berhasil ditambahkan ke Supabase Storage!", gallery: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambahkan foto.", error: e.message });
    }
};

// ============================================================
// UPDATE GALLERY IMAGE (SUPABASE STORAGE VERSION)
// ============================================================
const updateGallery = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Foto berhasil diupdate! (Demo)" });
    }

    try {
        const { id } = req.params;
        const { caption, alt_text, category, member_id } = req.body;

        // Build update object dynamically
        const updateData = {};
        
        // Handle File Upload to Supabase Storage (if new file provided)
        if (req.file) {
            // Get old image to delete later
            const { data: oldData } = await supabase
                .from('gallery')
                .select('image_url')
                .eq('id', id)
                .single();

            const fileName = `${Date.now()}-${req.file.originalname}`;
            const filePath = `gallery/${fileName}`;
            
            // Upload new file to Supabase Storage
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

            updateData.image_url = publicUrlData.publicUrl;

            // Delete old file from Supabase Storage if it exists
            if (oldData?.image_url && oldData.image_url.includes('supabase')) {
                try {
                    const urlParts = oldData.image_url.split('/');
                    const oldFileName = urlParts[urlParts.length - 1];
                    const oldFilePath = `gallery/${oldFileName}`;
                    
                    await supabase.storage
                        .from('public-images')
                        .remove([oldFilePath]);
                } catch (storageError) {
                    console.error("Failed to delete old file from storage:", storageError);
                }
            }
        }

        // Update other fields if provided
        if (caption !== undefined) updateData.alt_text = caption;
        if (alt_text !== undefined) updateData.alt_text = alt_text;
        if (category !== undefined) updateData.category = category;
        if (member_id !== undefined) {
            updateData.member_id = (member_id === '' || member_id === 'null') ? null : member_id;
        }

        // Perform update
        const { data, error } = await supabase
            .from('gallery')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Foto tidak ditemukan." });

        res.json({ message: "Foto berhasil diperbarui!", gallery: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal memperbarui foto.", error: e.message });
    }
};

// ============================================================
// DELETE GALLERY IMAGE (SUPABASE STORAGE VERSION)
// ============================================================
const deleteGallery = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Foto berhasil dihapus! (Demo)" });
    }

    try {
        const { id } = req.params;

        // 1. Get the image URL first
        const { data: item, error: fetchError } = await supabase
            .from('gallery')
            .select('image_url')
            .eq('id', id)
            .single();

        if (fetchError || !item) return res.status(404).json({ message: "Foto tidak ditemukan." });

        // 2. Delete from Database
        const { error } = await supabase
            .from('gallery')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 3. Delete from Supabase Storage (if it's a Supabase URL)
        if (item.image_url && item.image_url.includes('supabase')) {
            try {
                // Extract filename from URL
                const urlParts = item.image_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const filePath = `gallery/${fileName}`;
                
                await supabase.storage
                    .from('public-images')
                    .remove([filePath]);
            } catch (storageError) {
                console.error("Failed to delete from storage:", storageError);
                // Don't fail the whole operation if storage delete fails
            }
        }

        res.json({ message: "Foto berhasil dihapus dari database dan storage" });
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
