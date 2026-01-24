// Simple Validation Helper
const validate = (schema) => (req, res, next) => {
    // Schema is a function that takes body and returns non-null string if error
    const error = schema(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }
    next();
};

const schemas = {
    register: (body) => {
        if (!body.username || !body.email || !body.password || !body.whatsapp_number) return "Data wajib diisi (Username, Email, Password, WA).";
        if (body.password.length < 6) return "Password minimal 6 karakter.";
        return null;
    },
    login: (body) => {
        if (!body.email || !body.password) return "Email dan Password wajib diisi.";
        return null;
    }
};

module.exports = { validate, schemas };
