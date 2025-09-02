// api/admin-login.js
const jwt = require('jsonwebtoken');

module.exports = (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { username, password } = req.body;

    // Ambil kredensial dari Vercel Environment Variables
    const ADMIN_USER = process.env.ADMIN_USERNAME;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD;
    const JWT_SECRET = process.env.JWT_SECRET;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        // Buat token yang berlaku selama 3 jam
        const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: '3h' });
        res.status(200).json({ message: 'Login successful', token });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
};