const jwt = require("jsonwebtoken");

// Cek apakah mode demo aktif (berdasarkan env)
const isDemoMode = !process.env.JWT_SECRET;
if (isDemoMode) {
    console.warn("⚠️ Demo Mode Detected in Auth Middleware");
}

const authenticateToken = (req, res, next) => {
    // Handling Demo Mode
    if (!process.env.JWT_SECRET) {
        req.user = { userId: 1, username: 'demo_user', email: 'demo@example.com', role: 'user' };
        return next();
    }

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Token otentikasi tidak ditemukan." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token tidak valid." });
        req.user = user;
        next();
    });
};

const authorizeAdmin = (req, res, next) => {
    // In demo mode, allow if role is admin or just bypass? 
    // The original code passed 'next()' in demo mode unconditionally in authorizeAdmin.
    if (!process.env.JWT_SECRET) return next();

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak. Hanya untuk admin." });
    }
    next();
};

module.exports = { authenticateToken, authorizeAdmin };
