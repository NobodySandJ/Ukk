// ================================================================
// BERKAS: server.js - Server Utama (Refactored to MVC)
// ================================================================

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
require("dotenv").config({ path: require('path').join(__dirname, '..', '.env') });

// Import Dependencies & Config
const { logger } = require("./middleware/loggerMiddleware");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const eventRoutes = require("./routes/eventRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// ============================================================
// MIDDLEWARE: KEAMANAN & KINERJA
// ============================================================

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Terlalu banyak permintaan, silakan coba lagi nanti." }
});
app.use('/api/', limiter);

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================================
// ROUTING (API)
// ============================================================

// Mount Routes
app.use('/api', authRoutes);      // /api/register, /api/login
app.use('/api', productRoutes);   // /api/products-and-stock, /api/leaderboard
app.use('/api', adminRoutes);     // /api/admin/*
app.use('/api', eventRoutes);     // /api/public/next-event, /api/admin/events
app.use('/api/user', userRoutes); // /api/user/profile

// Order Routes (Mounted at root because of non-standard paths like /get-snap-token)
app.use('/', orderRoutes);        // /get-snap-token, /update-order-status, /api/my-orders, /api/midtrans-client-key

// ============================================================
// STATIC FILES & ERROR HANDLING
// ============================================================

// Menyajikan Berkas Statis dari direktori induk
app.use(express.static(path.join(__dirname, '..')));

// Fallback untuk SPA (Opsional, jika menggunakan router frontend seperti React)
// app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

// Global Error Handler (Optional but good practice)
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📝 Log tersimpan di backend/combined.log`);
});
