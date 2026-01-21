const supabase = require("../config/supabase");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const isDemoMode = !process.env.JWT_SECRET;

const getUserProfile = async (req, res) => {
    if (isDemoMode) {
        return res.json({ id: 1, nama_pengguna: 'demo_user', email: 'demo@example.com', oshi: 'Aca', peran: 'user' });
    }
    try {
        const { data: user, error } = await supabase.from("pengguna")
            .select("id, nama_pengguna, email, nomor_whatsapp, instagram, peran, oshi")
            .eq("id", req.user.userId).single();

        if (error || !user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: "Server error", error: e.message });
    }
};

const updateUserProfile = async (req, res) => {
    if (isDemoMode) return res.json({ message: "Updated (Demo)", token: 'demo', user: { ...req.body, id: 1 } });

    try {
        const { nama_pengguna, email, nomor_whatsapp, instagram, password } = req.body;
        const updateData = { nama_pengguna, email, nomor_whatsapp, instagram };

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updateData.kata_sandi = await bcrypt.hash(password, salt);
        }

        const { data: updatedUser, error } = await supabase.from("pengguna")
            .update(updateData).eq("id", req.user.userId)
            .select("id, nama_pengguna, email, nomor_whatsapp, instagram, peran, oshi").single();

        if (error) throw error;

        const token = jwt.sign({
            userId: updatedUser.id, username: updatedUser.nama_pengguna,
            email: updatedUser.email, role: updatedUser.peran, oshi: updatedUser.oshi
        }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.json({ message: "Profil diperbarui!", token, user: updatedUser });
    } catch (e) {
        res.status(500).json({ message: "Update failed", error: e.message });
    }
};

module.exports = { getUserProfile, updateUserProfile };
