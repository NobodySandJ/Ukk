const supabase = require("../config/supabase");

const isDemoMode = !process.env.JWT_SECRET;

const getNextEvent = async (req, res) => {
    if (isDemoMode) {
        return res.json({ id: '1', nama: 'Demo Event', tanggal: '2026-02-01', lokasi: 'Demo Location', lineup: 'Member1, Member2' });
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_active', true)
            .gte('tanggal', today)
            .order('tanggal', { ascending: true })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        res.json(data || null);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil next event.", error: e.message });
    }
};

const getEvents = async (req, res) => {
    if (isDemoMode) {
        return res.json([
            { id: '1', nama: 'Demo Event', tanggal: '2026-02-01', lokasi: 'JKT48 Theater', lineup: 'All Member', is_active: true }
        ]);
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .gte('tanggal', today) // Show future events only? Logic in server.js seemed to filter active
            // Re-checking server.js: 
            // .eq('is_active', true)
            // .gte('tanggal', today)
            // .order('tanggal', { ascending: true });
            // Wait, server.js logic for /api/admin/events at Line 1098 seemed to fetch *active* events but usually admin wants all?
            // Let's check server.js line 1130 again.
            // It selects .eq('is_active', true).gte('tanggal', today).
            // I will match server.js logic.
            .eq('is_active', true)
            .gte('tanggal', today)
            .order('tanggal', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ message: "Gagal mengambil data events.", error: e.message });
    }
};

const createEvent = async (req, res) => {
    if (isDemoMode) return res.status(201).json({ message: "Event berhasil ditambahkan! (Demo)", event: { id: 'demo-' + Date.now(), ...req.body } });

    try {
        const { nama, tanggal, lokasi, lineup, deskripsi } = req.body;
        if (!nama || !tanggal) return res.status(400).json({ message: "Nama dan Tanggal wajib diisi." });

        const { data, error } = await supabase
            .from('events')
            .insert([{ nama, tanggal, lokasi, lineup, deskripsi, is_active: true }])
            .select().single();

        if (error) throw error;
        res.status(201).json({ message: "Event berhasil ditambahkan!", event: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal menambah event.", error: e.message });
    }
};

// ... Update and Delete are not in the provided snippet of server.js but usually implied. 
// I only saw GET and POST in server.js snippet (Lines 1142, 1165).
// Wait, I saw GET /api/admin/events and POST /api/admin/events.
// I will just implement those seen. The user said "as long as it doesn't error".

const updateEvent = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Event berhasil diupdate! (Demo)", event: { ...req.body, id: req.params.id } });
    }
    try {
        const { id } = req.params;
        const { nama, tanggal, lokasi, lineup, deskripsi, is_active } = req.body;

        const updateData = {};
        if (nama !== undefined) updateData.nama = nama;
        if (tanggal !== undefined) updateData.tanggal = tanggal;
        if (lokasi !== undefined) updateData.lokasi = lokasi;
        if (lineup !== undefined) updateData.lineup = lineup;
        if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data, error } = await supabase
            .from('events')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Event tidak ditemukan." });

        res.json({ message: "Event berhasil diupdate!", event: data });
    } catch (e) {
        res.status(500).json({ message: "Gagal mengupdate event.", error: e.message });
    }
};

const deleteEvent = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Event berhasil dihapus! (Demo)" });
    }
    try {
        const { id } = req.params;
        const { error } = await supabase.from('events').delete().eq('id', id);

        if (error) throw error;
        res.json({ message: "Event berhasil dihapus!" });
    } catch (e) {
        res.status(500).json({ message: "Gagal menghapus event.", error: e.message });
    }
};

module.exports = { getNextEvent, getEvents, createEvent, updateEvent, deleteEvent };
