const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

// Helper: Check Demo Mode
const isDemoMode = !process.env.JWT_SECRET;

// Shared OTP Storage
const otpStorage = require('../utils/otpStore');

const register = async (req, res) => {
    if (isDemoMode) {
        return res.status(201).json({
            message: "Registrasi berhasil! (Mode Demo)",
            user: { id: 1, nama_pengguna: req.body.username, email: req.body.email }
        });
    }

    try {
        const { username, email, password, whatsapp_number, instagram_username, oshi } = req.body;

        // Memvalidasi masukan
        if (!username || !email || !password || !whatsapp_number) {
            return res.status(400).json({ message: "Data wajib diisi (Username, Email, Password, WA)." });
        }
        if (password.length < 6) return res.status(400).json({ message: "Password minimal 6 karakter." });

        // Mengenkripsi kata sandi
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Memasukkan data ke basis data
        const { data, error } = await supabase.from("pengguna").insert([{
            nama_pengguna: username,
            email,
            kata_sandi: password_hash,
            nomor_whatsapp: whatsapp_number,
            instagram: instagram_username || null,
            oshi: oshi || 'All Member',
            peran: "user",
        }]).select().single();

        if (error) {
            if (error.code === "23505") return res.status(409).json({ message: "Username atau email sudah terdaftar." });
            throw error;
        }
        res.status(201).json({ message: "Registrasi berhasil!", user: data });
    } catch (e) {
        res.status(500).json({ message: "Kesalahan pada server.", error: e.message });
    }
};

const login = async (req, res) => {
    if (isDemoMode) {
        const demoToken = jwt.sign(
            { userId: 1, username: 'demo_user', email: req.body.email, role: 'user', oshi: 'Aca' },
            'demo_secret', { expiresIn: '1d' }
        );
        return res.json({
            message: "Login berhasil! (Mode Demo)",
            token: demoToken,
            user: { id: 1, nama_pengguna: 'demo_user', email: req.body.email, peran: 'user', oshi: 'Aca' }
        });
    }

    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Masukan tidak boleh kosong." });

        // Mencari pengguna berdasarkan email atau nama pengguna
        const { data: user, error } = await supabase
            .from("pengguna").select("*")
            .or(`email.eq.${email},nama_pengguna.eq.${email}`).single();

        if (error || !user) return res.status(404).json({ message: "Email atau username tidak ditemukan." });

        // Verifikasi password
        const isMatch = await bcrypt.compare(password, user.kata_sandi);
        if (!isMatch) return res.status(401).json({ message: "Password salah." });

        // Generate JWT token
        const token = jwt.sign({
            userId: user.id, username: user.nama_pengguna, email: user.email,
            role: user.peran, oshi: user.oshi
        }, process.env.JWT_SECRET, { expiresIn: "1d" });

        delete user.kata_sandi;
        res.json({ message: "Login berhasil!", token, user });
    } catch (e) {
        res.status(500).json({ message: "Kesalahan pada server.", error: e.message });
    }
};

// ============================================================
// PASSWORD RESET - Generate OTP
// ============================================================
const verifyAndGenerateOTP = async (req, res) => {
    if (isDemoMode) {
        return res.json({
            message: "OTP dikirim! (Mode Demo)",
            resetCode: "123456"
        });
    }

    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email wajib diisi." });

        // Check if user exists
        const { data: user, error } = await supabase
            .from("pengguna")
            .select("id, email, nama_pengguna")
            .eq("email", email)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: "Email tidak terdaftar." });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with expiration (10 minutes)
        // Store OTP with expiration (10 minutes)
        otpStorage.set(email.toLowerCase(), {
            code: otp,
            expiresAt: Date.now() + 10 * 60 * 1000,
            userId: user.id
        });

        // In production, send OTP via email/SMS
        // For now, return it in response for testing
        console.log(`[PASSWORD RESET] OTP for ${email}: ${otp}`);

        res.json({
            message: "Kode reset password telah dikirim ke email Anda.",
            // In production, remove this:
            resetCode: otp  // Only for testing!
        });
    } catch (e) {
        res.status(500).json({ message: "Kesalahan pada server.", error: e.message });
    }
};

// ============================================================
// PASSWORD RESET - Reset with OTP Code
// ============================================================
const resetPasswordWithCode = async (req, res) => {
    if (isDemoMode) {
        return res.json({ message: "Password berhasil direset! (Mode Demo)" });
    }

    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: "Email, kode, dan password baru wajib diisi." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password minimal 6 karakter." });
        }

        // Verify OTP
        const otpData = otpStorage.get(email.toLowerCase());
        if (!otpData) {
            return res.status(400).json({ message: "Kode tidak valid atau sudah expired." });
        }

        if (otpData.expiresAt < Date.now()) {
            otpStorage.delete(email.toLowerCase());
            return res.status(400).json({ message: "Kode sudah kadaluarsa. Silakan request kode baru." });
        }

        if (otpData.code !== code) {
            return res.status(400).json({ message: "Kode OTP salah." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        // Update password in database
        const { error } = await supabase
            .from("pengguna")
            .update({ kata_sandi: password_hash })
            .eq("id", otpData.userId);

        if (error) throw error;

        // Remove used OTP
        otpStorage.delete(email.toLowerCase());

        res.json({ message: "Password berhasil direset! Silakan login dengan password baru." });
    } catch (e) {
        res.status(500).json({ message: "Kesalahan pada server.", error: e.message });
    }
};

module.exports = { register, login, verifyAndGenerateOTP, resetPasswordWithCode };
