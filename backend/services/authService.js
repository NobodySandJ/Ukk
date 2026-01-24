const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");

const AuthService = {
    async registerUser({ username, email, password, whatsapp_number, instagram_username, oshi }) {
        // Validation handled before this service call (Separation of concerns)

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const { data, error } = await supabase.from("pengguna").insert([{
            nama_pengguna: username,
            email,
            kata_sandi: password_hash,
            nomor_whatsapp: whatsapp_number,
            instagram: instagram_username || null,
            oshi: oshi || 'All Member',
            peran: "user",
        }]).select().single();

        if (error) throw error;
        return data;
    },

    async findUserByEmailOrUsername(identifier) {
        const { data: user, error } = await supabase
            .from("pengguna")
            .select("*")
            .or(`email.eq.${identifier},nama_pengguna.eq.${identifier}`)
            .single();

        if (error) return null; // Or throw specific error
        return user;
    },

    async validatePassword(inputPassword, storedHash) {
        return await bcrypt.compare(inputPassword, storedHash);
    }
};

module.exports = AuthService;
