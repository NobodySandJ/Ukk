const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Base upload directory (project root)
const baseDir = path.join(__dirname, '../../img');

// Ensure directories exist
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Ensure common directories
ensureDir(path.join(baseDir, 'gallery'));
ensureDir(path.join(baseDir, 'member'));
ensureDir(path.join(baseDir, 'dokumentasi'));

// Configure Storage - determine destination based on route
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine folder based on the route or a hint
        let folder = 'gallery'; // default
        
        if (req.baseUrl.includes('/admin') || req.originalUrl.includes('/admin')) {
            if (req.originalUrl.includes('/members')) {
                folder = 'member';
            } else if (req.originalUrl.includes('/gallery')) {
                folder = 'gallery';
            } else if (req.originalUrl.includes('/events') || req.originalUrl.includes('/dokumentasi')) {
                folder = 'dokumentasi';
            }
        }
        
        const uploadDir = path.join(baseDir, folder);
        ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

module.exports = upload;
