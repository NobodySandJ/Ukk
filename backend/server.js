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

// CORS Configuration - Environment-based for better security
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*')
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

app.use(express.json());

// ============================================================
// ROUTING (API)
// ============================================================

// Mount Routes
app.use('/api', authRoutes);      // /api/register, /api/login
app.use('/api', productRoutes);   // /api/products-and-stock, /api/leaderboard
app.use('/api/admin', adminRoutes); // /api/admin/* (UPDATED - all admin routes now centralized)
app.use('/api', eventRoutes);     // /api/public/next-event, /api/admin/events
app.use('/api/user', userRoutes); // /api/user/profile

// Order Routes (Mounted at root because of non-standard paths like /get-snap-token)
app.use('/', orderRoutes);        // /get-snap-token, /update-order-status, /api/my-orders, /api/midtrans-client-key

// ============================================================
// STATIC FILES & ERROR HANDLING
// ============================================================

// Menyajikan Berkas Statis dari direktori induk
app.use(express.static(path.join(__dirname, '..')));


// ============================================================
// ENHANCED ERROR HANDLER - Now with proper logging!
// ============================================================
app.use((err, req, res, next) => {
    // Log full error details including stack trace
    logger.error(`ERROR: ${err.message}`);
    logger.error(`Stack: ${err.stack}`);
    logger.error(`URL: ${req.method} ${req.url}`);
    logger.error(`Body: ${JSON.stringify(req.body)}`);

    // Send generic error to client (don't expose stack trace)
    res.status(err.status || 500).json({
        message: err.message || "Terjadi kesalahan pada server.",
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📝 Log tersimpan di backend/combined.log`);
    console.log(`🔒 CORS: ${process.env.NODE_ENV === 'production' ? 'Production Mode' : 'Development Mode (Allow All)'}`);
});
