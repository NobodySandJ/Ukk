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
const chalk = require("chalk");

// Load environment variables - try .env.local first, then .env
const dotenv = require("dotenv");
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');
const fs = require('fs');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

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

// Increase limit for Gallery Uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Specific Route for Favicon (since we moved it to img/logo)
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'img', 'logo', 'favicon.ico'));
});


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
    console.clear();
    console.log(chalk.cyan.bold('\n╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + chalk.green.bold('        🌊 REFRESH BREEZE SERVER STARTED 🌊          ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════╝'));
    console.log('');
    console.log(chalk.yellow('  🚀 Server Status:    ') + chalk.green.bold('RUNNING'));
    console.log(chalk.yellow('  🌐 Local URL:        ') + chalk.blue.underline(`http://localhost:${PORT}`));
    console.log(chalk.yellow('  📁 Static Files:     ') + chalk.gray(path.join(__dirname, '..')));
    console.log(chalk.yellow('  📝 Logs Directory:   ') + chalk.gray('backend/combined.log'));
    console.log('');
    console.log(chalk.magenta('  📡 API Endpoints:'));
    console.log(chalk.gray('     → /api/register, /api/login'));
    console.log(chalk.gray('     → /api/products-and-stock'));
    console.log(chalk.gray('     → /api/admin/*'));
    console.log(chalk.gray('     → /get-snap-token'));
    console.log('');
    console.log(chalk.yellow('  🔒 CORS Mode:        ') + 
        (process.env.NODE_ENV === 'production' 
            ? chalk.red.bold('Production (Restricted)') 
            : chalk.green.bold('Development (Allow All)')));
    console.log(chalk.yellow('  🛡️  Security:         ') + chalk.green('Helmet, Rate Limit, JWT'));
    console.log('');
    console.log(chalk.cyan('════════════════════════════════════════════════════════════'));
    console.log(chalk.green.bold('  ✓ Ready to handle requests!'));
    console.log(chalk.gray('  💡 Press Ctrl+C to stop the server'));
    console.log(chalk.cyan('════════════════════════════════════════════════════════════\n'));
});
