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

module.exports = { getNextEvent, getEvents, createEvent };
